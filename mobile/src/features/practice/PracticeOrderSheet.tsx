import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ThemeSurface, useTheme } from '@/lib/theme'

export function PracticeOrderSheet({ open, busy, error, close, footer, children }: {
  open: boolean; busy: boolean; error: string | null; close: () => void; footer: ReactNode; children: ReactNode
}) {
  const { colors } = useTheme()
  return <Modal visible={open} transparent animationType="slide" onRequestClose={() => { if (!busy) close() }}>
    <ThemeSurface><View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.35)' }}>
      <SafeAreaView style={{ height: '90%', backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }}>
            <Text accessibilityRole="header" style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>가상 거래 주문</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="주문 입력 닫기" disabled={busy} onPress={close} style={{ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.text }}>닫기</Text></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {children}
            {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error} · 입력은 그대로 있어요.</Text>}
          </ScrollView>
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>{footer}</View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View></ThemeSurface>
  </Modal>
}
