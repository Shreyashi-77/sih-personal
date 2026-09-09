import {
  ArrowLeft02Icon,
  Location01Icon,
  Navigation03Icon,
  Compass01Icon,
  Layers01Icon,
} from "@hugeicons/core-free-icons";

import { HugeiconsIcon } from "@hugeicons/react";

import { MapView } from "@/components/map/MapView";
import { AIChatBar } from "@/components/ai/AIChatBar";
import { LiveConditionsBar } from "@/components/conditions/LiveConditionsBar";

import { useOrcaAPI } from "@/hooks/useOrcaAPI";
import { SOSModal } from "@/components/navigation/SOSModal";
import { useGeolocation } from "@/hooks/useGeolocation";

import {
  getRoute,
  getPFZLines,
  getPFZDistance,
  getFullReport,
  type RouteResponse,
} from "@/lib/api";

import { useBoundaries } from "@/hooks/useBoundaries";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";

interface NavigationPageProps {
  onBack?: () => void;
}

export function NavigationPage({ onBack }: NavigationPageProps) {
  const { t } = useLanguage();

  const geo = useGeolocation();

  const {
    data,
    loading: apiLoading,
    error: apiError,
  } = useOrcaAPI(geo.lat, geo.lon);

  const {
    data: boundariesData,
    loading: boundariesLoading,
    error: boundariesError,
  } = useBoundaries();

  const [pfzLines, setPfzLines] = useState<any | null>(null);

  const [selectedPfzId, setSelectedPfzId] = useState<string | null>(null);

  const [selectedPfz, setSelectedPfz] = useState<any | null>(null);

  const [routeData, setRouteData] = useState<RouteResponse | null>(null);

  const [pfzConditions, setPfzConditions] = useState<any | null>(null);

  const [isSOSOpen, setIsSOSOpen] = useState(false);

  const [pfzLoading, setPfzLoading] = useState(false);

  /*
   * Load all PFZ lines.
   */
  useEffect(() => {
    let mounted = true;

    getPFZLines()
      .then((lines) => {
        if (mounted) {
          setPfzLines(lines);
        }
      })
      .catch((error) => {
        console.error("Failed to load PFZ lines:", error);

        if (mounted) {
          setPfzLines(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Initially select the nearest PFZ returned
   * by the backend.
   *
   * Backend returns:
   * data.nearest_pfz
   */
  useEffect(() => {
    if (!selectedPfzId && data?.nearest_pfz) {
      setSelectedPfzId(data.nearest_pfz.pfz_id);

      setSelectedPfz(data.nearest_pfz);
    }
  }, [data, selectedPfzId]);

  /*
   * Handle clicking a PFZ line on the map.
   */
  const handlePfzLineClick = async (pfzId: string) => {
    if (geo.lat == null || geo.lon == null) {
      return;
    }

    try {
      setPfzLoading(true);

      setSelectedPfzId(pfzId);

      /*
       * Find distance from the user's
       * current location to this PFZ.
       */
      const distanceData = await getPFZDistance(geo.lat, geo.lon, pfzId);

      setSelectedPfz(distanceData);

      /*
       * Get safety + weather information
       * for the closest point of the PFZ.
       */
      const report = await getFullReport(
        distanceData.nearest_point.latitude,
        distanceData.nearest_point.longitude,
      );

      setPfzConditions(report);

      /*
       * Get route from the user to the
       * selected PFZ.
       */
      const route = await getRoute(
        geo.lat,
        geo.lon,
        distanceData.nearest_point.latitude,
        distanceData.nearest_point.longitude,
      );

      setRouteData(route);
    } catch (error) {
      console.error("PFZ selection failed:", error);
    } finally {
      setPfzLoading(false);
    }
  };

  /*
   * Distance to selected PFZ.
   */
  const pfzDistance = selectedPfz?.distance_km ?? null;

  /*
   * Demo boat speed:
   * 20 km/h
   */
  const etaHours = pfzDistance ? pfzDistance / 20 : 0;

  const etaHoursInt = Math.floor(etaHours);

  const etaMinsInt = Math.floor((etaHours - etaHoursInt) * 60);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* ================= MAP ================= */}

      <div className="absolute inset-0 z-0">
        <MapView
          className="w-full h-full"
          userLocation={
            geo.lat != null && geo.lon != null
              ? {
                  lat: geo.lat,
                  lon: geo.lon,
                }
              : undefined
          }
          pfzLocations={
            selectedPfz
              ? [
                  {
                    id: selectedPfz.pfz_id,
                    location: {
                      lat: selectedPfz.nearest_point.latitude,
                      lon: selectedPfz.nearest_point.longitude,
                    },
                  },
                ]
              : undefined
          }
          pfzLines={pfzLines}
          onPfzLineClick={handlePfzLineClick}
          route={routeData?.waypoints}
          showMPAs
          showEEZ
          showIMBL
          boundariesData={boundariesData}
        />

        {/* Boundary loading/error */}

        {(boundariesLoading || boundariesError) && (
          <div className="absolute top-4 left-4 z-50 rounded-xl border border-border/40 bg-card/90 px-4 py-2 text-xs shadow-lg backdrop-blur-md">
            {boundariesLoading && (
              <span className="text-muted-foreground animate-pulse">
                Loading boundary layers...
              </span>
            )}

            {boundariesError && (
              <span className="text-red-500">Boundary layers unavailable.</span>
            )}
          </div>
        )}

        {/* Loading */}

        {(geo.loading || apiLoading || pfzLoading) && (
          <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-border/40 z-50">
            <span className="text-primary text-sm font-medium animate-pulse">
              {geo.loading
                ? t("getting_location")
                : pfzLoading
                  ? "Checking PFZ..."
                  : t("loading_api")}
            </span>
          </div>
        )}

        {/* Error */}

        {(geo.error || apiError) && (
          <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-red-500/40 z-50">
            <span className="text-red-500 text-sm font-medium">
              {geo.error
                ? `${t("location_error")}: ${geo.error}`
                : t("backend_offline")}
            </span>
          </div>
        )}
      </div>

      {/* ================= FLOATING UI ================= */}

      <div className="relative z-10 flex-1 flex flex-col p-3 md:p-6 gap-4 h-full pointer-events-none">
        {/* ================= TOP BAR ================= */}

        <div className="flex gap-2 w-full pointer-events-auto">
          {/* Back Button */}

          <button
            onClick={onBack}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-card border border-border/40 shadow-lg text-foreground hover:bg-accent transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft02Icon} size={24} />
          </button>

          {/* Status Card */}

          <div className="flex-1 bg-navy/90 dark:bg-card border border-border/40 rounded-2xl shadow-lg p-3 md:p-4 flex flex-col gap-3 text-white dark:text-foreground backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs text-white/70 dark:text-muted-foreground font-medium">
                  Going to
                </span>

                <span className="text-lg md:text-xl font-bold">
                  {selectedPfz?.pfz_id || "PFZ"}
                </span>
              </div>

              <button
                onClick={() => setIsSOSOpen(true)}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-1.5 rounded-full text-sm font-bold shadow-sm transition-colors"
              >
                SOS
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 dark:border-border/40">
              {/* Distance */}

              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-white/70 dark:text-muted-foreground mb-0.5">
                  <HugeiconsIcon icon={Location01Icon} size={14} />

                  <span className="text-[10px] md:text-xs">
                    {t("distance_left")}
                  </span>
                </div>

                <span className="text-sm md:text-base font-semibold">
                  {pfzDistance != null
                    ? `${pfzDistance.toFixed(1)} km`
                    : "-- km"}
                </span>
              </div>

              {/* ETA */}

              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-white/70 dark:text-muted-foreground mb-0.5">
                  <HugeiconsIcon icon={Navigation03Icon} size={14} />

                  <span className="text-[10px] md:text-xs">{t("eta")}</span>
                </div>

                <span className="text-sm md:text-base font-semibold">
                  {pfzDistance != null
                    ? `${etaHoursInt}h ${etaMinsInt}m`
                    : "--h --m"}
                </span>
              </div>

              {/* Arrival */}

              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-white/70 dark:text-muted-foreground mb-0.5">
                  <HugeiconsIcon icon={Location01Icon} size={14} />

                  <span className="text-[10px] md:text-xs">Arrival Time</span>
                </div>

                <span className="text-sm md:text-base font-semibold">
                  --:--
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= PFZ INFO ================= */}

        {selectedPfz && (
          <div className="pointer-events-auto bg-card/95 backdrop-blur-md rounded-2xl shadow-lg border border-border/40 p-4 max-w-md">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Selected PFZ</p>

                <h3 className="font-bold text-lg">{selectedPfz.pfz_id}</h3>
              </div>

              {pfzLoading && (
                <span className="text-xs text-primary animate-pulse">
                  Checking...
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Distance</p>

                <p className="font-semibold">
                  {selectedPfz.distance_km != null
                    ? `${selectedPfz.distance_km.toFixed(1)} km`
                    : "--"}
                </p>
              </div>

              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">ETA</p>

                <p className="font-semibold">
                  {pfzDistance != null
                    ? `${etaHoursInt}h ${etaMinsInt}m`
                    : "--"}
                </p>
              </div>
            </div>

            {/* Safety */}

            {pfzConditions?.safety && (
              <div className="mt-3 rounded-xl border border-border/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Safety Status
                </p>

                <p className="font-semibold">
                  {pfzConditions.safety.status || "Available"}
                </p>

                {pfzConditions.safety.warnings?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {pfzConditions.safety.warnings
                      .slice(0, 3)
                      .map((warning: string, index: number) => (
                        <p key={index} className="text-xs text-destructive">
                          ⚠ {warning}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Weather */}

            {pfzConditions?.weather && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  🌬 Wind:
                  <strong className="ml-1">
                    {pfzConditions.weather.wind ?? "--"}
                  </strong>
                </div>

                <div>
                  🌊 Waves:
                  <strong className="ml-1">
                    {pfzConditions.weather.waves ?? "--"}
                  </strong>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= MAP CONTROLS ================= */}

        <div className="absolute right-4 md:right-8 top-[30%] flex flex-col gap-3 pointer-events-auto">
          <button className="w-10 h-10 md:w-12 md:h-12 bg-card rounded-full shadow-lg border border-border/40 flex items-center justify-center text-foreground hover:bg-accent transition-colors">
            <HugeiconsIcon
              icon={Compass01Icon}
              size={20}
              className="md:w-6 md:h-6 text-red-500"
            />
          </button>

          <button className="w-10 h-10 md:w-12 md:h-12 bg-card rounded-full shadow-lg border border-border/40 flex items-center justify-center text-foreground hover:bg-accent transition-colors">
            <HugeiconsIcon
              icon={Layers01Icon}
              size={20}
              className="md:w-6 md:h-6"
            />
          </button>

          <button
            onClick={() => {
              if (geo.lat != null && geo.lon != null) {
                // MapView already receives
                // the current user location.
              }
            }}
            className="w-10 h-10 md:w-12 md:h-12 bg-card rounded-full shadow-lg border border-border/40 flex items-center justify-center text-foreground hover:bg-accent transition-colors"
          >
            <HugeiconsIcon
              icon={Location01Icon}
              size={20}
              className="md:w-6 md:h-6 text-blue-500"
            />
          </button>
        </div>

        {/* ================= BOTTOM ================= */}

        <div className="mt-auto flex flex-col gap-4 w-full pointer-events-auto">
          <div className="bg-card/90 backdrop-blur-md rounded-3xl shadow-lg border border-border/40 p-4 md:p-6 shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-foreground">Live Conditions</h3>

              <button className="text-xs text-primary font-medium flex items-center gap-1">
                View More &gt;
              </button>
            </div>

            <LiveConditionsBar
              safety={pfzConditions?.safety || data?.safety}
              weather={pfzConditions?.weather || data?.weather}
            />
          </div>

          <div className="shrink-0 pb-2">
            <AIChatBar />
          </div>
        </div>
      </div>

      {/* ================= SOS ================= */}

      <SOSModal isOpen={isSOSOpen} onClose={() => setIsSOSOpen(false)} />
    </div>
  );
}
