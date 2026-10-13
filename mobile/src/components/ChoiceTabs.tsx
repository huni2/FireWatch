import { Pressable, Text, View } from 'react-native'
import { useTheme } from '@/lib/theme'
import tokens from '../../../shared/design-tokens.json'

// One selection treatment for screen views and filter choices, including large text.
export function ChoiceTabs<T extends string>({ options, value, onChange, label, disabled = false }: {
  options: readonly { value: T; label: string }[]; value: T; onChange(value: T): void; label: string; disabled?: boolean
}) {
  const { colors } = useTheme()
  return <View accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4, borderRadius: tokens.radius, backgroundColor: colors.surface }}>
    {options.map(option => <Pressable key={option.value} accessibilityRole="tab" aria-selected={value === option.value} accessibilityLabel={option.label} accessibilityState={{ selected: value === option.value, disabled }} disabled={disabled}
      onPress={() => onChange(option.value)} style={{ flexGrow: 1, flexBasis: 80, minHeight: 48, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: value === option.value ? colors.accentSoft : 'transparent' }}>
      <Text style={{ color: colors.text, fontSize: tokens.typography.body, fontWeight: value === option.value ? '700' : '500', textAlign: 'center' }}>{option.label}</Text>
    </Pressable>)}
  </View>
}
