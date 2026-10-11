import { Pressable, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { useTheme, type ThemePreference } from '@/lib/theme'

export function ThemeSettings() {
  const { preference, saving, setPreference } = useTheme()
  return <View className="gap-3 rounded-2xl bg-surface p-4">
    <Text className="font-bold text-ink">화면 테마</Text>
    <View className="flex-row gap-2">{([['light', '라이트'], ['dark', '다크'], ['system', '기기 설정']] as [ThemePreference, string][]).map(([mode, label]) => <Pressable key={mode} accessibilityRole="radio" aria-checked={preference === mode} accessibilityLabel={`${label} 테마`} accessibilityState={{ checked: preference === mode, disabled: saving }} disabled={saving} onPress={() => { void setPreference(mode).catch(() => Toast.show({ type: 'error', text1: '테마를 저장하지 못했어요', text2: '다시 선택해주세요.' })) }} className={`flex-1 min-h-12 items-center justify-center rounded-xl border ${preference === mode ? 'border-brand bg-canvas' : 'border-line'}`}><Text className={preference === mode ? 'font-semibold text-brand' : 'text-muted'}>{label}</Text></Pressable>)}</View>
    <Text className="text-xs leading-5 text-muted">기본은 라이트예요. 선택한 테마는 이 기기에 저장돼요.</Text>
  </View>
}
