import { ModalHeader } from '@/components/ModalHeader'
import { ThemeSurface } from '@/lib/theme'
// 모바일 종료 결과를 세로로 읽고 하단에서 공개 여부를 선택한다.
import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { PracticeTurn } from '@/lib/investingApi'
import { gameCompletion } from '../../../../shared/game-completion'
import { FirewatchIcon } from '../../components/FirewatchIcon'

export function PracticeCompletion({ turn, close, publish }: { turn: PracticeTurn; close: () => void; publish: () => void }) {
  const result = gameCompletion(turn)
  const [expanded, setExpanded] = useState(false)
  return <Modal visible animationType="slide" onRequestClose={close}><ThemeSurface><SafeAreaView className="flex-1 bg-surface">
    <ModalHeader title="게임 결과" close={close} />
    <ScrollView contentContainerStyle={{ padding: 24, gap: 24 }}>
      <View className="flex-row items-center gap-3"><FirewatchIcon name="turn-result" size={36} /><Text className="text-muted">가상투자 결과 · {result.progress}</Text></View>
      <Text className="text-2xl font-bold text-ink" accessibilityRole="header">{result.title}</Text>
      <View className="gap-2"><Text className="text-muted">시작 대비 수익률</Text><Text className={`text-4xl font-bold ${result.tone === 'negative' ? 'text-negative' : result.tone === 'positive' ? 'text-brand' : 'text-ink'}`}>{result.score}</Text><Text className="text-muted">실제 투자 수익이나 내 보유 자산에 반영되지 않아요.</Text></View>
      <View className="p-4 rounded-2xl bg-canvas gap-2"><Text className="text-muted">최종 총자산</Text><Text className="text-xl font-bold text-ink">{result.value} 게임머니</Text></View>
      {result.reviews.length > 0 && <View className="gap-3"><Text className="text-lg font-bold text-ink">이번 플레이 돌아보기</Text>{(expanded ? result.reviews : result.reviews.slice(0, 2)).map((text, index) => <Text key={index} className="text-ink">{text}</Text>)}{result.reviews.length > 2 && <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} className="min-h-11 justify-center"><Text className="text-brand">회고 {expanded ? "접기" : "더 보기"}</Text></Pressable>}</View>}
      <Text className="text-muted">{result.canPublish ? '순위에는 자동으로 등록되지 않아요. 닉네임과 공개 범위를 확인한 뒤 결정할 수 있어요.' : '새 주간 게임을 끝까지 진행하고 평가가 확인되면 순위에 참여할 수 있어요. 이번 기록은 남겨둘게요.'}</Text>
    </ScrollView>
    <View className="px-5 py-3 gap-3 border-t border-line">{result.canPublish && <Pressable accessibilityRole="button" className="bg-brand rounded-2xl p-4" onPress={publish}><Text className="text-center font-bold text-onbrand">순위 등록 선택하기</Text></Pressable>}<Pressable accessibilityRole="button" className="p-4" onPress={close}><Text className="text-center text-ink font-bold">결과 화면 보기</Text></Pressable></View>
  </SafeAreaView></ThemeSurface></Modal>
}
