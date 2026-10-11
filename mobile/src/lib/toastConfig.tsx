import type { ComponentProps } from 'react'
import { BaseToast, type ToastConfig } from 'react-native-toast-message'
import { useTheme } from './theme'
function ThemedToast({ tone, ...props }: ComponentProps<typeof BaseToast> & { tone: 'success' | 'error' | 'info' }) {
  const { colors } = useTheme()
  return <BaseToast {...props} style={{ backgroundColor: colors.surface, borderLeftColor: tone === 'error' ? colors.danger : colors.accent }} text1Style={{ color: colors.text }} text2Style={{ color: colors.muted }} />
}
export const toastConfig: ToastConfig = {
  success: props => <ThemedToast {...props} tone="success" />,
  error: props => <ThemedToast {...props} tone="error" />,
  info: props => <ThemedToast {...props} tone="info" />,
}
