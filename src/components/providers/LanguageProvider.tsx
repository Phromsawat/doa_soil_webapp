"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { translations, Language, TranslationKey } from '@/lib/TH_ENG'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('th')
  const [mounted, setMounted] = useState(false)

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('app_language') as Language
    if (savedLang && (savedLang === 'th' || savedLang === 'en')) {
      setLanguage(savedLang)
    }
    setMounted(true)
  }, [])

  // Update HTML lang and classes when language changes
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = language
      if (language === 'en') {
        document.documentElement.classList.add('lang-en')
      } else {
        document.documentElement.classList.remove('lang-en')
      }
    }
  }, [language, mounted])

  // Save to localStorage when language changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('app_language', language)
    }
  }, [language, mounted])

  const t = (key: TranslationKey): string => {
    return translations[language][key] || key
  }

  // Prevent hydration mismatch by not rendering anything until mounted
  if (!mounted) {
    return null
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
