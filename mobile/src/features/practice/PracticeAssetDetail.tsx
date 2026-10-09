import { Linking, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LineChart } from 'react-native-gifted-charts'
import type { PracticeTurn } from '@/lib/investingApi'
import { historyChange, positionStats } from '../../../../shared/game-turn'

export interface PracticeTarget { instrumentType: string; symbol: string | null; name: string }
export function PracticeAssetDetail({ target, turn, close, order }: { target: PracticeTarget | null; turn: PracticeTurn; close: () => void; order: (target: PracticeTarget, side: 'BUY' | 'SELL') => void }) {
  const { width } = useWindowDimensions()
  const company = turn.gameAssets?.find(a => a.symbol === target?.symbol)
  const history = turn.assetHistories?.find(h => h.instrumentType === target?.instrumentType && h.symbol === target?.symbol)
  const holding = turn.holdings.find(h => h.instrumentType === target?.instrumentType && h.symbol === target?.symbol)
  const trades = turn.transactions.filter(t => t.instrumentType === target?.instrumentType && t.symbol === target?.symbol)
  const stats = target ? positionStats(turn.transactions, target.instrumentType, target.symbol, holding?.currentPrice ?? null) : null
  const change = historyChange(history)
  const money = (v: number | null | undefined) => v == null ? '미확정' : v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
  return <Modal visible={!!target} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}><SafeAreaView className="flex-1 bg-canvas"><ScrollView contentContainerClassName="gap-4 p-5 pb-10">
    <Pressable accessibilityRole="button" onPress={close} className="min-h-11 justify-center"><Text className="text-brand">닫기</Text></Pressable>
    <Text className="text-2xl font-bold text-ink">{target?.name}</Text><Text className="text-xl font-bold text-ink">{money(history?.points.at(-1)?.price ?? holding?.currentPrice ?? (target?.symbol ? turn.stockPrices[target.symbol] : null))} 게임머니</Text>
    {company?.source && <><Text className="text-muted">기업 정보 확인 {company.verifiedAt} · 회사 이름과 분야만 실제 자료이며 가격·뉴스·픽은 가상입니다.</Text><Pressable accessibilityRole="link" onPress={() => void Linking.openURL(company.source!)} style={{ minHeight: 44, justifyContent: 'center' }}><Text className="text-brand">회사 공식 자료 보기</Text></Pressable></>}
    <Text className="text-muted">직전 턴 가격 {change ? `${change.percent >= 0 ? '+' : ''}${change.percent.toFixed(2)}%` : '첫 턴 또는 이전 기록 없음'}</Text>
    {holding && <Text className="text-ink">보유 {holding.quantity}개 · 평균 진입 단가 {money(stats?.averagePrice)} · 평가손익 {money(stats?.profit)}{stats?.returnPercent != null ? ` (${stats.returnPercent.toFixed(2)}%)` : ''}</Text>}
    <Text className="text-sm text-muted">가상 날짜가 아닌 턴 순서입니다. 현재 턴까지의 가격만 표시합니다.</Text>
    {history?.points.length ? <LineChart width={Math.max(180, width - 100)} height={220} color="#f97316" thickness={2} noOfSections={4} yAxisTextStyle={{ fontSize: 10 }} xAxisLabelTextStyle={{ fontSize: 10 }} data={history.points.map(p => ({ value: p.price, label: `${p.turnIndex + 1}`, dataPointText: trades.some(t => t.turnIndex === p.turnIndex) ? '체결' : undefined }))} /> : <Text className="text-muted">턴별 가격 기록이 아직 제공되지 않았습니다.</Text>}
    <Text className="text-sm text-muted">체결 표시와 아래 원장에서 매수·매도를 확인하세요. 평가손익은 현재 보유분의 미실현 손익입니다.</Text>
    <Text className="text-lg font-semibold text-ink">이 자산의 체결 기록</Text>{trades.length ? trades.map(t => <Text key={t.id} className="text-ink">턴 {t.turnIndex + 1} · {t.action === 'BUY' ? '매수' : '매도'} {t.quantity}개 · 단가 {money(t.price)} · 총액 {money(t.total)}</Text>) : <Text className="text-muted">아직 거래하지 않은 자산입니다.</Text>}
    {target && turn.status === 'ACTIVE' && <View className="gap-3"><Pressable accessibilityRole="button" onPress={() => order(target, 'BUY')} className="min-h-11 items-center justify-center rounded-xl bg-brand p-3"><Text className="text-white">매수 주문에 담기</Text></Pressable><Pressable accessibilityRole="button" onPress={() => order(target, 'SELL')} className="min-h-11 items-center justify-center rounded-xl bg-neutral-100 p-3"><Text className="text-ink">매도 주문에 담기</Text></Pressable></View>}
  </ScrollView></SafeAreaView></Modal>
}
