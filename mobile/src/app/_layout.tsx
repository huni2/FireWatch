import '../global.css'

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import Toast from 'react-native-toast-message'

import { ConsentScreen } from '@/features/consent/ConsentScreen'
import { useNotificationRegistration } from '@/features/notifications/hooks/useNotificationRegistration'
import { hasConsented, setConsented } from '@/lib/consent'
import { toastConfig } from '@/lib/toastConfig'

// 동의 전에는 푸시 토큰 등록(서버로 데이터 전송)도 일어나면 안 되므로, useNotificationRegistration은
// 동의 후에만 마운트되는 이 컴포넌트 안에서 호출한다(Hooks 규칙상 조건부 호출이 아니라 조건부 마운트).
function AppContent() {
  useNotificationRegistration()

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#00754A' },
            headerTintColor: '#ffffff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'FireWatch' }} />
          <Stack.Screen name="settings" options={{ title: '설정' }} />
        </Stack>
      </BottomSheetModalProvider>
      <Toast config={toastConfig} />
    </GestureHandlerRootView>
  )
}

export default function RootLayout() {
  const [consented, setConsentState] = useState<boolean | null>(null)

  useEffect(() => {
    hasConsented().then(setConsentState)
  }, [])

  if (consented === null) return null
  if (!consented) {
    return (
      <ConsentScreen
        onAgree={() => {
          setConsented()
          setConsentState(true)
        }}
      />
    )
  }

  return <AppContent />
}
