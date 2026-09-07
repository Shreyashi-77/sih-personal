import { ConditionItem } from './ConditionItem'
import { Separator } from '@/components/ui/separator'
import { ThermometerIcon, WavesIcon, Alert02Icon, Leaf02Icon, WindIcon } from '@hugeicons/core-free-icons'
import type { SafetyCheckResponse, WeatherData } from '@/lib/api'
import { useLanguage } from '@/lib/i18n'

interface ConditionsBarProps {
  safety?: SafetyCheckResponse | null;
  weather?: WeatherData | null;
}

export function ConditionsBar({ safety, weather }: ConditionsBarProps) {
  const { t } = useLanguage()

  const conditions = safety ? [
    { label: t('sst'), value: weather?.temp || 'N/A', subtitle: t('sst_sub'), icon: ThermometerIcon, iconColor: 'text-blue-500' },
    { label: t('waves'), value: weather?.waves || 'N/A', subtitle: t('waves_sub'), icon: WavesIcon, iconColor: 'text-blue-400' },
    { label: t('wind'), value: weather?.wind || 'N/A', subtitle: t('wind_sub'), icon: WindIcon, iconColor: 'text-gray-500' },
    { label: t('risk'), value: safety.status, subtitle: t('risk_sub'), icon: Alert02Icon, iconColor: safety.status === 'SAFE' ? 'text-green-500' : (safety.status === 'CAUTION' || safety.status === 'SHALLOW_WATER' ? 'text-yellow-500' : 'text-red-500'), valueColor: safety.status === 'SAFE' ? 'text-green-500' : (safety.status === 'CAUTION' || safety.status === 'SHALLOW_WATER' ? 'text-yellow-500' : 'text-red-500') },
  ] : [
    { label: t('sst'), value: '27.4°C', subtitle: t('sst_sub'), icon: ThermometerIcon, iconColor: 'text-blue-500' },
    { label: t('waves'), value: '1.2 m', subtitle: t('waves_sub'), icon: WavesIcon, iconColor: 'text-blue-400' },
    { label: t('wind'), value: '18 km/h', subtitle: t('wind_sub'), icon: WindIcon, iconColor: 'text-gray-500' },
    { label: t('risk'), value: t('loading'), subtitle: t('risk_sub'), icon: Alert02Icon, iconColor: 'text-gray-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-y-4 gap-x-2 md:flex md:items-center md:justify-between w-full h-full">
      {conditions.map((condition, index) => (
        <div key={condition.label} className="flex items-center md:flex-1 min-w-0 h-full">
          <ConditionItem 
            label={condition.label} 
            value={condition.value} 
            subtitle={condition.subtitle}
            icon={condition.icon}
            iconColor={condition.iconColor}
            valueColor={'valueColor' in condition ? condition.valueColor : undefined}
          />
          {index < conditions.length - 1 && (
            <Separator orientation="vertical" className="hidden md:block h-12 bg-border/40 mx-2" />
          )}
        </div>
      ))}
    </div>
  )
}
