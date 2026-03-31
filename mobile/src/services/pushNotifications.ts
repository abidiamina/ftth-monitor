import { useEffect } from 'react'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { updatePushToken } from './authApi'
import type { CurrentUser } from '../types/auth'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

const getProjectId = () => {
  const easProjectId = Constants?.expoConfig?.extra?.eas?.projectId
  const runtimeProjectId = Constants?.easConfig?.projectId

  return easProjectId ?? runtimeProjectId ?? null
}

export const registerForPushNotificationsAsync = async () => {
  if (!Device.isDevice) {
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    return null
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    })
  }

  const projectId = getProjectId()

  if (!projectId) {
    return null
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId })
  return token.data
}

export const usePushNotificationsRegistration = (
  user: CurrentUser | null,
  isAuthenticated: boolean
) => {
  useEffect(() => {
    if (!isAuthenticated || !user || !['CLIENT', 'TECHNICIEN'].includes(user.role)) {
      return
    }

    let cancelled = false

    const syncPushToken = async () => {
      try {
        const token = await registerForPushNotificationsAsync()

        if (!token || cancelled || user.pushToken === token) {
          return
        }

        await updatePushToken(token)
      } catch (error) {
        console.warn('Impossible de synchroniser le token push.', error)
      }
    }

    void syncPushToken()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user])
}
