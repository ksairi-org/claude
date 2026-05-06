import { useFonts } from 'expo-font'
import { createFont } from 'tamagui'

// Replace with your app's font assets
// e.g. import { DMSans_400Regular } from '@expo-google-fonts/dm-sans'
export const fontAssets: Parameters<typeof useFonts>[0] = {}

const bodyFont = createFont({
  family: 'System',
  size: { 1: 12, 2: 14, 3: 16, 4: 18, 5: 20, 6: 24, 7: 28, 8: 32, 9: 36, 10: 48 },
  lineHeight: { 1: 16, 2: 20, 3: 24, 4: 28, 5: 32, 6: 36, 7: 40, 8: 48, 9: 56, 10: 64 },
  weight: { 4: '400', 5: '500', 7: '700' },
  letterSpacing: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 },
  face: {
    '400': { normal: 'System' },
    '500': { normal: 'System' },
    '700': { normal: 'System' },
  },
})

export const fonts = {
  heading: bodyFont,
  body: bodyFont,
}
