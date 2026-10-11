import { useTheme, type ThemeColors } from '@/lib/theme'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { FirewatchIcon } from '../../components/FirewatchIcon'

interface Props {
  lobby?: boolean
  busy: boolean
  canPublish?: boolean
  canReplay?: boolean
  canEnd?: boolean
  onRules: () => void
  onRanking: () => void
  onPublish: () => void
  onReplay: () => void
  onEnd: () => void
}

export function PracticeMenu({ lobby, busy, canPublish, canReplay, canEnd, onRules, onRanking, onPublish, onReplay, onEnd }: Props) {
  const { colors: c } = useTheme()
  const s = createStyles(c)

  const items = [
    { title: '주간 순위', label: '순위', icon: 'rankings' as const, description: '이번 주 순위와 지난 주 우승자', action: onRanking, disabled: false },
    { title: '게임 규칙', label: '규칙', icon: 'rules' as const, description: '가상 가격·거래·턴의 작동 방식', action: onRules, disabled: false },
    ...(!lobby ? [
      { title: '완주 기록 등록', label: '등록', icon: 'publish' as const, description: '동의한 기록만 닉네임으로 공개', action: onPublish, disabled: !canPublish },
      { title: '지난 턴 복기', label: '복기', icon: 'replay' as const, description: '내 거래와 가격 변화 다시보기', action: onReplay, disabled: !canReplay },
      { title: '게임 종료', label: '종료', icon: 'exit' as const, description: '확인 후 현재 기록으로 마무리', action: onEnd, disabled: !canEnd },
    ] : []),
  ]
  return <View style={lobby ? s.lobby : undefined}>
    <View style={s.actions}>{items.filter(item => lobby || item.title === '주간 순위' || item.title === '지난 턴 복기' || (item.title === '완주 기록 등록' && canPublish)).map(item => <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={item.title}
      accessibilityHint={item.description} accessibilityState={{ disabled: busy || item.disabled }} disabled={busy || item.disabled}
      onPress={item.action} style={[s.button, (busy || item.disabled) && s.disabled]}>
      <FirewatchIcon name={item.icon} size={18} color={c.muted} /><Text style={s.label}>{item.label}</Text>
    </Pressable>)}{!lobby && <Pressable accessibilityRole="button" accessibilityLabel="게임 더보기" disabled={busy} onPress={() => Alert.alert('게임 도구', '필요한 항목을 선택해주세요.', [{ text: '게임 규칙', onPress: onRules }, ...(canEnd ? [{ text: '이번 게임 마무리', style: 'destructive' as const, onPress: onEnd }] : []), { text: '닫기', style: 'cancel' }])} style={s.button}><FirewatchIcon name="more" size={18} color={c.muted} /><Text style={s.label}>더보기</Text></Pressable>}</View>
  </View>
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  lobby: { alignItems: 'center', gap: 8 }, image: { width: 164, height: 164 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  button: { minHeight: 44, minWidth: 44, paddingHorizontal: 7, flexDirection: 'row', gap: 4, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.surface },
  label: { color: c.muted, fontSize: 12, fontWeight: '600' }, disabled: { opacity: .4 },
})
