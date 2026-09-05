import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import fr from './fr.json'
import en from './en.json'

export type Language = 'fr' | 'en'
type Params = Record<string, string | number>
type Catalog = Record<string, string>

export const LANGUAGE_STORAGE_KEY = 'mbf.language'
const catalogs: Record<Language, Catalog> = { fr, en }
// Preserve the historic formatter behaviour before React mounts. The provider
// synchronously sets the real phone/persisted language before rendering its children.
let activeLanguage: Language = 'fr'

export function languageFromLocale(locale: string | undefined): Language {
  return locale?.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export function resolveLanguage(saved: string | null | undefined, locale: string | undefined): Language {
  return saved === 'fr' || saved === 'en' ? saved : languageFromLocale(locale)
}

export function initialLanguage(): Language {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(LANGUAGE_STORAGE_KEY) : null
  return resolveLanguage(saved, typeof navigator === 'undefined' ? undefined : navigator.language)
}

export function getActiveLanguage(): Language {
  return activeLanguage
}

export function getActiveLocale(): string {
  return activeLanguage === 'fr' ? 'fr-FR' : 'en-US'
}

function interpolate(value: string, params?: Params): string {
  if (!params) return value
  return value.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => params[key] === undefined ? match : String(params[key]))
}

export function translate(language: Language, key: string, params?: Params): string {
  const value = catalogs[language][key] ?? catalogs.en[key] ?? key
  return interpolate(value, params)
}

const frenchToKey = new Map<string, string>()
for (const [key, value] of Object.entries(fr)) {
  if (!value.includes('{')) frenchToKey.set(value, key)
}

export function translateSource(language: Language, source: string): string {
  if (language === 'fr') return source
  const key = frenchToKey.get(source)
  return key ? translate(language, key) : source
}

export function paymentLabel(language: Language, value: string): string {
  const key: Record<string, string> = {
    especes: 'payment.cash',
    wave: 'payment.wave',
    orange_money: 'payment.orange',
    mtn_momo: 'payment.mtn',
    banque: 'payment.bank',
    autre: 'payment.other',
  }
  return translate(language, key[value] ?? 'payment.other')
}

export function scoreText(language: Language, key: string, kind: 'label' | 'detail' | 'advice', fallback: string): string {
  return catalogs[language][`score.${key}.${kind}`] ?? fallback
}

export function currencyText(language: Language, code: string, kind: 'currency' | 'region', fallback: string): string {
  return catalogs[language][`${kind}.${code}`] ?? fallback
}

type I18nContextValue = {
  language: Language
  locale: string
  setLanguage: (language: Language) => void
  t: (key: string, params?: Params) => string
  tr: (source: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => initialLanguage())
  activeLanguage = language

  useEffect(() => {
    activeLanguage = language
    document.documentElement.lang = language === 'fr' ? 'fr' : 'en'
  }, [language])

  const value = useMemo<I18nContextValue>(() => ({
    language,
    locale: language === 'fr' ? 'fr-FR' : 'en-US',
    setLanguage(next) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
      activeLanguage = next
      setLanguageState(next)
    },
    t: (key, params) => translate(language, key, params),
    tr: (source) => translateSource(language, source),
  }), [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}
