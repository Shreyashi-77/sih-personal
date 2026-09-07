import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement } from '@hugeicons/react'

interface NavigationItemProps {
  icon: IconSvgElement
  label: string
  onClick?: () => void
}

export function NavigationItem({ icon, label, onClick }: NavigationItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full h-12 px-4 text-left
                 text-foreground/80 hover:text-foreground hover:bg-accent
                 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px]
                 active:bg-accent/80 transition-colors rounded-md"
    >
      <HugeiconsIcon icon={icon} size={20} className="shrink-0" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
