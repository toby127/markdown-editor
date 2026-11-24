import { createContext, useContext } from 'react'
import { t, type ResolvedLanguage, type TranslationKey } from '../shared/i18n'

/** Default zh keeps all existing component tests (which assert Chinese) unchanged. */
export const LanguageContext = createContext<ResolvedLanguage>('zh')

export function useT(): (key: TranslationKey, params?: Record<string, string | number>) => string {
  const lang = useContext(LanguageContext)
  return (key, params) => t(key, lang, params)
}

export function useLanguage(): ResolvedLanguage {
  return useContext(LanguageContext)
}
