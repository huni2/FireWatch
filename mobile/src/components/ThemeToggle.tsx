import { Switch, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import Toast from 'react-native-toast-message'
import { useTheme } from '@/lib/theme'

export function ThemeToggle() {
  const { dark, colors, saving, setPreference } = useTheme()
  return <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 2 }}>
    <Svg width={16} height={16} viewBox="0 0 24 24" accessible={false}>
      <Circle cx={12} cy={12} r={4} fill="none" stroke={dark ? colors.muted : colors.accent} strokeWidth={1.8} />
      <Path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4L19 5" stroke={dark ? colors.muted : colors.accent} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
    <Switch accessibilityLabel="다크 모드" accessibilityHint="왼쪽은 라이트, 오른쪽은 다크 모드예요" aria-checked={dark} value={dark} disabled={saving}
      onValueChange={value => { void setPreference(value ? 'dark' : 'light').catch(() => Toast.show({ type: 'error', text1: '화면 모드를 저장하지 못했어요', text2: '다시 눌러주세요.' })) }}
      trackColor={{ false: colors.border, true: colors.accent }} thumbColor={colors.surface} ios_backgroundColor={colors.border} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }} />
    <Svg width={16} height={16} viewBox="0 0 24 24" accessible={false}>
      <Path d="M20.4 14.4A8.8 8.8 0 0 1 9.6 3.6a8.8 8.8 0 1 0 10.8 10.8Z" fill="none" stroke={dark ? colors.accent : colors.muted} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  </View>
}
