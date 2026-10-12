import type { ComponentProps } from 'react'
import { useWindowDimensions } from 'react-native'
import { BaseToast, type ToastConfig } from 'react-native-toast-message'
import { useTheme } from './theme'
function ThemedToast({ tone, ...props }: ComponentProps<typeof BaseToast> & { tone: 'success' | 'error' | 'info' }) {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  return <BaseToast {...props} style={{ width: Math.min(440, Math.max(0, width - 32)), backgroundColor: colors.surface, borderLeftWidth: 0, height: 'auto', minHeight: 64, paddingVertical: 12 }} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 16 }} text1NumberOfLines={0} text2NumberOfLines={0} text1Style={{ fontSize: 15, lineHeight: 22, color: tone === 'error' ? colors.danger : colors.text, textAlign: 'center' }} text2Style={{ fontSize: 14, lineHeight: 22, color: colors.muted, textAlign: 'center' }} />
}
export const toastConfig: ToastConfig = {
  success: props => <ThemedToast {...props} tone="success" />,
  error: props => <ThemedToast {...props} tone="error" />,
  info: props => <ThemedToast {...props} tone="info" />,
}
