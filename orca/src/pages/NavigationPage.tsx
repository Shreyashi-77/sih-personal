import { ArrowLeft02Icon, Location01Icon, Navigation03Icon, Compass01Icon, Layers01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { MapView } from '@/components/map/MapView'
import { AIChatBar } from '@/components/ai/AIChatBar'
import { LiveConditionsBar } from '@/components/conditions/LiveConditionsBar'
import { useOrcaAPI } from '@/hooks/useOrcaAPI'
import { SOSModal } from '@/components/navigation/SOSModal'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useState, useEffect } from 'react'
import { getRoute, type RouteResponse } from '@/lib/api'
import { formatDistance, formatTime } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n'

export function NavigationPage() {
  const { t } = useLanguage();
  const geo = useGeolocation();
  const { data, loading: apiLoading, error: apiError } = useOrcaAPI(geo.lat, geo.lon);
  const [selectedPfzIndex, setSelectedPfzIndex] = useState(0);
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [pfzConditions, setPfzConditions] = useState<any>(null);
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  
  const selectedPfz = data?.nearest_pfzs?.[selectedPfzIndex];
  const pfzDistance = routeData?.distance_km || selectedPfz?.distance_km;

  useEffect(() => {
    if (geo.lat && geo.lon && selectedPfz) {
      getRoute(geo.lat, geo.lon, selectedPfz.nearest_point.latitude, selectedPfz.nearest_point.longitude)
        .then(setRouteData)
        .catch(console.error);

      // Fetch the full report for the selected PFZ to show its local weather and safety
      import('@/lib/api').then(({ getFullReport }) => {
        getFullReport(selectedPfz.nearest_point.latitude, selectedPfz.nearest_point.longitude)
          .then(setPfzConditions)
          .catch(console.error);
      });
    }
  }, [geo.lat, geo.lon, selectedPfz]);
  // Simple mock ETA calculation based on average boat speed of 20km/h
  const etaHours = pfzDistance ? pfzDistance / 20 : 0;
  const etaHoursInt = Math.floor(etaHours);
  const etaMinsInt = Math.floor((etaHours - etaHoursInt) * 60);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      
      {/* Background Map - Absolute to take full space */}
      <div className="absolute inset-0 z-0">
        <MapView 
          className="w-full h-full"
          userLocation={geo.lat && geo.lon ? { lat: geo.lat, lon: geo.lon } : undefined}
          pfzLocations={data?.nearest_pfzs?.map(p => ({ id: p.pfz_id, location: { lat: p.nearest_point.latitude, lon: p.nearest_point.longitude } }))}
          selectedPfzIndex={selectedPfzIndex}
          onPfzClick={setSelectedPfzIndex}
          route={routeData?.waypoints}
        />
        {/* Loading Overlay */}
        {(geo.loading || apiLoading) && (
          <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-border/40 z-50">
            <span className="text-primary text-sm font-medium animate-pulse">
              {geo.loading ? t('getting_location') : t('loading_api')}
            </span>
          </div>
        )}

        {/* Error Overlay */}
        {(geo.error || apiError) && (
          <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-red-500/40 z-50">
            <span className="text-red-500 text-sm font-medium">
              {geo.error ? `${t('location_error')}: ${geo.error}` : `${t('backend_offline')}`}
            </span>
          </div>
        )}
      </div>

      {/* Floating UI Layer */}
      <div className="relative z-10 flex-1 flex flex-col p-3 md:p-6 gap-4 h-full pointer-events-none">
        
        {/* Top Bar Container */}
        <div className="flex gap-2 w-full pointer-events-auto">
          {/* Back Button */}
          <button className="flex items-center justify-center w-12 h-12 rounded-2xl bg-card border border-border/40 shadow-lg text-foreground hover:bg-accent transition-colors">
            <HugeiconsIcon icon={ArrowLeft02Icon} size={24} />
          </button>

          {/* Status Card */}
          <div className="flex-1 bg-navy/90 dark:bg-card border border-border/40 rounded-2xl shadow-lg p-3 md:p-4 flex flex-col gap-3 text-white dark:text-foreground backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs text-white/70 dark:text-muted-foreground font-medium">Going to</span>
                <span className="text-lg md:text-xl font-bold">
                  {selectedPfz?.pfz_id || 'PFZ'}
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
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-white/70 dark:text-muted-foreground mb-0.5">
                  <HugeiconsIcon icon={Location01Icon} size={14} />
                  <span className="text-[10px] md:text-xs">{t('distance_left')}</span>
                </div>
                <span className="text-sm md:text-base font-semibold">
                  {pfzDistance ? `${pfzDistance.toFixed(1)} km` : '-- km'}
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-white/70 dark:text-muted-foreground mb-0.5">
                  <HugeiconsIcon icon={Navigation03Icon} size={14} />
                  <span className="text-[10px] md:text-xs">{t('eta')}</span>
                </div>
                <span className="text-sm md:text-base font-semibold">
                  {pfzDistance ? `${etaHoursInt}h ${etaMinsInt}m` : '--h --m'}
                </span>
              </div>
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

        {/* Map Controls (Right side) */}
        <div className="absolute right-4 md:right-8 top-[30%] flex flex-col gap-3 pointer-events-auto">
          <button className="w-10 h-10 md:w-12 md:h-12 bg-card rounded-full shadow-lg border border-border/40 flex items-center justify-center text-foreground hover:bg-accent transition-colors">
            <HugeiconsIcon icon={Compass01Icon} size={20} className="md:w-6 md:h-6 text-red-500" />
          </button>
          <button className="w-10 h-10 md:w-12 md:h-12 bg-card rounded-full shadow-lg border border-border/40 flex items-center justify-center text-foreground hover:bg-accent transition-colors">
            <HugeiconsIcon icon={Layers01Icon} size={20} className="md:w-6 md:h-6" />
          </button>
          <button className="w-10 h-10 md:w-12 md:h-12 bg-card rounded-full shadow-lg border border-border/40 flex items-center justify-center text-foreground hover:bg-accent transition-colors">
            <HugeiconsIcon icon={Location01Icon} size={20} className="md:w-6 md:h-6 text-blue-500" />
          </button>
        </div>

        {/* Bottom Section */}
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

      <SOSModal isOpen={isSOSOpen} onClose={() => setIsSOSOpen(false)} />
    </div>
  )
}
