import analytics from '@react-native-firebase/analytics'

export async function logScreenView(screenName: string) {
  await analytics().logScreenView({ screen_name: screenName, screen_class: screenName })
}
