import { HugeiconsIcon } from '@hugeicons/react'
import { ThermometerIcon, WavesIcon, Alert02Icon, CheckmarkBadge01Icon, Alert01Icon, WindIcon } from '@hugeicons/core-free-icons'
import type { SafetyCheckResponse, WeatherData } from '@/lib/api'

interface LiveConditionsBarProps {
  safety?: SafetyCheckResponse | null;
  weather?: WeatherData | null;
}

export function LiveConditionsBar({ safety, weather }: LiveConditionsBarProps) {
  const liveConditions = safety ? [
    { label: 'Wind', value: weather?.wind || 'N/A', icon: WindIcon, iconColor: 'text-gray-500' },
    { label: 'Safety', value: safety.status, icon: Alert02Icon, iconColor: safety.status === 'SAFE' ? 'text-green-500' : 'text-red-500' },
    { label: 'Wave Height', value: weather?.waves || 'N/A', icon: WavesIcon, iconColor: 'text-blue-400' },
    { label: 'Temp (SST)', value: weather?.temp || 'N/A', icon: ThermometerIcon, iconColor: 'text-blue-500' },
  ] : [
    { label: 'Wind', value: '16 km/h', icon: WindIcon, iconColor: 'text-gray-500' },
    { label: 'Safety', value: 'Loading', icon: Alert02Icon, iconColor: 'text-gray-500' },
    { label: 'Wave Height', value: '1.2 m', icon: WavesIcon, iconColor: 'text-gray-500' },
    { label: 'Temp (SST)', value: '27.4°C', icon: ThermometerIcon, iconColor: 'text-gray-500' },
  ];

  const isSafe = safety?.status === 'SAFE';

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-2">
        {liveConditions.map((condition) => (
          <div key={condition.label} className="flex flex-col items-center justify-center text-center">
            <span className="text-[10px] md:text-xs text-muted-foreground mb-1">{condition.label}</span>
            <div className={`mb-1 flex items-center justify-center ${condition.iconColor}`}>
              <HugeiconsIcon icon={condition.icon} size={24} className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-xs md:text-sm font-semibold">{condition.value}</span>
          </div>
        ))}
      </div>
      
      {safety && (
        <div className={`border rounded-xl p-2.5 flex items-center gap-2 ${isSafe ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          <HugeiconsIcon icon={isSafe ? CheckmarkBadge01Icon : Alert01Icon} size={18} className={`${isSafe ? 'text-green-500' : 'text-red-500'} shrink-0`} />
          <span className={`text-xs md:text-sm font-medium ${isSafe ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
            {isSafe ? 'Conditions are good. Safe trip!' : 'Warning! Unsafe conditions detected.'}
          </span>
        </div>
      )}
    </div>
  )
}
