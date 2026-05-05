import { getAnalytics, logEvent } from '@react-native-firebase/analytics'
import { getApp } from '@react-native-firebase/app'

const analytics = getAnalytics(getApp())

export async function logScreenView(screenName: string) {
  await logEvent(analytics, 'screen_view', { screen_name: screenName, screen_class: screenName })
}
