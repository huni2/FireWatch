import '../global.css'

import { Stack } from 'expo-router'

import { useNotificationRegistration } from '@/features/notifications/hooks/useNotificationRegistration'

export default function RootLayout() {
  useNotificationRegistration()

  return (
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
  )
}
