import { ThemeProvider, useTheme } from '@/lib/theme'
import '../global.css'

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { Stack, usePathname, type ErrorBoundaryProps } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { AppReadiness } from '@/lib/appReadiness'
import { LoadingState } from '@/components/LoadingState'
import { ThemeToggle } from '@/components/ThemeToggle'
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
  const { colors } = useTheme()
  useNotificationRegistration()
  const [ready, setReady] = useState(false)
  const pathname = usePathname()
  const markReady = useCallback(() => setReady(true), [])
  const preparation = useMemo(() => ({ markReady, preparing: !ready && pathname === '/' }), [markReady, ready, pathname])

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onTouchStart={noteStartupInteraction}>
      <AppReadiness.Provider value={preparation}><View style={{ flex: 1 }} importantForAccessibility={preparation.preparing ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={preparation.preparing}><BottomSheetModalProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.accentSoft },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '800' },
            contentStyle: { backgroundColor: colors.canvas },
            headerShadowVisible: false,
            headerRight: () => <ThemeToggle />,
          }}
        >
          <Stack.Screen name="index" options={{ title: 'FireWatch' }} />
          <Stack.Screen name="settings" options={{ title: '설정' }} />
          <Stack.Screen name="community" options={{ title: '공지·의견 보내기' }} />
          <Stack.Screen name="privacy" options={{ title: '개인정보처리방침' }} />
          <Stack.Screen name="guide" options={{ title: '도움말' }} />
          <Stack.Screen name="investment-info" options={{ title: '투자 정보 이용안내' }} />
        </Stack>
      </BottomSheetModalProvider></View></AppReadiness.Provider>
      <Toast config={toastConfig} />
      {ready && <AnnouncementPopup />}
      {!ready && pathname === '/' && <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 1000 }}><LoadingState startup message="내 투자 기록을 준비하고 있어요" /></View>}
    </GestureHandlerRootView>
  )
}

export default function RootLayout() {
  return <ThemeProvider><RootContent /></ThemeProvider>
}

function RootContent() {
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
