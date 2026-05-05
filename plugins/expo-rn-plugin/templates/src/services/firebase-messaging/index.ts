import { getMessaging, AuthorizationStatus } from '@react-native-firebase/messaging'
import { getApp } from '@react-native-firebase/app'
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

const messaging = getMessaging(getApp())

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await ExpoNotifications.requestPermissionsAsync()
  if (status !== 'granted') return false
  const authStatus = await messaging.requestPermission()
  return (
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL
  )
}

export async function getFCMToken(): Promise<string | null> {
  try {
    return await messaging.getToken()
  } catch {
    return null
  }
}

export function subscribeToForegroundMessages(
  onMessage: (title: string, body: string) => void,
): () => void {
  return messaging.onMessage(async (remoteMessage) => {
    onMessage(
      remoteMessage.notification?.title ?? 'App',
      remoteMessage.notification?.body ?? '',
    )
  })
}
