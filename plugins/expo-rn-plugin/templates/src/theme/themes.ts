import { defaultConfig } from '@tamagui/config/v5'

export const lightTheme = {
  ...defaultConfig.themes.light,
} as typeof defaultConfig.themes.light

export const darkTheme = {
  ...defaultConfig.themes.dark,
} as typeof defaultConfig.themes.dark

const splashTokens = {
  light: { splashBackground: '#ffffff' },
  dark:  { splashBackground: '#000000' },
}

export const themes = {
  light: { ...lightTheme, ...splashTokens.light },
  dark:  { ...darkTheme,  ...splashTokens.dark  },
}
