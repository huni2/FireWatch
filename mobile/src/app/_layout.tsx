import '../global.css'

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { useNotificationRegistration } from '@/features/notifications/hooks/useNotificationRegistration'

export default function RootLayout() {
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
    </GestureHandlerRootView>
  )
}
