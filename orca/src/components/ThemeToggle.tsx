import { HugeiconsIcon } from '@hugeicons/react'
import { Sun01Icon, Moon01Icon } from '@hugeicons/core-free-icons'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-11 h-11 rounded-md text-foreground/80 hover:text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring active:bg-accent/80 transition-colors"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      <HugeiconsIcon icon={Sun01Icon} size={22} className="dark:hidden" />
      <HugeiconsIcon icon={Moon01Icon} size={22} className="hidden dark:block" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
