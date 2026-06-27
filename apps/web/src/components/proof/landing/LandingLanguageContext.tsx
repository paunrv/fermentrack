'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { getLandingCopy, type LandingCopy, type LandingLang } from '@/lib/proof/landing-copy'

interface LandingLanguageContextValue {
  lang: LandingLang
  setLang: (lang: LandingLang) => void
  copy: LandingCopy
}

const LandingLanguageContext = createContext<LandingLanguageContextValue | null>(null)

export function LandingLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LandingLang>('es')
  const copy = useMemo(() => getLandingCopy(lang), [lang])

  return (
    <LandingLanguageContext.Provider value={{ lang, setLang, copy }}>
      {children}
    </LandingLanguageContext.Provider>
  )
}

export function useLandingLanguage() {
  const ctx = useContext(LandingLanguageContext)
  if (!ctx) throw new Error('useLandingLanguage must be used within LandingLanguageProvider')
  return ctx
}
