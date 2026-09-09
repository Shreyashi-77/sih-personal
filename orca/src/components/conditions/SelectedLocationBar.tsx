import { Cancel01Icon, ThermometerIcon, WavesIcon, WindIcon, Location01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { SafetyCheckResponse, WeatherData } from '@/lib/api'
import { Button } from '@/components/ui/button'

interface SelectedLocationBarProps {
  location: { lat: number; lon: number }
  safety?: SafetyCheckResponse | null
  weather?: WeatherData | null
  nearestPfz?: string
  loading: boolean
  error: string | null
  onClose: () => void
}

export function SelectedLocationBar({ location, safety, weather, nearestPfz, loading, error, onClose }: SelectedLocationBarProps) {
  const statusColor = safety?.status === 'SAFE'
    ? 'text-green-500'
    : safety?.status
      ? 'text-yellow-500'
      : 'text-muted-foreground'

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
      <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
          <HugeiconsIcon icon={Location01Icon} size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Selected location</p>
          <p className="truncate text-sm font-semibold">
            {location.lat.toFixed(5)}° N, {Math.abs(location.lon).toFixed(5)}° {location.lon >= 0 ? 'E' : 'W'}
          </p>
        </div>
      </div>

      {loading ? (
        <p className="min-w-0 text-sm text-muted-foreground animate-pulse">Loading location data...</p>
      ) : error ? (
        <p className="min-w-0 text-sm text-red-500">Location data unavailable.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:flex md:items-center md:gap-6">
          <SelectedValue icon={ThermometerIcon} label="Temperature" value={weather?.temp || 'N/A'} />
          <SelectedValue icon={WavesIcon} label="Waves" value={weather?.waves || 'N/A'} />
          <SelectedValue icon={WindIcon} label="Wind" value={weather?.wind || 'N/A'} />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground">Safety</p>
            <p className={`truncate text-sm font-bold ${statusColor}`}>{safety?.status || 'N/A'}</p>
            <p className="truncate text-[11px] text-muted-foreground/70">{nearestPfz ? `Nearest PFZ: ${nearestPfz}` : 'No nearby PFZ'}</p>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        aria-label="Close selected location"
        title="Close selected location"
        className="self-center text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={18} />
      </Button>
    </div>
  )
}

function SelectedValue({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <HugeiconsIcon icon={icon} size={18} className="shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-bold">{value}</p>
      </div>
    </div>
  )
}