import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useTheme } from '@/lib/theme'

export function ActionButton({ label, onPress, disabled = false, busy, tone = 'secondary', fullWidth = false, icon }: {
  label: string; onPress(): void; disabled?: boolean; busy?: boolean; tone?: 'primary' | 'secondary' | 'next'; fullWidth?: boolean; icon?: ReactNode
}) {
  const { colors: c } = useTheme()
  const inactive = disabled && !busy
  const foreground = inactive ? c.muted : tone === 'secondary' ? c.text : c.actionText
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
    android_ripple={{ color: tone === 'secondary' || inactive ? c.border : '#FFE2CD' }}
    style={{ minHeight: 48, maxWidth: '100%', flexShrink: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, overflow: 'hidden', alignSelf: fullWidth ? 'stretch' : 'flex-start', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: tone === 'secondary' || inactive ? 1 : 0, borderColor: c.border, backgroundColor: inactive ? c.canvas : tone === 'secondary' ? c.surface : c.actionBackground }}>
    {(busy !== undefined || icon) && <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>{busy ? <ActivityIndicator size="small" color={foreground} /> : icon}</View>}
    <Text style={{ fontSize: 15, fontWeight: '600', lineHeight: 22, textAlign: 'center', color: foreground, flexShrink: 1 }}>{label}</Text>
  </Pressable>
}
