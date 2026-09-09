import base64
from contextlib import asynccontextmanager
import io
import itertools
import json
import os
from pathlib import Path
import threading
import time
import uuid
from typing import Any

from boundary_checker import BoundaryChecker
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from db import (
    get_user_sessions_db,
    save_single_session_db,
    delete_session_db,
    clear_user_sessions_db
)

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

try:
    from gtts import gTTS
except ImportError:
    gTTS = None

try:
    from faster_whisper import WhisperModel

    stt_model = WhisperModel(
        "tiny", device="cpu", compute_type="int8", cpu_threads=2
    )
except Exception as e:
    stt_model = None

import requests
from pyproj import Geod
from shapely.geometry import shape

load_dotenv()

geo_checker: BoundaryChecker = None  # type: ignore

raw_keys = os.getenv("GEMINI_API_KEYS", os.getenv("GEMINI_API_KEY", ""))
API_KEYS = [k.strip() for k in raw_keys.split(",") if k.strip()]
key_cycle = itertools.cycle(API_KEYS) if API_KEYS else None
key_lock = threading.Lock()

last_request_time = 0.0
RATE_LIMIT_DELAY = 1.0

INCOIS_URL = "https://incois.gov.in/geoserver/PFZ_Automation/ows"
PFZ_CACHE_TTL_SECONDS = 3600
pfz_cache = {"data": None, "timestamp": 0}
geod = Geod(ellps="WGS84")


def _first_value(values: Any) -> Any:
    if not isinstance(values, list):
        return None
    return next((value for value in values if value is not None), None)


def get_weather_data(latitude: float, longitude: float) -> dict[str, str]:
    weather = {"temp": "N/A", "wind": "N/A", "desc": "", "waves": "N/A"}
    try:
        weather_response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": latitude,
                "longitude": longitude,
                "hourly": "wind_speed_10m",
                "forecast_days": 1,
            },
            timeout=10,
        )
        if weather_response.status_code == 200:
            hourly = weather_response.json().get("hourly", {})
            wind_speed = _first_value(hourly.get("wind_speed_10m"))
            if wind_speed is not None:
                weather["wind"] = f"{wind_speed:.1f} km/h"
    except Exception:
        pass

    try:
        marine_response = requests.get(
            "https://marine-api.open-meteo.com/v1/marine",
            params={
                "latitude": latitude,
                "longitude": longitude,
                "hourly": "sea_surface_temperature,wave_height",
                "forecast_days": 1,
            },
            timeout=10,
        )
        if marine_response.status_code == 200:
            hourly = marine_response.json().get("hourly", {})
            sea_temperature = _first_value(
                hourly.get("sea_surface_temperature"))
            wave_height = _first_value(hourly.get("wave_height"))
            if sea_temperature is not None:
                weather["temp"] = f"{sea_temperature:.1f}°C"
            if wave_height is not None:
                weather["waves"] = f"{wave_height:.1f} m"
    except Exception:
        pass

    return weather


def get_next_client() -> Any:
    if key_cycle is None or genai is None:
        raise RuntimeError("Chatbot is not configured.")
    with key_lock:
        selected_key = next(key_cycle)
    return genai.Client(api_key=selected_key)


def execute_with_fallback(system_instruction: str, gemini_contents: list):
    global last_request_time
    if not API_KEYS or genai is None or types is None:
        raise RuntimeError("Chatbot is not configured.")

    with key_lock:
        now = time.time()
        elapsed = now - last_request_time
        if elapsed < RATE_LIMIT_DELAY:
            time.sleep(RATE_LIMIT_DELAY - elapsed)
        last_request_time = time.time()

    last_err = None
    for _ in range(len(API_KEYS)):
        client = get_next_client()
        for model_name in ["gemini-3.7-flash", "gemini-3.8-flash"]:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=gemini_contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        max_output_tokens=800,
                        temperature=0.3,
                    ),
                )

                raw_text = response.text.strip()
                if raw_text.startswith("```"):
                    raw_text = raw_text.strip("`").replace(
                        "json\n", "", 1).strip()

                return json.loads(raw_text)
            except Exception as err:
                last_err = err

    raise RuntimeError(f"All API keys exhausted: {last_err}")


def get_pfz_data():
    now = time.time()
    if (
        pfz_cache["data"] is not None
        and now - pfz_cache["timestamp"] < PFZ_CACHE_TTL_SECONDS
    ):
        return pfz_cache["data"]
    try:
        response = requests.get(
            INCOIS_URL,
            params={
                "service": "WFS",
                "version": "1.1.0",
                "request": "GetFeature",
                "typeName": "PFZ_Automation:pfzlines",
                "outputFormat": "application/json",
                "srsName": "EPSG:4326",
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as err:
        raise HTTPException(status_code=502, detail=f"INCOIS error: {err}")
    pfz_cache.update({"data": data, "timestamp": now})
    return data


def find_nearest_pfz(latitude: float, longitude: float, data: dict):
    nearest, minimum_distance = None, float("inf")
    for feature in data.get("features", []):
        geometry = feature.get("geometry")
        if not geometry:
            continue
        try:
            geom = shape(geometry)
            if geom.geom_type in ("Point", "LineString", "LinearRing", "Polygon"):
                coords = (
                    list(geom.coords)
                    if geom.geom_type != "Polygon"
                    else list(geom.exterior.coords)
                )
            elif geom.geom_type in ("MultiPoint", "MultiLineString"):
                coords = [point for part in geom.geoms for point in part.coords]
            elif geom.geom_type == "MultiPolygon":
                coords = [
                    point for part in geom.geoms for point in part.exterior.coords]
            else:
                coords = []
            for lon2, lat2 in coords:
                _, _, distance_m = geod.inv(longitude, latitude, lon2, lat2)
                if distance_m < minimum_distance:
                    minimum_distance = distance_m
                    nearest = {
                        "pfz_id": feature.get("id"),
                        "distance_km": round(distance_m / 1000, 3),
                        "nearest_point": {
                            "latitude": round(lat2, 6),
                            "longitude": round(lon2, 6),
                        },
                        "properties": feature.get("properties", {}),
                    }
        except Exception:
            continue
    return nearest


def transcribe_audio_locally(audio_bytes: bytes) -> str:
    if stt_model is None:
        return ""
    try:
        audio_stream = io.BytesIO(audio_bytes)
        segments, _ = stt_model.transcribe(audio_stream, beam_size=1)
        return " ".join([segment.text for segment in segments]).strip()
    except Exception:
        return ""


@asynccontextmanager
async def lifespan(app: FastAPI):
    global geo_checker
    base_dir = os.path.dirname(os.path.abspath(__file__))
    mpa_path = os.path.join(base_dir, "india-mpas.geojson")
    eez_path = os.path.join(base_dir, "india-eez.geojson")
    imbl_path = os.path.join(base_dir, "imbl.geojson")

    try:
        geo_checker = BoundaryChecker(
            mpa_file=mpa_path,
            eez_file=eez_path,
            imbl_file=imbl_path,
            bathymetry_file=None,
        )
    except Exception:
        geo_checker = None
    yield
    if geo_checker and getattr(geo_checker, "bathymetry", None):
        assert geo_checker.bathymetry is not None
        geo_checker.bathymetry.close()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED_LANGS = {"ml", "ta", "te", "bn", "gu", "kn", "mr", "hi", "ur", "en"}


@app.get("/")
def serve_home():
    return FileResponse("chatbot.html")


@app.get("/map")
def serve_map():
    return FileResponse("map.html")


@app.get("/nearest-pfz")
def nearest_pfz(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
):
    result = find_nearest_pfz(latitude, longitude, get_pfz_data())
    if result is None:
        raise HTTPException(
            status_code=404, detail="No PFZ found for this location."
        )
    return {
        "user_location": {"latitude": latitude, "longitude": longitude},
        "nearest_pfz": result,
    }


@app.get("/safety-check")
def safety_check(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
):
    if geo_checker is None:
        raise HTTPException(
            status_code=503, detail="Safety engine unavailable.")
    try:
        return geo_checker.check_point(latitude=latitude, longitude=longitude)
    except ValueError as err:
        raise HTTPException(status_code=422, detail=str(err))


@app.get("/full-report")
def full_report(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
):
    return {
        "location": {"latitude": latitude, "longitude": longitude},
        "nearest_pfz": find_nearest_pfz(latitude, longitude, get_pfz_data()),
        "safety": safety_check(latitude, longitude),
        "weather": get_weather_data(latitude, longitude),
    }


@app.get("/pfz-lines")
def pfz_lines():
    return get_pfz_data()


@app.get("/pfz-distance")
def pfz_distance(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    pfz_id: str = Query(...),
):
    data = get_pfz_data()

    selected_feature = None

    for feature in data.get("features", []):
        if str(feature.get("id")) == str(pfz_id):
            selected_feature = feature
            break

    if selected_feature is None:
        raise HTTPException(
            status_code=404,
            detail="PFZ not found."
        )

    geometry = selected_feature.get("geometry")

    if not geometry:
        raise HTTPException(
            status_code=404,
            detail="PFZ geometry unavailable."
        )

    try:
        geom = shape(geometry)

        if geom.geom_type in ("Point", "LineString", "LinearRing"):
            coords = list(geom.coords)

        elif geom.geom_type == "Polygon":
            coords = list(geom.exterior.coords)

        elif geom.geom_type in ("MultiPoint", "MultiLineString"):
            coords = [
                point
                for part in geom.geoms
                for point in part.coords
            ]

        elif geom.geom_type == "MultiPolygon":
            coords = [
                point
                for part in geom.geoms
                for point in part.exterior.coords
            ]

        else:
            coords = []

        nearest_point = None
        minimum_distance = float("inf")

        for lon2, lat2 in coords:
            _, _, distance_m = geod.inv(
                longitude,
                latitude,
                lon2,
                lat2
            )

            if distance_m < minimum_distance:
                minimum_distance = distance_m

                nearest_point = {
                    "latitude": round(lat2, 6),
                    "longitude": round(lon2, 6),
                }

        if nearest_point is None:
            raise HTTPException(
                status_code=404,
                detail="Could not determine nearest point."
            )

        return {
            "pfz_id": selected_feature.get("id"),
            "distance_km": round(minimum_distance / 1000, 3),
            "nearest_point": nearest_point,
            "properties": selected_feature.get("properties", {}),
        }

    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail=f"PFZ distance calculation failed: {err}"
        )


@app.get("/route")
def route(
    start_lat: float = Query(..., ge=-90, le=90),
    start_lon: float = Query(..., ge=-180, le=180),
    end_lat: float = Query(..., ge=-90, le=90),
    end_lon: float = Query(..., ge=-180, le=180),
):
    try:
        distance_m = geod.inv(
            start_lon,
            start_lat,
            end_lon,
            end_lat
        )[2]

        distance_km = distance_m / 1000

        steps = max(
            2,
            min(50, int(distance_km / 2) + 1)
        )

        waypoints = []

        for i in range(steps):
            fraction = i / (steps - 1)

            lon = (
                start_lon
                + (end_lon - start_lon) * fraction
            )

            lat = (
                start_lat
                + (end_lat - start_lat) * fraction
            )

            waypoints.append({
                "latitude": lat,
                "longitude": lon,
                "status": "safe"
            })

        return {
            "overall_status": "safe",
            "distance_km": round(distance_km, 3),
            "waypoints": waypoints
        }

    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail=f"Route calculation failed: {err}"
        )


print("🔥 RUNNING CHATBOT FROM:", os.path.abspath(__file__))


@app.get("/boundaries/{boundary_type}")
def boundaries(boundary_type: str):
    boundary_files = {
        "mpas": "india-mpas.geojson",
        "eez": "india-eez.geojson",
        "imbl": "imbl.geojson",
    }

    filename = boundary_files.get(boundary_type)

    if filename is None:
        raise HTTPException(
            status_code=404,
            detail="Unknown boundary layer"
        )

    filepath = Path(__file__).with_name(filename)

    print("📁 LOOKING FOR:", filepath)
    print("📁 EXISTS:", filepath.exists())

    if not filepath.exists():
        raise HTTPException(
            status_code=404,
            detail="Boundary layer is unavailable"
        )

    return FileResponse(
        filepath,
        media_type="application/geo+json"
    )


@app.get("/boundaries/{boundary_type}")
def get_boundary(boundary_type: str):
    if boundary_type == "mpas":
        dataframe = boundary_checker.mpas

    elif boundary_type == "eez":
        dataframe = boundary_checker.eez

    elif boundary_type == "imbl":
        dataframe = boundary_checker.imbl

    else:
        raise HTTPException(
            status_code=404,
            detail="Unknown boundary type"
        )

    try:
        return dataframe.__geo_interface__

    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail=f"Could not convert boundary to GeoJSON: {err}"
        )


@app.get("/api/sessions")
def list_sessions(user_id: str = Query("default_user")):
    sessions = get_user_sessions_db(user_id)
    session_list = []
    for s_id, data in sessions.items():
        session_list.append({
            "session_id": s_id,
            "title": data.get("title", "New Advisory Chat"),
        })
    return session_list[::-1]


@app.post("/api/sessions/new")
def create_new_session(user_id: str = Query("default_user")):
    session_id = str(uuid.uuid4())
    session_data = {"title": "New Advisory Chat", "history": []}
    save_single_session_db(
        user_id,
        session_id,
        session_data.get("title", "Advisory Chat"),
        session_data.get("history", [])
    )
    return {"session_id": session_id, "title": "New Advisory Chat"}


@app.get("/api/sessions/{session_id}")
def get_session(session_id: str, user_id: str = Query("default_user")):
    sessions = get_user_sessions_db(user_id)
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Chat not found")
    return sessions[session_id]


@app.delete("/api/sessions/{session_id}")
def delete_single_session(
    session_id: str, user_id: str = Query("default_user")
):
    deleted = delete_session_db(user_id, session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"status": "success", "message": f"Deleted session {session_id}"}


@app.delete("/api/sessions")
def clear_all_sessions(user_id: str = Query("default_user")):
    clear_user_sessions_db(user_id)
    return {"status": "success", "message": "Chat history cleared"}


@app.post("/chat-fishery")
def chat_fishery(
    lat: float = Form(...),
    lon: float = Form(...),
    message: str = Form(None),
    session_id: str = Form(None),
    user_id: str = Form("default_user"),
    audio: UploadFile = File(None),
):
    try:
        sessions = get_user_sessions_db(user_id)
        if not session_id or session_id not in sessions:
            session_id = str(uuid.uuid4())
            session_data = {"title": "New Advisory Chat", "history": []}
        else:
            session_data = sessions[session_id]

        history = session_data.get("history", [])

        user_prompt = message.strip() if message else ""
        if audio:
            audio_bytes = audio.file.read()
            transcribed_text = transcribe_audio_locally(audio_bytes)
            if transcribed_text:
                user_prompt = (
                    f"{user_prompt} {transcribed_text}".strip()
                    if user_prompt
                    else transcribed_text
                )
            elif not user_prompt:
                user_prompt = "What is the sea condition and safety advisory right now?"

        if not user_prompt:
            user_prompt = "What is the sea condition and safety advisory right now?"

        geo_data = {}
        if geo_checker:
            try:
                geo_data = geo_checker.check_point(latitude=lat, longitude=lon)
            except Exception:
                pass

        marine_res = {}
        try:
            m_resp = requests.get(
                "[https://marine-api.open-meteo.com/v1/marine](https://marine-api.open-meteo.com/v1/marine)",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": "wave_height,wave_period,swell_wave_height",
                    "forecast_days": 1,
                },
                timeout=10,
            )
            marine_res = m_resp.json() if m_resp.status_code == 200 else {}
        except Exception:
            pass

        weather_res = {}
        owm_key = os.getenv("OWM_API_KEY")
        if owm_key:
            try:
                w_resp = requests.get(
                    "[https://api.openweathermap.org/data/2.5/weather](https://api.openweathermap.org/data/2.5/weather)",
                    params={
                        "lat": lat,
                        "lon": lon,
                        "appid": owm_key,
                        "units": "metric",
                    },
                    timeout=10,
                )
                weather_res = w_resp.json() if w_resp.status_code == 200 else {}
            except Exception:
                pass

        system_instruction = f"""
        You are 'ORCA', an AI coastal advisory and marine safety assistant for fishermen and coastal navigators.
        User GPS Coordinates: Latitude {lat}, Longitude {lon}
        
        Local Maritime & Bathymetry Status:
        - Overall Status: {geo_data.get('status', 'UNKNOWN')}
        - Inside Indian EEZ: {geo_data.get('inside_india_eez')}
        - Inside Marine Protected Area (MPA): {geo_data.get('inside_mpa')} (Details: {geo_data.get('mpa_areas')})
        - Distance to IMBL (Border): {geo_data.get('distance_to_imbl_m')} meters
        - Border Warning Triggered: {geo_data.get('imbl_alert')}
        - Water Depth: {geo_data.get('depth_m')} meters (Status: {geo_data.get('depth_status')})
        - Elevation / Is Land: {geo_data.get('elevation_m')}m / {geo_data.get('is_land')}
        - Critical Safety Warnings: {geo_data.get('warnings', [])}
        
        Live Meteorological Data:
        - Marine Forecast (Waves/Swells): {marine_res.get('hourly')}
        - Weather Data (Wind, Rain, Temp): {weather_res}
        
        Context & Memory Rules:
        1. Context Continuity: Maintain context from recent turns. If the user asks follow-up questions, resolve them directly.
        2. High Priority Alert: If 'imbl_alert' is True, urgently warn about the international border. If near shallow waters or MPAs, warn about navigational hazards and prohibited fishing.
        3. PFZ & Coastal Queries: Even if inland, do NOT refuse questions about sea conditions or Potential Fishing Zones (PFZ).
        4. Language: Always reply in the exact language the user is speaking/asking in.
        5. Length: Keep answers concise (2 to 3 practical sentences) to keep TTS quick and clear.
        6. Format: Return ONLY a valid JSON object:
           {{
             "reply": "<plain text without markdown, asterisks, or formatting>",
             "lang_code": "<2-letter ISO language code like 'ml', 'ta', 'te', 'bn', 'hi', 'en'>"
           }}
        """

        gemini_contents = []
        recent_history = history[-4:]
        for turn in recent_history:
            role = "user" if turn["role"] == "user" else "model"
            assert types is not None
            gemini_contents.append(
                types.Content(
                    role=role, parts=[
                        types.Part.from_text(text=turn["content"])]
                )
            )

        assert types is not None
        gemini_contents.append(
            types.Content(
                role="user", parts=[types.Part.from_text(text=user_prompt)]
            )
        )

        data = execute_with_fallback(system_instruction, gemini_contents)

        reply_text = data.get("reply", "").strip()
        lang_code = data.get("lang_code", "en").lower().strip()
        if lang_code not in SUPPORTED_LANGS:
            lang_code = "en"

        history.append({"role": "user", "content": user_prompt})
        history.append({"role": "model", "content": reply_text})

        if session_data.get("title") == "New Advisory Chat" and user_prompt:
            clean_prompt = user_prompt.strip()
            lowered = clean_prompt.lower()
            trivial_phrases = {
                "hello",
                "hi",
                "hey",
                "test",
                "try again",
                "help",
                "ok",
                "okay",
            }

            if clean_prompt and lowered not in trivial_phrases:
                words = clean_prompt.split()
                session_data["title"] = " ".join(words[:4]).title()
            else:
                status = geo_data.get("status", "Advisory")
                session_data["title"] = f"Sea Check ({status.replace('_', ' ').title()})"

        session_data["history"] = history
        save_single_session_db(user_id, session_id, session_data)

        audio_b64 = None
        if gTTS:
            try:
                tts = gTTS(text=reply_text, lang=lang_code, slow=False)
                audio_buffer = io.BytesIO()
                tts.write_to_fp(audio_buffer)
                audio_buffer.seek(0)
                audio_b64 = base64.b64encode(
                    audio_buffer.read()).decode("utf-8")
            except Exception:
                pass

        return {
            "session_id": session_id,
            "reply": reply_text,
            "lang_code": lang_code,
            "audio_base64": f"data:audio/mp3;base64,{audio_b64}" if audio_b64 else None,
            "geo_status": geo_data.get("status"),
            "depth_m": geo_data.get("depth_m"),
            "distance_to_imbl_m": geo_data.get("distance_to_imbl_m"),
        }

    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))
