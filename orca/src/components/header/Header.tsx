import { HugeiconsIcon } from '@hugeicons/react'
import { FishIcon, Menu01Icon } from '@hugeicons/core-free-icons'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useLanguage } from '@/lib/i18n'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { t } = useLanguage()

  return (
    <header className="flex items-center justify-between h-16 md:h-20 px-4 md:px-8 shrink-0 relative z-40 bg-transparent">
      {/* Left: Hamburger & Logo */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Hamburger — visible everywhere now */}
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center w-10 h-10 rounded-md
                     text-foreground/80 hover:text-foreground hover:bg-accent
                     focus-visible:outline-2 focus-visible:outline-ring
                     active:bg-accent/80 transition-colors"
          aria-label="Open navigation menu"
        >
          <HugeiconsIcon icon={Menu01Icon} size={24} />
        </button>

        <div className="text-primary bg-primary/10 p-1.5 md:p-2 rounded-xl">
          <HugeiconsIcon icon={FishIcon} size={24} className="md:w-7 md:h-7" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg md:text-xl font-bold tracking-widest text-primary leading-tight">
            ORCA
          </h1>
          <span className="hidden sm:inline text-[10px] md:text-xs font-medium text-muted-foreground/80">
            {t('ocean_risk')}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 md:gap-4">

        
        <div className="hidden sm:block w-[1px] h-6 bg-border mx-1 md:mx-2" />
        
        <ThemeToggle />
      </div>
    </header>
  )
}
