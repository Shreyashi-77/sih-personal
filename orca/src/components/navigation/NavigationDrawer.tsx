
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { ProfileSection } from './ProfileSection'
import { NavigationMenu } from './NavigationMenu'

interface NavigationDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate?: (page: string) => void
  user: { fullName: string; username: string }
}

export function NavigationDrawer({ open, onOpenChange, onNavigate, user }: NavigationDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[83vw] max-w-[400px] p-0 flex flex-col border-r shadow-2xl"
        style={{
          backgroundColor: 'var(--drawer-bg, rgba(255, 255, 255, 0.4))',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)'
        }}
      >
        {/* Visually hidden title for accessibility */}
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

        {/* Profile */}
        <ProfileSection user={user} />

        {/* Nav items — flex-1 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <NavigationMenu 
            onNavigate={(page) => {
              onNavigate?.(page)
              onOpenChange(false)
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
