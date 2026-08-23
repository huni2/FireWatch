// FCM(Expo Push Service) 토큰 등록 + 알림 탭 시 홈으로 이동. Design Ref: mobile-app.design.md §2.2.
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { Platform } from 'react-native'

import { fetchSettings, updateSettings } from '@/lib/api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

async function registerPushToken() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  const existing = await Notifications.getPermissionsAsync()
  const granted = existing.granted ? existing : await Notifications.requestPermissionsAsync()
  if (!granted.granted) return

  // EAS 프로젝트가 연결돼 있어야 발급된다 — 없으면 `npx eas init`으로 한 번 연결 필요(README 참고).
  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  if (!projectId) {
    console.warn('[FireWatch] EAS projectId가 없어 푸시 토큰을 받을 수 없습니다 — npx eas init 필요')
    return
  }

  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId })
  const settings = await fetchSettings()
  await updateSettings({
    pushTime: settings.pushTime,
    interestKeywords: settings.interestKeywords,
    watchedStocks: settings.watchedStocks,
    fcmToken: expoPushToken,
  })
}

export function useNotificationRegistration() {
  useEffect(() => {
    registerPushToken().catch((error: unknown) => {
      console.warn('[FireWatch] 푸시 토큰 등록 실패 — 다음 앱 실행 시 재시도됩니다', error)
    })

    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/')
    })
    return () => subscription.remove()
  }, [])
}
