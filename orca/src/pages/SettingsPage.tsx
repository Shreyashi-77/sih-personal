import { useState } from 'react'
import { LanguageSquareIcon, Logout02Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { useLanguage } from '@/lib/i18n'
import { HugeiconsIcon } from '@hugeicons/react'

const languages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी (Hindi)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'te', name: 'తెలుగు (Telugu)' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
]

interface SettingsPageProps {
  onLogout: () => void;
}

export function SettingsPage({ onLogout }: SettingsPageProps) {
  const { language: selectedLang, setLanguage: setSelectedLang, t } = useLanguage()
  const [isLangOpen, setIsLangOpen] = useState(false)

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 pt-0 gap-6 overflow-y-auto min-h-0">
      
      <div className="mb-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('settings')}</h1>
        <p className="text-muted-foreground mt-1">{t('manage_app')}</p>
      </div>

      <div className="flex flex-col gap-4 max-w-2xl">
        
        {/* Language Selection */}
        <div className="rounded-3xl bg-card border border-border/50 shadow-sm overflow-hidden">
          <div 
            className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setIsLangOpen(!isLangOpen)}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <HugeiconsIcon icon={LanguageSquareIcon} size={24} className="text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{t('language')}</h3>
                <p className="text-sm text-muted-foreground">{t('select_language')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium bg-muted px-3 py-1 rounded-full hidden sm:block">
                {languages.find(l => l.code === selectedLang)?.name}
              </span>
              <HugeiconsIcon 
                icon={ArrowRight01Icon} 
                size={20} 
                className={`text-muted-foreground transition-transform duration-300 ${isLangOpen ? 'rotate-90' : ''}`} 
              />
            </div>
          </div>
          
          {/* Dropdown Content */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isLangOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-2 border-t border-border/50 bg-muted/10">
              {languages.map(lang => (
                <div 
                  key={lang.code}
                  className={`px-4 py-3 m-1 rounded-xl cursor-pointer transition-colors flex items-center justify-between
                    ${selectedLang === lang.code ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium' : 'hover:bg-muted/50 text-foreground'}
                  `}
                  onClick={() => {
                    setSelectedLang(lang.code)
                    setIsLangOpen(false)
                  }}
                >
                  {lang.name}
                  {selectedLang === lang.code && (
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Logout */}
        <div 
          className="rounded-3xl bg-card border border-red-500/20 shadow-sm overflow-hidden cursor-pointer hover:bg-red-500/5 transition-colors mt-4"
          onClick={onLogout}
        >
          <div className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <HugeiconsIcon icon={Logout02Icon} size={24} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-red-600 dark:text-red-400">{t('logout')}</h3>
              <p className="text-sm text-muted-foreground">{t('sign_out')}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
