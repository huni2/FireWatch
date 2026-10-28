import { AppSheet, AppSheetScrollView } from '@/components/AppSheet'
import { ActionButton } from '@/components/ActionButton'
import { LoadingState } from '@/components/LoadingState'
import { useTheme } from '@/lib/theme'
// 자산의 주간 가격과 체결 기록을 미래 데이터 없이 표시한다.
import { gamePeriod, isWeeklyGame } from '../../../../shared/game-week'
import { Linking, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { LineChart } from 'react-native-gifted-charts'
import { useGameAssetHistory } from './useGameAssetHistory'
import type { PracticeTurn } from '@/lib/investingApi'
import { historyChange, positionStats } from '../../../../shared/game-turn'

export interface PracticeTarget { instrumentType: string; symbol: string | null; name: string }
export function PracticeAssetDetail({ target, turn, close, order }: { target: PracticeTarget | null; turn: PracticeTurn; close: () => void; order: (target: PracticeTarget, side: 'BUY' | 'SELL') => void }) {
  const { colors } = useTheme()

  const period = gamePeriod(turn)
  const { width } = useWindowDimensions()
  const company = turn.gameAssets?.find(a => a.symbol === target?.symbol)
  const graph = useGameAssetHistory(target && turn.simulation ? { sessionId: turn.sessionId, turnIndex: turn.turnIndex, instrumentType: target.instrumentType, symbol: target.symbol } : null)
  const history = graph.history
  const summary = turn.assetHistories?.find(h => h.instrumentType === target?.instrumentType && h.symbol === target?.symbol)
  const holding = turn.holdings.find(h => h.instrumentType === target?.instrumentType && h.symbol === target?.symbol)
  const trades = turn.transactions.filter(t => t.instrumentType === target?.instrumentType && t.symbol === target?.symbol)
  const stats = target ? positionStats(turn.transactions, target.instrumentType, target.symbol, holding?.currentPrice ?? null) : null
  const change = historyChange(summary)
  const money = (v: number | null | undefined) => v == null ? '미확정' : v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
  return <AppSheet open={!!target} title={target?.name ?? '자산 상세'} close={close} height="90%"><AppSheetScrollView contentContainerStyle={{ gap: 16 }}>
    <Text className="text-2xl font-bold text-ink">{target?.name}</Text><Text className="text-xl font-bold text-ink">{money(summary?.points.at(-1)?.price ?? holding?.currentPrice ?? (target?.symbol ? turn.stockPrices[target.symbol] : null))} 게임머니</Text>
    {company?.source && <><Text className="text-muted">기업 정보 확인 {company.verifiedAt} · 회사 이름과 분야만 실제 자료이며 가격·뉴스·픽은 가상입니다.</Text><Pressable accessibilityRole="link" onPress={() => void Linking.openURL(company.source!)} style={{ minHeight: 48, justifyContent: 'center' }}><Text className="text-game">회사 공식 자료 보기</Text></Pressable></>}
    <Text className="text-muted">직전 턴 가격 {change ? `${change.percent >= 0 ? '+' : ''}${change.percent.toFixed(2)}%` : '첫 턴 또는 이전 기록 없음'}</Text>
    {holding && <Text className="text-ink">보유 {holding.quantity}개 · 평균 진입 단가 {money(stats?.averagePrice)} · 평가손익 {money(stats?.profit)}{stats?.returnPercent != null ? ` (${stats.returnPercent.toFixed(2)}%)` : ''}</Text>}
    <Text className="text-sm text-muted">{isWeeklyGame(turn) ? '일주일 간격의 가격이에요. 진행한 주까지만 보여드려요.' : '기존 게임의 턴 순서예요. 미래 가격은 표시하지 않아요.'}</Text>
    {graph.loading ? <LoadingState inline message="턴별 그래프를 불러오고 있어요" /> : graph.error ? <View accessibilityLiveRegion="polite"><Text className="text-ink">그래프를 불러오지 못했어요.</Text><Text className="text-muted">{graph.error}</Text><Pressable accessibilityRole="button" onPress={graph.retry} className="min-h-12 justify-center"><Text className="text-game">그래프 다시 불러오기</Text></Pressable></View> : history?.points.length ? <LineChart width={Math.max(180, width - 100)} height={220} color={colors.game} thickness={2} noOfSections={4} yAxisTextStyle={{ fontSize: 10, color: colors.muted }} xAxisLabelTextStyle={{ fontSize: 10, color: colors.muted }} rulesColor={colors.border} xAxisColor={colors.border} yAxisColor={colors.border} data={history.points.map(p => ({ value: p.price, label: `${p.turnIndex + 1}`, dataPointText: trades.some(t => t.turnIndex === p.turnIndex) ? '체결' : undefined }))} /> : <Text className="text-muted">턴별 가격 기록이 아직 제공되지 않았습니다.</Text>}
    <Text className="text-sm text-muted">체결 표시와 아래 원장에서 매수·매도를 확인하세요. 평가손익은 현재 보유분의 미실현 손익입니다.</Text>
    <Text className="text-lg font-semibold text-ink">이 자산의 체결 기록</Text>{trades.length ? trades.map(t => <Text key={t.id} className="text-ink">{period} {t.turnIndex + 1} · {t.action === 'BUY' ? '매수' : '매도'} {t.quantity}개 · 단가 {money(t.price)} · 총액 {money(t.total)}</Text>) : <Text className="text-muted">아직 거래하지 않은 자산입니다.</Text>}
    {target && turn.status === 'ACTIVE' && <View className="gap-3"><ActionButton fullWidth tone="next" label="매수 주문에 담기" onPress={() => order(target, 'BUY')} /><ActionButton fullWidth label="매도 주문에 담기" onPress={() => order(target, 'SELL')} /></View>}
  </AppSheetScrollView></AppSheet>
}
