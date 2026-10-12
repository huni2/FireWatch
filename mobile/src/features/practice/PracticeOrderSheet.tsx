import { AppSheet } from '@/components/AppSheet'
import type { ReactNode } from 'react'
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native'
import { useTheme } from '@/lib/theme'

export function PracticeOrderSheet({ open, busy, error, close, footer, children }: {
  open: boolean; busy: boolean; error: string | null; close: () => void; footer: ReactNode; children: ReactNode
}) {
  const { colors } = useTheme()
  return <AppSheet open={open} title="가상 거래 주문" close={close} disabled={busy} height="90%">
        <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {children}
            {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error} · 입력은 그대로 있어요.</Text>}
          </ScrollView>
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>{footer}</View>
        </KeyboardAvoidingView>
  </AppSheet>
}
