import { Pressable, Text, View } from 'react-native'
import { useTheme } from '@/lib/theme'
import tokens from '../../../shared/design-tokens.json'

// One selection treatment for screen views and filter choices, including large text.
// tone="game"은 투자연습(가상투자) 화면 전용 — 실자산 화면의 primary(인디고)와 섞이지 않게 game(보라) 틴트를 쓴다.
export function ChoiceTabs<T extends string>({ options, value, onChange, label, disabled = false, tone = 'primary' }: {
  options: readonly { value: T; label: string }[]; value: T; onChange(value: T): void; label: string; disabled?: boolean; tone?: 'primary' | 'game'
}) {
  const { colors } = useTheme()
  const selectedBg = tone === 'game' ? colors.gameSoft : colors.primarySoft
  return <View accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4, borderRadius: tokens.radius, backgroundColor: colors.surface }}>
    {options.map(option => <Pressable key={option.value} accessibilityRole="tab" aria-selected={value === option.value} accessibilityLabel={option.label} accessibilityState={{ selected: value === option.value, disabled }} disabled={disabled}
      onPress={() => onChange(option.value)} style={{ flexGrow: 1, flexBasis: 80, minHeight: 48, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: value === option.value ? selectedBg : 'transparent' }}>
      <Text style={{ color: colors.text, fontSize: tokens.typography.body, fontWeight: value === option.value ? '700' : '500', textAlign: 'center' }}>{option.label}</Text>
    </Pressable>)}
  </View>
}
