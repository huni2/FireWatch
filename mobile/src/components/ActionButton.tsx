import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useTheme } from '@/lib/theme'

export function ActionButton({ label, onPress, disabled = false, busy, tone = 'secondary', fullWidth = false, icon }: {
  label: string; onPress(): void; disabled?: boolean; busy?: boolean; tone?: 'primary' | 'secondary' | 'next'; fullWidth?: boolean; icon?: ReactNode
}) {
  const { colors: c } = useTheme()
  const foreground = tone === 'primary' ? c.onAccent : tone === 'next' ? c.surface : c.text
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignSelf: fullWidth ? 'stretch' : 'flex-start', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: tone === 'secondary' ? 1 : 0, borderColor: c.border, backgroundColor: tone === 'primary' ? c.accent : tone === 'next' ? c.text : c.surface, opacity: disabled && !busy ? .5 : pressed ? .75 : 1 })}>
    {(busy !== undefined || icon) && <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>{busy ? <ActivityIndicator size="small" color={foreground} /> : icon}</View>}
    <Text style={{ fontSize: 15, fontWeight: '600', lineHeight: 22, textAlign: 'center', color: foreground, flexShrink: 1 }}>{label}</Text>
  </Pressable>
}
