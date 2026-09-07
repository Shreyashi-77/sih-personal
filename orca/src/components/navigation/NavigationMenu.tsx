import {
  Home01Icon,
  Location01Icon,
  Settings01Icon,
  Notification01Icon,
  Logout02Icon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { NavigationItem } from './NavigationItem'
import { useLanguage } from '@/lib/i18n'

interface NavItem {
  id: string
  label: string
  icon: IconSvgElement
  action?: () => void
}

const navigationItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home01Icon },
  { id: 'navigation', label: 'Navigation', icon: Location01Icon },
  { id: 'alerts', label: 'Alerts', icon: Notification01Icon },
  { id: 'settings', label: 'Settings', icon: Settings01Icon },
  { id: 'logout', label: 'Logout', icon: Logout02Icon },
]

export function NavigationMenu({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { t } = useLanguage()

  return (
    <nav className="flex flex-col gap-0.5 p-2">
      {navigationItems.map((item) => (
        <NavigationItem
          key={item.id}
          icon={item.icon}
          label={t(item.label.toLowerCase())}
          onClick={() => {
            item.action?.()
            onNavigate?.(item.id)
          }}
        />
      ))}
    </nav>
  )
}
