import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { PracticeTurn } from '@/lib/investingApi'
import { replayChoices, replayIndicators, replayPicks, replayResults } from '../../../../shared/game-replay'

export interface PracticeReplayState { before: PracticeTurn; after: PracticeTurn | null }
export function PracticeReplay({ value, close }: { value: PracticeReplayState | null; close: () => void }) {
  const money = (v: number | null | undefined) => v == null ? '미확정' : v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
  const pct = (v: number | null) => v == null ? '미확정' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
  return <Modal visible={!!value} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}><SafeAreaView className="flex-1 bg-canvas"><ScrollView contentContainerClassName="gap-5 p-5 pb-10">
    <Pressable accessibilityRole="button" onPress={close} className="min-h-11 justify-center"><Text className="text-brand">{value?.after ? '다음 선택으로' : '연출 건너뛰기'}</Text></Pressable>
    {value && <>
      <View className="flex-row items-center gap-4"><Image source={require('../../../../shared/assets/firewatch-scout.png')} accessibilityLabel="FireWatch 불꽃 정찰대" style={{ width: 92, height: 110 }} resizeMode="contain" /><View className="flex-1"><Text className="text-xs text-muted">TURN {value.before.turnIndex + 1} → {value.after ? value.after.turnIndex + 1 : '?'}</Text><Text className="text-xl font-bold text-ink">{value.after ? '이번 턴의 주마등' : '내 선택을 돌아보는 중'}</Text></View></View>
      <View className="gap-2 rounded-xl border border-line bg-surface p-4"><Text className="font-semibold text-ink">내가 남긴 선택</Text>{replayChoices(value.before).length ? replayChoices(value.before).map((t, i) => <Text key={i} className="text-ink">{t.name} · {t.action === 'BUY' ? '매수' : '매도'} {t.quantity}개 · 총 {money(t.total)}</Text>) : <Text className="text-muted">새 거래 없이 보유 포지션을 유지했습니다.</Text>}</View>
      {!value.after ? <><ActivityIndicator /><Text className="text-muted">지난 픽: {value.before.briefing.recommendedStocks.join(', ') || '없음'}</Text><Text className="text-muted">서버 요청은 진행 중입니다. 새 사건·가격은 확정 후 표시하며, 건너뛰어도 진행은 계속됩니다.</Text></> : <>
        <Text className="text-lg font-semibold text-ink">새 턴의 가상 속보</Text>{value.after.briefing.news.map((n,i) => <Text key={i} className="text-ink">{n.title}</Text>)}
        {replayIndicators(value.before,value.after).map(item => <Text key={item.name} className="text-muted">{item.name} · {money(item.current)} · {pct(item.percent)}</Text>)}<Text className="text-lg font-semibold text-ink">내 자산에 일어난 일</Text>{replayResults(value.before,value.after).length ? replayResults(value.before,value.after).map(item => <View key={`${item.instrumentType}:${item.symbol}`} className="gap-2 rounded-xl border border-line bg-surface p-4"><Text className="font-semibold text-ink">{item.name} · {pct(item.percent)}</Text><Text className="text-muted">{money(item.previous)} → {money(item.current)} 게임머니</Text><Text className="text-ink">{item.carried ? `넘긴 포지션 ${item.carried}개 · 턴 손익 ${money(item.profit)}` : '매도 후 가격 관찰 · 현재 보유분의 턴 손익 0'}</Text>{item.driver && <><Text className="text-muted">{item.driver.newsTitle}</Text><Text className="text-muted">{item.driver.halted ? '거래정지: 직전 가격 유지' : `시장 ${pct(item.driver.marketPercent)} + 업종 ${pct(item.driver.sectorPercent)} + 자산별 변동 ${pct(item.driver.assetPercent)}`}</Text></>}</View>) : <Text className="text-muted">현금으로 시장을 관찰했습니다.</Text>}
        <Text className="text-lg font-semibold text-ink">지난 턴 픽 복기</Text>{replayPicks(value.before,value.after).map(item => <Text key={item.name} className="text-ink">{item.name} · {pct(item.percent)}</Text>)}<Text className="text-xs text-muted">픽 이후 가격 변화이며 내 매매 수익률과 다릅니다.</Text>
        <Text className="text-xl font-bold text-ink">총자산 {money(value.after.portfolioValue)} 게임머니</Text><Text className="text-muted">직전 총자산 {money(value.before.portfolioValue)}</Text>
      </>}
    </>}
  </ScrollView></SafeAreaView></Modal>
}
