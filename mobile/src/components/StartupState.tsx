import { useTheme } from '@/lib/theme'
// 동의 기록 확인과 앱 준비 오류를 빈 화면 대신 복구 가능한 상태로 표시한다.
import { Pressable, Text, View } from 'react-native'
import { LoadingState } from './LoadingState'
import { FirewatchBrand } from './FirewatchBrand'

export function StartupState({ failed = false, onRetry }: { failed?: boolean; onRetry?: () => void }) {
  const { colors } = useTheme()
  if (!failed) return <LoadingState startup message="저장된 이용 설정을 확인하고 있어요" />
  return <View style={{ flex: 1, backgroundColor: colors.canvas, justifyContent: 'center', padding: 28, gap: 20, alignItems: 'center' }}>
    <FirewatchBrand />
    <Text accessibilityRole="header" className="text-2xl font-bold text-ink">{failed ? '앱을 준비하지 못했어요' : 'FireWatch'}</Text>
    <Text accessibilityRole={failed ? 'alert' : 'text'} className="text-center text-base leading-6 text-muted">{failed ? '기록을 지우지 않고 다시 시도할 수 있어요.' : '저장된 이용 설정을 확인하고 있어요.'}</Text>
    {onRetry && <Pressable accessibilityRole="button" onPress={onRetry} className="min-h-12 items-center justify-center rounded-full bg-selection px-6 py-3"><Text className="text-base font-bold text-onselection">다시 시도하기</Text></Pressable>}
  </View>
}
