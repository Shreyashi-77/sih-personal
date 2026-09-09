export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiError extends Error {
  public readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getUserId(): string {
  let uid = localStorage.getItem('orca_user_id');
  if (!uid) {
    uid = 'user_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('orca_user_id', uid);
  }
  return uid;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiError(`Cannot reach ORCA services at ${API_BASE_URL}. Check that the backend is running.`);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = typeof payload?.detail === 'string' ? payload.detail : `Request failed (${response.status})`;
    throw new ApiError(detail, response.status);
  }
  return response.json() as Promise<T>;
}

export interface LocationInfo { latitude: number; longitude: number }
export interface PFZResult { pfz_id: string; distance_km: number; nearest_point: LocationInfo; properties: Record<string, unknown> }
export interface NearestPFZResponse { user_location: LocationInfo; nearest_pfz: PFZResult | null }
export interface SafetyCheckResponse {
  status: string; data_confidence?: string; inside_mpa: boolean; mpa_areas: Array<{ name: string; type: string }>;
  inside_india_eez: boolean; distance_to_imbl_m: number | null; imbl_alert: boolean;
  bathymetry_available: boolean; is_land: boolean | null; elevation_m: number | null;
  depth_m: number | null; depth_status: string; warnings: string[];
}
export interface WeatherData { temp: string; wind: string; desc: string; waves: string }
export interface FullReportResponse {
  location: LocationInfo;
  nearest_pfz: PFZResult | null;
  // Retained only for the unchanged navigation UI; the current backend returns nearest_pfz.
  nearest_pfzs?: PFZResult[];
  safety: SafetyCheckResponse;
  weather?: WeatherData | null;
}

export const getSafetyCheck = (lat: number, lon: number) => request<SafetyCheckResponse>(`/safety-check?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}`);
export const getNearestPFZ = (lat: number, lon: number) => request<NearestPFZResponse>(`/nearest-pfz?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}`);
export const getPFZLines = () => request<any>('/pfz-lines');
export interface PFZDistanceResponse {
  pfz_id: string;
  distance_km: number;
  nearest_point: {
    latitude: number;
    longitude: number;
  };
  properties: Record<string, any>;
}

export const getPFZDistance = (
  latitude: number,
  longitude: number,
  pfzId: string
) =>
  request<PFZDistanceResponse>(
    `/pfz-distance?latitude=${latitude}&longitude=${longitude}&pfz_id=${encodeURIComponent(pfzId)}`
  );
  
export const getFullReport = (lat: number, lon: number) => request<FullReportResponse>(`/full-report?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}`);

export interface ChatResponse { session_id: string; reply: string; lang_code: string; audio_base64?: string; geo_status?: string; depth_m?: number | null; distance_to_imbl_m?: number | null }
export interface ChatSession { session_id: string; title: string }
export interface ChatHistoryEntry { role: 'user' | 'model'; content: string }
export function chatFishery(message: string, lat: number, lon: number, sessionId?: string) {
  const body = new FormData();
  body.append('message', message); body.append('lat', String(lat)); body.append('user_id', getUserId()); body.append('lon', String(lon));
  if (sessionId) body.append('session_id', sessionId);
  return request<ChatResponse>('/chat-fishery', { method: 'POST', body });
}
export const createChatSession = () => request<ChatSession>(`/api/sessions/new?user_id=${encodeURIComponent(getUserId())}`, { method: 'POST' });
export const getChatSessions = () => request<ChatSession[]>(`/api/sessions?user_id=${encodeURIComponent(getUserId())}`);
export const getChatSession = (sessionId: string) => request<{ title: string; history: ChatHistoryEntry[] }>(`/api/sessions/${encodeURIComponent(sessionId)}?user_id=${encodeURIComponent(getUserId())}`);
export const deleteChatSession = (sessionId: string) => request<{ status: string }>(`/api/sessions/${encodeURIComponent(sessionId)}?user_id=${encodeURIComponent(getUserId())}`, { method: 'DELETE' });

// Navigation and geofencing retain their existing UI; the current backend does not expose these endpoints.
export interface RouteWaypoint { latitude: number; longitude: number; status: string }
export interface RouteResponse { overall_status: string; distance_km: number; waypoints: RouteWaypoint[] }
export const getRoute = (startLat: number, startLon: number, endLat: number, endLon: number) => request<RouteResponse>(`/route?start_lat=${startLat}&start_lon=${startLon}&end_lat=${endLat}&end_lon=${endLon}`);
export const getBoundary = (type: 'mpas' | 'eez' | 'imbl') => request<unknown>(`/boundaries/${type}`);
