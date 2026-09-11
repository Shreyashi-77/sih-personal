import { auth } from "@/lib/firebase";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export class ApiError extends Error {
  public readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/* =========================================================
   FIREBASE USER AUTH
   ========================================================= */

export async function getUserIdAndToken(): Promise<{
  userId: string;
  token: string;
}> {
  const user = auth.currentUser;

  if (!user) {
    throw new ApiError("User is not authenticated.", 401);
  }

  const token = await user.getIdToken();

  return {
    userId: user.uid,
    token,
  };
}

/* =========================================================
   GENERIC API REQUEST
   ========================================================= */

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new ApiError(
      `Cannot reach ORCA services at ${API_BASE_URL}. Check that the backend is running.`
    );
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);

    const detail =
      typeof payload?.detail === "string"
        ? payload.detail
        : `Request failed (${response.status})`;

    throw new ApiError(detail, response.status);
  }

  return response.json() as Promise<T>;
}

/* =========================================================
   USER PROFILE
   ========================================================= */

export interface UserData {
  userId: string;
  fullName: string;
  username: string;
  email: string;
}

/*
 * Get the currently logged-in user's profile
 * from MongoDB through FastAPI.
 */
export async function getUserProfile(): Promise<UserData> {
  const { token } = await getUserIdAndToken();

  return request<UserData>("/user", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/*
 * Save/update the currently logged-in user's
 * profile in MongoDB.
 */
export async function saveUserProfile(
  fullName: string,
  username: string
): Promise<UserData> {
  const { token } = await getUserIdAndToken();

  const params = new URLSearchParams();

  params.append("full_name", fullName);
  params.append("username", username);

  return request<UserData>(
    `/user?${params.toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/* =========================================================
   LOCATION
   ========================================================= */

export interface LocationInfo {
  latitude: number;
  longitude: number;
}

/* =========================================================
   PFZ
   ========================================================= */

export interface PFZResult {
  pfz_id: string;
  distance_km: number;
  nearest_point: LocationInfo;
  properties: Record<string, unknown>;
}

export interface NearestPFZResponse {
  user_location: LocationInfo;
  nearest_pfz: PFZResult | null;
}

export interface PFZDistanceResponse {
  pfz_id: string;
  distance_km: number;
  nearest_point: {
    latitude: number;
    longitude: number;
  };
  properties: Record<string, any>;
}

/* =========================================================
   SAFETY
   ========================================================= */

export interface SafetyCheckResponse {
  status: string;
  data_confidence?: string;

  inside_mpa: boolean;

  mpa_areas: Array<{
    name: string;
    type: string;
  }>;

  inside_india_eez: boolean;

  distance_to_imbl_m: number | null;

  imbl_alert: boolean;

  bathymetry_available: boolean;

  is_land: boolean | null;

  elevation_m: number | null;

  depth_m: number | null;

  depth_status: string;

  warnings: string[];
}

/* =========================================================
   WEATHER
   ========================================================= */

export interface WeatherData {
  temp: string;
  wind: string;
  desc: string;
  waves: string;
}

/* =========================================================
   FULL REPORT
   ========================================================= */

export interface FullReportResponse {
  location: LocationInfo;

  nearest_pfz: PFZResult | null;

  nearest_pfzs?: PFZResult[];

  safety: SafetyCheckResponse;

  weather?: WeatherData | null;
}

/* =========================================================
   PFZ / SAFETY API CALLS
   ========================================================= */

export const getSafetyCheck = (
  lat: number,
  lon: number
) =>
  request<SafetyCheckResponse>(
    `/safety-check?latitude=${encodeURIComponent(
      lat
    )}&longitude=${encodeURIComponent(lon)}`
  );

export const getNearestPFZ = (
  lat: number,
  lon: number
) =>
  request<NearestPFZResponse>(
    `/nearest-pfz?latitude=${encodeURIComponent(
      lat
    )}&longitude=${encodeURIComponent(lon)}`
  );

export const getPFZLines = () =>
  request<any>("/pfz-lines");

export const getPFZDistance = (
  latitude: number,
  longitude: number,
  pfzId: string
) =>
  request<PFZDistanceResponse>(
    `/pfz-distance?latitude=${latitude}&longitude=${longitude}&pfz_id=${encodeURIComponent(
      pfzId
    )}`
  );

export const getFullReport = (
  lat: number,
  lon: number
) =>
  request<FullReportResponse>(
    `/full-report?latitude=${encodeURIComponent(
      lat
    )}&longitude=${encodeURIComponent(lon)}`
  );

/* =========================================================
   CHAT
   ========================================================= */

export interface ChatResponse {
  session_id: string;
  reply: string;
  lang_code: string;
  audio_base64?: string;
  geo_status?: string;
  depth_m?: number | null;
  distance_to_imbl_m?: number | null;
}

export interface ChatSession {
  session_id: string;
  title: string;
}

export interface ChatHistoryEntry {
  role: "user" | "model";
  content: string;
}

/* =========================================================
   CHAT FISHERY
   ========================================================= */

export async function chatFishery(
  message: string,
  lat: number,
  lon: number,
  sessionId?: string,
  signal?: AbortSignal
) {
  const { userId, token } =
    await getUserIdAndToken();

  const body = new FormData();

  body.append("message", message);
  body.append("lat", String(lat));
  body.append("lon", String(lon));
  body.append("user_id", userId);

  if (sessionId) {
    body.append("session_id", sessionId);
  }

  return request<ChatResponse>(
    "/chat-fishery",
    {
      method: "POST",
      body,
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/* =========================================================
   CHAT SESSIONS
   ========================================================= */

export const createChatSession = async () => {
  const { userId, token } =
    await getUserIdAndToken();

  return request<ChatSession>(
    `/api/sessions/new?user_id=${encodeURIComponent(
      userId
    )}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

export const getChatSessions = async () => {
  const { userId, token } =
    await getUserIdAndToken();

  return request<ChatSession[]>(
    `/api/sessions?user_id=${encodeURIComponent(
      userId
    )}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

export const getChatSession = async (
  sessionId: string
) => {
  const { userId, token } =
    await getUserIdAndToken();

  return request<{
    title: string;
    history: ChatHistoryEntry[];
  }>(
    `/api/sessions/${encodeURIComponent(
      sessionId
    )}?user_id=${encodeURIComponent(userId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

export const deleteChatSession = async (
  sessionId: string
) => {
  const { userId, token } =
    await getUserIdAndToken();

  return request<{ status: string }>(
    `/api/sessions/${encodeURIComponent(
      sessionId
    )}?user_id=${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

export const clearChatSessions = async () => {
  const { userId, token } =
    await getUserIdAndToken();

  return request<{ status: string }>(
    `/api/sessions?user_id=${encodeURIComponent(
      userId
    )}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

/* =========================================================
   NAVIGATION
   ========================================================= */

export interface RouteWaypoint {
  latitude: number;
  longitude: number;
  status: string;
}

export interface RouteResponse {
  overall_status: string;
  distance_km: number;
  waypoints: RouteWaypoint[];
}

export const getRoute = (
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
) =>
  request<RouteResponse>(
    `/route?start_lat=${startLat}&start_lon=${startLon}&end_lat=${endLat}&end_lon=${endLon}`
  );

/* =========================================================
   GEOFENCING / BOUNDARIES
   ========================================================= */

export const getBoundary = (
  type: "mpas" | "eez" | "imbl"
) =>
  request<unknown>(
    `/boundaries/${type}`
  );