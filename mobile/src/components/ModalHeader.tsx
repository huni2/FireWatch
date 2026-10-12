import { Pressable, Text, View } from 'react-native'
import { useTheme } from '@/lib/theme'

export function ModalHeader({ title, close, disabled = false, closeLabel = `${title} 닫기`, closeHint }: {
  title: string; close(): void; disabled?: boolean; closeLabel?: string; closeHint?: string
}) {
  const { colors } = useTheme()
  return <View style={{ paddingHorizontal: 20, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
    <Text accessibilityRole="header" style={{ flex: 1, color: colors.text, fontSize: 20, fontWeight: '700', lineHeight: 28 }}>{title}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} accessibilityHint={closeHint} accessibilityState={{ disabled }} disabled={disabled} onPress={close}
      style={({ pressed }) => ({ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', opacity: disabled ? .4 : pressed ? .65 : 1 })}>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>닫기</Text>
    </Pressable>
  </View>
}
