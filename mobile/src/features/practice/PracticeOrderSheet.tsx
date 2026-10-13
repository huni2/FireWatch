import { AppSheet, AppSheetScrollView } from '@/components/AppSheet'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { useTheme } from '@/lib/theme'

export function PracticeOrderSheet({ open, busy, error, close, footer, children }: {
  open: boolean; busy: boolean; error: string | null; close: () => void; footer: ReactNode; children: ReactNode
}) {
  const { colors } = useTheme()
  return <AppSheet open={open} title="가상 거래 주문" close={close} disabled={busy} height="90%" footer={footer}>
          <AppSheetScrollView contentContainerStyle={{ paddingHorizontal: 16 }}>
            {children}
            {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error} · 입력은 그대로 있어요.</Text>}
          </AppSheetScrollView>
  </AppSheet>
}
