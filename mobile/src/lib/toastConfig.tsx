import type { ComponentProps } from 'react'
import { BaseToast, type ToastConfig } from 'react-native-toast-message'
import { useTheme } from './theme'
function ThemedToast({ tone, ...props }: ComponentProps<typeof BaseToast> & { tone: 'success' | 'error' | 'info' }) {
  const { colors } = useTheme()
  return <BaseToast {...props} style={{ backgroundColor: colors.surface, borderLeftWidth: 0, height: 'auto', minHeight: 64, paddingVertical: 12 }} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 16 }} text1NumberOfLines={3} text2NumberOfLines={5} text1Style={{ color: tone === 'error' ? colors.danger : colors.text, textAlign: 'center' }} text2Style={{ color: colors.muted, textAlign: 'center' }} />
}
export const toastConfig: ToastConfig = {
  success: props => <ThemedToast {...props} tone="success" />,
  error: props => <ThemedToast {...props} tone="error" />,
  info: props => <ThemedToast {...props} tone="info" />,
}
