import messaging from '@react-native-firebase/messaging'
import * as ExpoNotifications from 'expo-notifications'

ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await ExpoNotifications.requestPermissionsAsync()
  if (status !== 'granted') return false
  const authStatus = await messaging().requestPermission()
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  )
}

export async function getFCMToken(): Promise<string | null> {
  try {
    return await messaging().getToken()
  } catch {
    return null
  }
}

export function subscribeToForegroundMessages(
  onMessage: (title: string, body: string) => void,
): () => void {
  return messaging().onMessage(async (remoteMessage) => {
    onMessage(
      remoteMessage.notification?.title ?? 'App',
      remoteMessage.notification?.body ?? '',
    )
  })
}
