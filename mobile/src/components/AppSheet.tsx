import { type ComponentProps, type ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Platform, ScrollView, TextInput, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ThemeSurface, useTheme } from '@/lib/theme'
import { toastConfig } from '@/lib/toastConfig'
import { ModalHeader } from './ModalHeader'

// A bounded native panel keeps reading and form scrolling independent of drag gestures.
export function AppSheet({ open, title, close, disabled = false, height = '85%', footer, children }: {
  open: boolean; title: string; close(): void; disabled?: boolean; height?: string; footer?: ReactNode; children: ReactNode
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const dismiss = () => { if (!disabled) close() }
  const requested = Number.parseFloat(height)
  const panelHeight = `${Number.isFinite(requested) ? Math.min(100, Math.max(40, requested)) : 85}%` as `${number}%`
  if (!open) return null
  return <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={dismiss}>
    <GestureHandlerRootView style={{ flex: 1 }}><ThemeSurface>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', paddingTop: insets.top, backgroundColor: '#00000059' }}>
        <View accessibilityViewIsModal style={{ height: panelHeight, minHeight: 0, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingBottom: Math.max(12, insets.bottom) }}>
          <ModalHeader title={title} close={dismiss} disabled={disabled} />
          <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
          {footer && <ScrollView style={{ flexGrow: 0, flexShrink: 1, maxHeight: '40%', borderTopWidth: 1, borderTopColor: colors.border }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>{footer}</ScrollView>}
        </View>
      </KeyboardAvoidingView>
      <Toast config={toastConfig} topOffset={insets.top + 12} />
    </ThemeSurface></GestureHandlerRootView>
  </Modal>
}

// Every sheet body owns a bounded scrolling area; headers and footers stay outside it.
// The panel never moves in response to a body swipe.
export function AppSheetScrollView({ style, contentContainerStyle, ...props }: ComponentProps<typeof ScrollView>) {
  return <ScrollView {...props} style={[{ flex: 1, minHeight: 0 }, style]} nestedScrollEnabled keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator keyboardDismissMode="on-drag"
    contentContainerStyle={[{ padding: 20, gap: 20, paddingBottom: 48 }, contentContainerStyle]} />
}

export const AppSheetTextInput = TextInput
