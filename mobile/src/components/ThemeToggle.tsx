import { ActivityIndicator, Pressable } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import Toast from 'react-native-toast-message'
import { useTheme } from '@/lib/theme'

export function ThemeToggle() {
  const { dark, colors, saving, setPreference } = useTheme()
  const label = dark ? '라이트 모드로 바꾸기' : '다크 모드로 바꾸기'
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={`현재 ${dark ? '다크' : '라이트'} 모드예요`} accessibilityState={{ disabled: saving, busy: saving }} disabled={saving}
    onPress={() => { void setPreference(dark ? 'light' : 'dark').catch(() => Toast.show({ type: 'error', text1: '화면 모드를 저장하지 못했어요', text2: '다시 눌러주세요.' })) }}
    style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: pressed ? colors.canvas : 'transparent', opacity: saving ? .6 : 1 })}>
    {saving ? <ActivityIndicator size="small" color={colors.text} /> : <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false} fill="none" stroke={colors.text} strokeWidth={1.8}>
      {dark ? <><Circle cx={12} cy={12} r={4} /><Path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4L19 5" strokeLinecap="round" /></> : <Path d="M20.4 14.4A8.8 8.8 0 0 1 9.6 3.6a8.8 8.8 0 1 0 10.8 10.8Z" strokeLinejoin="round" />}
    </Svg>}
  </Pressable>
}
