import { useLanguage } from '@/lib/i18n'
import { useState, useEffect } from 'react'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useOrcaAPI } from '@/hooks/useOrcaAPI'
import { HugeiconsIcon } from '@hugeicons/react'
import { Alert02Icon, Notification01Icon, Alert01Icon, InformationCircleIcon, Tick02Icon } from '@hugeicons/core-free-icons'

export function AlertsPage() {
  const { t } = useLanguage()
  const geo = useGeolocation()
  const { data: apiData } = useOrcaAPI(geo.lat, geo.lon)

  const safety = apiData?.safety

  const staticAlerts = [
    {
      id: 'static-1',
      type: 'warning',
      title: 'High Wave Alert',
      message: 'Wave heights exceeding 3 meters reported 50nm off the coast. Small vessels advised to return to port.',
      time: '2 hours ago',
      icon: Alert02Icon,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10'
    },
    {
      id: 'static-2',
      type: 'info',
      title: 'Weather Advisory',
      message: 'Squally weather with wind speeds reaching 45-55 kmph gusting to 65 kmph likely over Westcentral Bay of Bengal.',
      time: '5 hours ago',
      icon: Notification01Icon,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    }
  ]

  const [liveAlerts, setLiveAlerts] = useState<any[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(true)

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/live-alerts`)
      .then(res => res.json())
      .then(data => {
        if (data && data.alerts && data.alerts.length > 0) {
          const formattedAlerts = data.alerts.map((a: any) => ({
            id: a.id,
            type: a.type,
            title: a.title,
            message: a.message,
            time: a.time,
            icon: a.type === 'warning' ? Alert02Icon : Notification01Icon,
            color: a.type === 'warning' ? 'text-red-500' : 'text-orange-500',
            bg: a.type === 'warning' ? 'bg-red-500/10' : 'bg-orange-500/10'
          }))
          setLiveAlerts(formattedAlerts)
        } else {
          setLiveAlerts(staticAlerts)
        }
      })
      .catch(err => {
        console.error("Failed to fetch live alerts", err)
        setLiveAlerts(staticAlerts)
      })
      .finally(() => setLoadingAlerts(false))
  }, [])

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto min-h-0 bg-background/50">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
          <HugeiconsIcon icon={Notification01Icon} size={24} className="text-white" />
        </div>
        <div>
          <h1 className="font-bold text-2xl leading-none mb-1 text-foreground tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground font-medium">Live maritime warnings and notifications</p>
        </div>
      </div>

      <div className="space-y-6 max-w-4xl mx-auto w-full pb-20">
        
        {/* Live Safety Status Panel */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Live Status</h2>
          
          {safety ? (
            <div className={`p-6 rounded-3xl border shadow-sm transition-all duration-300 flex items-start gap-4 
              ${safety.status === 'SAFE' 
                ? 'bg-card/60 border-border/40 hover:bg-card hover:border-border' 
                : 'bg-red-500/5 border-red-500/20 shadow-red-500/5 ring-1 ring-red-500/10 animate-pulse-slow'}`}>
              
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner
                ${safety.status === 'SAFE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500 text-white shadow-red-600/50'}`}>
                <HugeiconsIcon icon={safety.status === 'SAFE' ? Tick02Icon : Alert02Icon} size={24} />
              </div>
              
              <div className="flex-1 min-w-0 pt-1">
                <h3 className={`font-semibold text-lg mb-1 ${safety.status === 'SAFE' ? 'text-foreground' : 'text-red-500'}`}>
                  {safety.status === 'SAFE' ? 'All Clear' : 'RESTRICTED ZONE'}
                </h3>
                
                {safety.status === 'SAFE' ? (
                  <p className="text-sm text-muted-foreground">You are currently in safe waters. No immediate geofence violations detected.</p>
                ) : (
                  <div className="space-y-2 mt-2">
                    {safety.warnings?.map((warning: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm font-medium text-red-500/90 bg-red-500/10 px-3 py-1.5 rounded-lg w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        {warning}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-card/40 border border-border/40 flex items-center justify-center text-muted-foreground text-sm">
              <span className="animate-pulse">Checking live position...</span>
            </div>
          )}
        </section>

        {/* General Marine Alerts */}
        <section className="pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Marine Advisories</h2>
          
          <div className="space-y-3">
            {loadingAlerts ? (
              <div className="p-8 text-center text-muted-foreground animate-pulse">
                Fetching live global hazard alerts...
              </div>
            ) : (
              liveAlerts.map(alert => (
                <div key={alert.id} className="p-5 rounded-3xl bg-card border border-border/40 hover:border-border/80 transition-colors shadow-sm flex gap-4 group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${alert.bg} ${alert.color} group-hover:scale-110 transition-transform`}>
                    <HugeiconsIcon icon={alert.icon} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-foreground text-sm">{alert.title}</h4>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{alert.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {alert.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  )
}
