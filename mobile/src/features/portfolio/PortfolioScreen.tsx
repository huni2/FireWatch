// 저장된 자산 점검을 먼저 보여주고 입력은 Android 전용 화면에서 처리한다.
import { useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { InvestmentNotice } from '@/components/InvestmentNotice'
import { PortfolioExposureCard } from './PortfolioExposureCard'
import { InvestmentFocus } from './InvestmentFocus'
import { HoldingRegistration, PortfolioPlanEditor } from './PortfolioEditor'
import { fetchPortfolio, savePortfolio } from '@/lib/investingApi'
import { useResource } from '@/lib/useResource'
import { assetLabels, emptyHolding, toDraft } from '../../../../shared/investing'
import type { Holding, PortfolioDraft } from '../../../../shared/investing'
import { portfolioCoverageText, portfolioFinding } from '../../../../shared/holding-registration'

export function PortfolioScreen(navigation: { onOpenStock?: (symbol: string) => void; onOpenNews?: (query: string) => void; onOpenCandidates?: () => void } = {}) {
  const query = useResource(fetchPortfolio)
  const [editing, setEditing] = useState<{ base: PortfolioDraft; initial: Holding; index: number | null } | null>(null)
  const [plan, setPlan] = useState<PortfolioDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState(false)
  const operation = useRef(false)
  async function persist(draft: PortfolioDraft) {
    if (operation.current) return
    operation.current = true; setSaving(true); setError(null)
    try { const saved = await savePortfolio(draft); query.replaceData(saved); setEditing(null); setPlan(null); Toast.show({ type: 'success', text1: '보유 기록을 저장했어요.', text2: '내 자산 비중과 확인할 점을 살펴보세요.' }) }
    catch (e) { setError(e instanceof Error ? e.message : '기록을 저장하지 못했어요.') }
    finally { operation.current = false; setSaving(false) }
  }
  function openHolding(index: number | null = null) {
    if (!query.data || saving) return
    setError(null); const base = toDraft(query.data)
    setEditing({ base, initial: index == null ? emptyHolding() : base.holdings[index], index })
  }
  function remove(index: number) {
    if (!query.data || saving) return
    const base = toDraft(query.data)
    Alert.alert(`${base.holdings[index].name} 기록을 삭제할까요?`, '보유 기록만 삭제하며 실제 주식은 매도하지 않아요.', [{ text: '유지하기', style: 'cancel' }, { text: '기록 삭제', style: 'destructive', onPress: () => void persist({ ...base, holdings: base.holdings.filter((_, i) => i !== index) }) }])
  }
  const portfolio = query.data
  const hasAssets = !!portfolio && (portfolio.holdings.length > 0 || portfolio.cash > 0)
  return <>
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-5 p-5 pb-10" refreshControl={<RefreshControl refreshing={query.loading} onRefresh={query.reload} />}>
      <View className="gap-2"><Text className="text-sm text-brand">내 투자 기록</Text><Text className="text-2xl font-bold text-ink">{hasAssets ? '내 자산 점검' : '보유 자산 하나로 시작하세요.'}</Text><Text className="text-sm text-muted">직접 등록한 기록에서 비중과 겹치는 투자를 확인해요.</Text></View>
      {query.error && <View className="gap-2"><Text>{query.error}</Text><Pressable onPress={query.reload} className="min-h-11 justify-center"><Text className="text-brand">다시 확인</Text></Pressable></View>}
      {!portfolio && query.loading && <ActivityIndicator />}
      {portfolio && <View className="flex-row flex-wrap gap-3"><Pressable accessibilityRole="button" disabled={saving || portfolio.holdings.length >= 50} onPress={() => openHolding()} className="min-h-11 justify-center rounded-xl bg-brand px-5 py-3"><Text className="font-bold text-white">{hasAssets ? '자산 추가' : '첫 자산 등록하기'}</Text></Pressable><Pressable accessibilityRole="button" disabled={saving} onPress={() => { setError(null); setPlan(toDraft(portfolio)) }} className="min-h-11 justify-center rounded-xl border border-line px-4"><Text className="text-ink">현금·투자 계획</Text></Pressable></View>}
      {error && !editing && !plan && <Text className="text-red-600">{error}</Text>}
      {!hasAssets && portfolio && <View className="gap-3 rounded-2xl bg-surface p-5"><Text className="text-lg font-bold text-ink">회사 이름과 수량만 알려주세요.</Text><Text className="text-muted">매입가를 몰라도 등록할 수 있어요. 시세가 있으면 비중을 확인할 수 있어요.</Text>{navigation.onOpenCandidates && <Pressable accessibilityRole="button" onPress={navigation.onOpenCandidates} className="min-h-11 justify-center"><Text className="text-brand">분야별 기업 살펴보기</Text></Pressable>}</View>}
      {hasAssets && portfolio && <>
        <View className="gap-2 rounded-2xl bg-surface p-5"><Text className="text-sm text-muted">등록한 자산 평가액</Text><Text className="text-3xl font-bold text-ink">{portfolio.totalValueKrw == null ? '일부 가격 확인 필요' : `${portfolio.totalValueKrw.toLocaleString()}원`}</Text><Text className="text-xs text-muted">수집 시세 기준 · 증권사 자동 연동 없음</Text></View>
        <View className="gap-2 rounded-2xl border border-brand bg-surface p-4"><Text className="text-sm text-brand">내 기록에서 확인할 점</Text><Text className="font-bold text-ink">{portfolioFinding(portfolio)}</Text><Text className="text-xs text-muted">등록한 자산 기준이에요. 등록하지 않은 자산은 포함되지 않아요.</Text></View>
        <View className="gap-3 rounded-2xl bg-surface p-5"><Text className="text-lg font-bold text-ink">보유 자산</Text><Text className="text-xs text-muted">{portfolioCoverageText(portfolio)}</Text>{portfolio.holdings.map((row, index) => <View key={row.holding.symbol} className="gap-2 border-b border-line py-3"><Pressable accessibilityRole="button" disabled={!navigation.onOpenStock} onPress={() => navigation.onOpenStock?.(row.holding.symbol)} className="min-h-11 justify-center"><Text className="text-base font-bold text-ink">{row.holding.name}</Text></Pressable><Text className="text-muted">{row.holding.quantity.toLocaleString()}주 · {assetLabels[row.holding.assetClass]}</Text><Text className="font-bold text-ink">{row.valueKrw == null ? '가격·환율 확인 필요' : `${row.valueKrw.toLocaleString()}원`}</Text><Text className="text-xs text-muted">{row.holding.averageCost == null ? '매입가 미입력 · 손익 계산 안 함' : `평균 매입가 ${row.holding.averageCost.toLocaleString()} ${row.holding.currency === 'KRW' ? '원' : '달러'}`}</Text><Text className="text-xs text-muted">{row.quoteAsOf ? `시세 ${new Date(row.quoteAsOf).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}` : '시세 미수집'}</Text><View className="flex-row gap-4"><Pressable accessibilityRole="button" accessibilityLabel={`${row.holding.name} 기록 수정`} disabled={saving} onPress={() => openHolding(index)} className="min-h-11 justify-center"><Text className="text-brand">수정</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${row.holding.name} 기록 삭제`} disabled={saving} onPress={() => remove(index)} className="min-h-11 justify-center"><Text className="text-red-600">삭제</Text></Pressable></View></View>)}<View className="flex-row justify-between"><Text className="text-muted">등록한 현금</Text><Text className="font-bold text-ink">{portfolio.cash.toLocaleString()}원</Text></View></View>
        <View className="gap-3 rounded-2xl bg-surface p-5"><Text className="text-lg font-bold text-ink">내 자산 구성</Text><Text className="text-xs text-muted">{portfolioCoverageText(portfolio)}</Text>{Object.entries(portfolio.allocation).map(([key, value]) => <View key={key} className="gap-2"><View className="flex-row justify-between"><Text className="text-ink">{assetLabels[key]}</Text><Text className="font-bold text-ink">{value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%</Text></View><View className="h-2 overflow-hidden rounded-full bg-neutral-100"><View style={{ width: `${Math.min(100, Math.max(0, value))}%` }} className="h-2 rounded-full bg-brand" /></View></View>)}{!Object.keys(portfolio.allocation).length && <Text className="text-muted">가격·환율을 확인하면 비중을 볼 수 있어요.</Text>}</View>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails(!details)} className="min-h-11 justify-center"><Text className="text-brand">손익·분야·통화·ETF 중복 {details ? '접기' : '더 보기'}</Text></Pressable>{details && <><View className="gap-3 rounded-xl bg-surface p-4"><Text className="text-muted">투자원금 {portfolio.investedKrw == null ? '매입가·환율 확인 필요' : `${portfolio.investedKrw.toLocaleString()}원`}</Text><Text className="text-muted">가격 변동 수익률 {portfolio.returnPercent == null ? '계산하지 않았어요' : `${portfolio.returnPercent}%`}</Text><Text className="text-xs text-muted">매입가·시세·환율이 확인된 경우 계산해요. 수수료·세금은 포함하지 않아요.</Text><Text className="font-bold text-ink">저장된 조건의 구성 초안</Text>{Object.entries(portfolio.targetAllocation).map(([key, value]) => <Text key={key} className="text-muted">{assetLabels[key]} {value}% · 월 배분 예시 {portfolio.contributionPlan[key]?.toLocaleString()}원</Text>)}<Text className="text-xs text-muted">규칙 기반 예시예요. 실제 상품·계좌 적합성을 별도로 확인해주세요.</Text></View><PortfolioExposureCard portfolio={portfolio} /></>}
        <InvestmentFocus portfolio={portfolio} {...navigation} />
      </>}
      <InvestmentNotice />
    </ScrollView>
    {editing && <HoldingRegistration initial={editing.initial} others={editing.base.holdings.filter((_, i) => i !== editing.index)} editing={editing.index != null} saving={saving} error={error} close={() => setEditing(null)} save={holding => void persist({ ...editing.base, holdings: editing.index == null ? [...editing.base.holdings, holding] : editing.base.holdings.map((h, i) => i === editing.index ? holding : h) })} />}
    {plan && <PortfolioPlanEditor initial={plan} saving={saving} error={error} close={() => setPlan(null)} save={value => void persist(value)} />}
  </>
}
