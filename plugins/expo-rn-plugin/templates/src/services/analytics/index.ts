import { getAnalytics } from '@react-native-firebase/analytics'
import { getApp } from '@react-native-firebase/app'

const analytics = getAnalytics(getApp())

export async function logScreenView(screenName: string) {
  await analytics.logEvent('screen_view', { screen_name: screenName, screen_class: screenName })
}
