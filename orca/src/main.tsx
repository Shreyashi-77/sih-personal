import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { ThemeProvider } from './components/theme-provider'
import { LanguageProvider } from '@/lib/i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ThemeProvider defaultTheme="system" storageKey="orca-theme">
        <App />
      </ThemeProvider>
    </LanguageProvider>
  </StrictMode>,
)
