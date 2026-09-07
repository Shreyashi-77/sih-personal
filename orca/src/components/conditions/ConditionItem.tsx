import { HugeiconsIcon } from '@hugeicons/react'

interface ConditionItemProps {
  label: string
  value: string
  subtitle: string
  icon: any
  iconColor: string
  valueColor?: string
}

export function ConditionItem({ label, value, subtitle, icon, iconColor, valueColor = "text-foreground" }: ConditionItemProps) {
  return (
    <div className="flex items-center gap-4 px-2 min-w-0 flex-1 hover:bg-accent/10 transition-colors rounded-xl cursor-default">
      {/* Icon */}
      <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-background shrink-0 shadow-sm border border-border/40 ${iconColor}`}>
        <HugeiconsIcon icon={icon} size={20} />
      </div>

      {/* Text Content */}
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] font-semibold text-muted-foreground/90 leading-tight truncate">
          {label}
        </span>
        <span className={`text-[22px] font-bold tracking-tight leading-tight truncate ${valueColor}`}>
          {value}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground/60 leading-tight truncate mt-0.5">
          {subtitle}
        </span>
      </div>
    </div>
  )
}
