import tokens from '../../../shared/design-tokens.json'
import '../global.css'

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { Stack, type ErrorBoundaryProps } from 'expo-router'
import { useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import Toast from 'react-native-toast-message'

import { ConsentScreen } from '@/features/consent/ConsentScreen'
import { useNotificationRegistration } from '@/features/notifications/hooks/useNotificationRegistration'
import { hasConsented, setConsented } from '@/lib/consent'
import { toastConfig } from '@/lib/toastConfig'
import { AnnouncementPopup, noteStartupInteraction } from '@/components/AnnouncementPopup'
import { StartupState } from '@/components/StartupState'

// 화면 렌더 오류는 복구 화면으로 전환한다. 네이티브 프로세스 종료는 이 경계로 잡을 수 없다.
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <StartupState failed onRetry={() => { void retry() }} />
}

// 동의 후에는 알림 탭 리스너만 연결한다. 권한·토큰 등록은 설정에서 사용자가 선택한다.
function AppContent() {
  useNotificationRegistration()

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onTouchStart={noteStartupInteraction}>
      <BottomSheetModalProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: tokens.light.surface },
            headerTintColor: tokens.light.text,
            headerTitleStyle: { fontWeight: '800' },
            contentStyle: { backgroundColor: tokens.light.canvas },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ title: 'FireWatch' }} />
          <Stack.Screen name="settings" options={{ title: '설정' }} />
          <Stack.Screen name="community" options={{ title: '공지·의견 보내기' }} />
          <Stack.Screen name="privacy" options={{ title: '개인정보처리방침' }} />
          <Stack.Screen name="guide" options={{ title: '도움말' }} />
          <Stack.Screen name="investment-info" options={{ title: '투자 정보 이용안내' }} />
        </Stack>
      </BottomSheetModalProvider>
      <Toast config={toastConfig} />
      <AnnouncementPopup />
    </GestureHandlerRootView>
  )
}

export default function RootLayout() {
  const [consented, setConsentState] = useState<boolean | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    hasConsented().then(value => { if (active) setConsentState(value) }).catch(() => { if (active) setLoadError(true) })
    return () => { active = false }
  }, [attempt])

  if (loadError) return <StartupState failed onRetry={() => { setLoadError(false); setAttempt(value => value + 1) }} />
  if (consented === null) return <StartupState />
  if (!consented) {
    return (
      <ConsentScreen
        onAgree={async () => {
          await setConsented()
          setConsentState(true)
        }}
      />
    )
  }

  return <AppContent />
}
