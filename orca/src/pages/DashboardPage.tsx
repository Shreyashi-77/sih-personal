import { MapView } from '@/components/map/MapView'
import { ConditionsBar } from '@/components/conditions/ConditionsBar'
import { AIChatBar } from '@/components/ai/AIChatBar'
import { useOrcaAPI } from '@/hooks/useOrcaAPI'
import { useGeolocation } from '@/hooks/useGeolocation'
import { getPFZLines } from '@/lib/api'
import { useBoundaries } from '@/hooks/useBoundaries'
import { useState, useMemo, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import { SelectedLocationBar } from '@/components/conditions/SelectedLocationBar'

export function DashboardPage() {
  const { t } = useLanguage()
  const geo = useGeolocation();
  const { data, loading, error } = useOrcaAPI(geo.lat, geo.lon);
  const { data: boundariesData, loading: boundariesLoading, error: boundariesError } = useBoundaries();
  const [selectedPfzIndex, setSelectedPfzIndex] = useState(0);
  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [pfzLines, setPfzLines] = useState<any | null>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const clickedReport = useOrcaAPI(clickedLocation?.lat ?? null, clickedLocation?.lon ?? null);

  useEffect(() => {
    let mounted = true;

    getPFZLines()
      .then((lines) => {
        if (mounted) setPfzLines(lines);
      })
      .catch(() => {
        if (mounted) setPfzLines(null);
      });

    return () => {
      mounted = false;
    };
  }, []);
  
  const displayError = geo.error || error;
  const displayLoading = geo.loading || loading;

  const selectedPfz = data?.nearest_pfz;

  const userLocation = useMemo(() => geo.lat && geo.lon ? { lat: geo.lat, lon: geo.lon } : undefined, [geo.lat, geo.lon]);
  
  const pfzLocations = useMemo(() => {
    return selectedPfz ? [{
      id: selectedPfz.pfz_id,
      location: { lat: selectedPfz.nearest_point.latitude, lon: selectedPfz.nearest_point.longitude }
    }] : undefined
  }, [selectedPfz]);


  return (
    <div className="flex-1 flex flex-col p-3 md:p-6 pt-0 gap-4 md:gap-6 overflow-y-auto min-h-0">
      
      {/* Map Section */}
      <div className={isMapFullscreen
        ? "fixed inset-0 z-100 bg-muted"
        : "flex-1 min-h-[40vh] md:min-h-0 relative rounded-3xl overflow-hidden bg-muted border border-border/40 shadow-sm isolate"}>
        <MapView 
          className="w-full h-full" 
          isFullscreen={isMapFullscreen}
          onToggleFullscreen={() => setIsMapFullscreen((fullscreen) => !fullscreen)}
          userLocation={userLocation}
          clickedLocation={clickedLocation ?? undefined}
          onMapClick={setClickedLocation}
          pfzLocations={pfzLocations}
          pfzLines={pfzLines}
          selectedPfzIndex={selectedPfzIndex}
          onPfzClick={setSelectedPfzIndex}
          showMPAs
          showEEZ
          showIMBL
          boundariesData={boundariesData}
        />
        {(boundariesLoading || boundariesError) && (
          <div className="absolute top-4 left-4 z-50 rounded-xl border border-border/40 bg-card/90 px-4 py-2 text-xs shadow-lg backdrop-blur-md">
            {boundariesLoading && <span className="text-muted-foreground animate-pulse">Loading boundary layers...</span>}
            {boundariesError && <span className="text-red-500">Boundary layers unavailable.</span>}
          </div>
        )}
        {displayLoading && (
          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-border/40 z-50">
            <span className="text-primary text-sm font-medium animate-pulse">
              {geo.loading ? t('getting_location') : t('loading_api')}
            </span>
          </div>
        )}
        {displayError && (
          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-red-500/40 z-50">
            <span className="text-red-500 text-xs font-medium">
              {geo.error ? `${t('location_error')}: ${geo.error}` : error || t('backend_offline')}
            </span>
          </div>
        )}
      </div>

      {/* Middle Section: Conditions */}
      {!isMapFullscreen && <div className="rounded-3xl shadow-sm border border-border/40 bg-card p-4 md:p-6 shrink-0">
        <ConditionsBar 
          safety={data?.safety}
          weather={data?.weather}
        />
      </div>}

      {clickedLocation && !isMapFullscreen && (
        <div className="rounded-3xl shadow-sm border border-primary/20 bg-card p-4 md:p-6 shrink-0">
          <SelectedLocationBar
            location={clickedLocation}
            onClose={() => setClickedLocation(null)}
            safety={clickedReport.data?.safety}
            weather={clickedReport.data?.weather}
            loading={clickedReport.loading}
            error={clickedReport.error}
            nearestPfz={clickedReport.data?.nearest_pfz?.pfz_id}
          />
        </div>
      )}

      {/* Bottom Section: AI Chat */}
      {!isMapFullscreen && <div className="mt-auto shrink-0 pb-4 md:pb-0">
        <AIChatBar />
      </div>}

    </div>
  )
}
