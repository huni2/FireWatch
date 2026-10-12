// FCM(Expo Push Service) 토큰 등록 + 알림 탭 시 홈으로 이동. Design Ref: mobile-app.design.md §2.2.
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { Platform } from 'react-native'

import { updateSettings } from '@/lib/api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

// 사용자가 설정에서 알림 등록을 선택했을 때만 권한·토큰을 요청한다.
export async function registerPushToken(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  const existing = await Notifications.getPermissionsAsync()
  const granted = existing.granted ? existing : await Notifications.requestPermissionsAsync()
  if (!granted.granted) return false

  // EAS 프로젝트가 연결돼 있어야 발급된다 — 없으면 `npx eas init`으로 한 번 연결 필요(README 참고).
  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  if (!projectId) {
    throw new Error('이 설치본의 알림 설정을 확인해야 해요.')
  }

  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId })
  await updateSettings({
    fcmToken: expoPushToken,
  })
  await SecureStore.setItemAsync('firewatch-push-token', expoPushToken)
  return true
}

export async function hasRegisteredPush(): Promise<boolean> { return Boolean(await SecureStore.getItemAsync('firewatch-push-token')) }

export async function unregisterPushToken(): Promise<void> {
  let token = await SecureStore.getItemAsync('firewatch-push-token')
  if (!token) {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
    if (!projectId) throw new Error('이 기기의 알림 등록 정보를 확인하지 못했어요.')
    // Read the existing device token without requesting permission again. If it cannot
    // be resolved, do not claim the server subscription was removed.
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
  }
  if (token) await updateSettings({ removeFcmToken: token })
  await SecureStore.deleteItemAsync('firewatch-push-token')
}


export function useNotificationRegistration() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/')
    })
    return () => subscription.remove()
  }, [])
}
