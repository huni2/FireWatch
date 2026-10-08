import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import tokens from '../../../../shared/design-tokens.json'

const c = tokens.light
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
  const items = [
    { title: '주간 순위', label: '순위', description: '이번 주 순위와 지난 주 우승자', action: onRanking, disabled: false },
    { title: '게임 규칙', label: '규칙', description: '가상 가격·거래·턴의 작동 방식', action: onRules, disabled: false },
    ...(!lobby ? [
      { title: '이 턴 기록 등록', label: '등록', description: '동의한 기록만 닉네임으로 공개', action: onPublish, disabled: !canPublish },
      { title: '지난 턴 복기', label: '복기', description: '내 거래와 가격 변화 다시보기', action: onReplay, disabled: !canReplay },
      { title: '게임 종료', label: '종료', description: '확인 후 현재 기록으로 마무리', action: onEnd, disabled: !canEnd },
    ] : []),
  ]
  return <View style={lobby ? s.lobby : undefined}>
    {lobby && <Image source={require('../../../../shared/assets/firewatch-lobby-scout.png')} accessible={false} style={s.image} resizeMode="contain" />}
    <View style={s.actions}>{items.map(item => <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={item.title}
      accessibilityHint={item.description} accessibilityState={{ disabled: busy || item.disabled }} disabled={busy || item.disabled}
      onPress={item.action} style={[s.button, (busy || item.disabled) && s.disabled]}>
      <Text style={s.label}>{item.label}</Text>
    </Pressable>)}</View>
  </View>
}

const s = StyleSheet.create({
  lobby: { alignItems: 'center', gap: 8 }, image: { width: 164, height: 164 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  button: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.surface },
  label: { color: c.muted, fontSize: 12, fontWeight: '600' }, disabled: { opacity: .4 },
})
