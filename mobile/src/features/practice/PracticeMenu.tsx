import { useState } from 'react'
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
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
  const [open, setOpen] = useState(false)
  const items = [
    { title: '주간 순위', description: '이번 주 순위와 지난 주 우승자', action: onRanking, disabled: false },
    { title: '게임 규칙', description: '가상 가격·거래·턴의 작동 방식', action: onRules, disabled: false },
    ...(!lobby ? [
      { title: '이 턴 기록 등록', description: '동의한 기록만 닉네임으로 공개', action: onPublish, disabled: !canPublish },
      { title: '지난 턴 복기', description: '내 거래와 가격 변화 다시보기', action: onReplay, disabled: !canReplay },
      { title: '게임 종료', description: '확인 후 현재 기록으로 마무리', action: onEnd, disabled: !canEnd },
    ] : []),
  ]
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="게임 메뉴" accessibilityHint="누르면 순위와 규칙 설명을 볼 수 있습니다."
      accessibilityState={{ expanded: open, disabled: busy }} disabled={busy} onPress={() => setOpen(true)}
      style={[s.launcher, lobby ? s.lobby : s.compact, busy && s.disabled]}>
      <Image source={require('../../../../shared/assets/firewatch-lobby-scout.png')} accessible={false} style={lobby ? s.largeImage : s.smallImage} resizeMode="contain" />
      <Text style={s.caption}>{lobby ? '순위·규칙 보기' : '메뉴'}</Text>
    </Pressable>
    <Modal visible={open && !busy} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="게임 메뉴 닫기" onPress={() => setOpen(false)} />
        <View style={s.sheet} accessibilityViewIsModal>
          <View style={s.heading}><Text style={s.title}>정찰대 메뉴</Text><Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={() => setOpen(false)} style={s.close}><Text style={s.caption}>닫기</Text></Pressable></View>
          <ScrollView>{items.map(item => <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={item.title}
            accessibilityHint={item.description} accessibilityState={{ disabled: item.disabled }} disabled={item.disabled}
            onPress={() => { setOpen(false); item.action() }} style={[s.item, item.disabled && s.disabled]}>
            <View style={{ flex: 1, gap: 4 }}><Text style={s.itemTitle}>{item.title}</Text><Text style={s.description}>{item.description}</Text></View><Text style={s.arrow}>›</Text>
          </Pressable>)}</ScrollView>
        </View>
      </View>
    </Modal>
  </>
}

const s = StyleSheet.create({
  launcher: { alignItems: 'center', borderRadius: 16 }, lobby: { alignSelf: 'center', padding: 0 }, compact: { minHeight: 44, flexDirection: 'row', paddingRight: 8 },
  largeImage: { width: 164, height: 164 }, smallImage: { width: 48, height: 48 }, caption: { color: c.muted, fontSize: 12 }, disabled: { opacity: .4 },
  overlay: { flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end', padding: 20 }, sheet: { maxHeight: '85%', backgroundColor: c.surface, borderRadius: 24, padding: 16 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, title: { color: c.text, fontSize: 18, fontWeight: '700' },
  close: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' }, item: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  itemTitle: { color: c.text, fontWeight: '600', fontSize: 15 }, description: { color: c.muted, fontSize: 12, lineHeight: 18 }, arrow: { color: c.muted, fontSize: 24 },
})
