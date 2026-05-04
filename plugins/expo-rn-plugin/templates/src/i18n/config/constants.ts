import type { Locale } from 'expo-localization'

const locales: Record<string, string> = {
  en: 'English',
}

const defaultFallbackLocale: Locale['languageTag'] = 'en'

export { locales, defaultFallbackLocale }
