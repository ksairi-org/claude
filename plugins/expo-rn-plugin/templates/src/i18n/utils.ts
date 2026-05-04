import { i18n } from '@lingui/core'
import type { Messages } from '@lingui/core'
import type { Locale } from 'expo-localization'
import { defaultFallbackLocale, locales } from './config/constants'

function isI18nLocale(value: string | null | undefined): value is Locale['languageTag'] {
  return value ? Object.keys(locales).includes(value) : false
}

export function setI18nLocale(locale: string) {
  const validLocale = isI18nLocale(locale) ? locale : defaultFallbackLocale
  const { messages } = require(`./locales/compiled/${validLocale}`) as { messages: Messages }
  i18n.loadAndActivate({ locale: validLocale, messages })
}
