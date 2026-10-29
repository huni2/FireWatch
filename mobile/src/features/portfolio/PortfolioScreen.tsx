import { ActionButton } from '@/components/ActionButton'
import { useTheme } from '@/lib/theme'
import { LoadingState } from '@/components/LoadingState'
import { AppReadiness } from '@/lib/appReadiness'
// 저장된 자산 점검을 먼저 보여주고 입력은 Android 전용 화면에서 처리한다.
import { useContext, useEffect, useRef, useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { InvestmentNotice } from '@/components/InvestmentNotice'
import { InvestmentStyleEntry } from '../investment-style/InvestmentStyleEntry'
import { PortfolioExposureCard } from './PortfolioExposureCard'
import { InvestmentFocus } from './InvestmentFocus'
import { PortfolioConnections } from './PortfolioConnections'
import { HoldingRegistration, PortfolioPlanEditor, lastContributionText } from './PortfolioEditor'
import { fetchPortfolio, savePortfolio, reviewPortfolio, saveHoldingNote } from '@/lib/investingApi'
import { useResource } from '@/lib/useResource'
import { assetLabels, emptyHolding, toDraft } from '../../../../shared/investing'
import type { Holding, PortfolioDraft, HoldingNoteRequest } from '../../../../shared/investing'
import { portfolioCoverageText, selectedHolding } from '../../../../shared/holding-registration'
import { PortfolioCheckup } from './PortfolioCheckup'
import { AllocationDonut } from './AllocationDonut'
import { HoldingNotes, HoldingNoteEditor } from './HoldingNotes'
import { noteIsEmpty } from '../../../../shared/holding-notes'
import type { CheckupFinding } from '../../../../shared/portfolio-checkup'

export function PortfolioScreen(navigation: { onOpenStock?: (symbol: string) => void; onOpenNews?: (query: string) => void; onOpenCandidates?: () => void; initialHolding?: { symbol: string; name: string } | null; onHoldingConsumed?: () => void } = {}) {
  const { colors } = useTheme()
  const { initialHolding, onHoldingConsumed } = navigation

  const query = useResource(fetchPortfolio)
  const { markReady } = useContext(AppReadiness)
  useEffect(() => { if (!query.loading) markReady() }, [query.loading, markReady])
  const [editing, setEditing] = useState<{ base: PortfolioDraft; initial: Holding; index: number | null } | null>(null)
  const [plan, setPlan] = useState<PortfolioDraft | null>(null)
  const [noteTarget, setNoteTarget] = useState<{ symbol: string; name: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState(false)
  const [inspectionKind, setInspectionKind] = useState<CheckupFinding['kind'] | undefined>()
  const holdingsY = useRef(0)
  const detailY = useRef(0)
  const pendingDetail = useRef(false)
  const operation = useRef(false)
  const scroll = useRef<ScrollView>(null)
  const [compositionY, setCompositionY] = useState(0)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  useEffect(() => {
    if (!query.data || !initialHolding) return
    const target = initialHolding
    const timer = setTimeout(() => { const base = toDraft(query.data!), index = base.holdings.findIndex(row => row.symbol === target.symbol); setEditing({ base, initial: index >= 0 ? base.holdings[index] : selectedHolding(emptyHolding(), target.symbol, target.name), index: index >= 0 ? index : null }); onHoldingConsumed?.() }, 0)
    return () => clearTimeout(timer)
  }, [query.data, initialHolding, onHoldingConsumed])
  async function persist(draft: PortfolioDraft, savedSymbol?: string) {
    if (operation.current) return
    operation.current = true; setSaving(true); setError(null)
    try { const saved = await savePortfolio(draft); query.replaceData(saved); setLastSaved(savedSymbol ?? null); requestAnimationFrame(() => scroll.current?.scrollTo({ y: 0, animated: true })); setEditing(null); setPlan(null); Toast.show({ type: 'success', text1: '보유 기록을 저장했어요.', text2: '내 자산 비중과 확인할 점을 살펴보세요.' }) }
    catch (e) { setError(e instanceof Error ? e.message : '기록을 저장하지 못했어요.') }
    finally { operation.current = false; setSaving(false) }
  }
  async function markReview() {
    if (!query.data || operation.current) return
    operation.current = true; setSaving(true); setError(null)
    try { const saved = await reviewPortfolio(query.data.version); query.replaceData(saved); Toast.show({ type: 'success', text1: '점검 기준을 저장했어요.', text2: '다음 방문에서 변화를 확인해보세요.' }) }
    catch (e) { setError(e instanceof Error ? e.message : '점검 기준을 저장하지 못했어요. 이전 기준은 유지돼요.') }
    finally { operation.current = false; setSaving(false) }
  }
  async function persistNote(note: HoldingNoteRequest): Promise<boolean> {
    if (operation.current) return false
    operation.current = true; setSaving(true); setError(null)
    try {
      const saved = await saveHoldingNote(note); query.replaceData(saved); setNoteTarget(null)
      Toast.show({ type: 'success', text1: noteIsEmpty(note) ? '투자 메모를 삭제했어요.' : '투자 메모를 저장했어요.' })
      return true
    } catch (e) { setError(e instanceof Error ? e.message : '메모를 저장하지 못했어요. 입력한 내용은 유지돼요.'); return false }
    finally { operation.current = false; setSaving(false) }
  }
  function openNote(symbol: string, name: string) {
    if (saving) return
    setError(null); setNoteTarget({ symbol, name })
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
  function inspectFinding(kind: CheckupFinding['kind']) {
    if (kind === 'largest') { scroll.current?.scrollTo({ y: compositionY, animated: true }); return }
    setInspectionKind(kind)
    if (details) scroll.current?.scrollTo({ y: detailY.current, animated: true })
    else { pendingDetail.current = true; setDetails(true) }
  }
  const portfolio = query.data
  const hasAssets = !!portfolio && (portfolio.holdings.length > 0 || portfolio.cash > 0)
  if (!portfolio && query.loading) return <View onLayout={markReady} style={{ flex: 1, padding: 20, gap: 16 }}><InvestmentStyleEntry /><LoadingState message="내 투자 기록을 불러오고 있어요" /></View>
  return <>
    <ScrollView ref={scroll} className="flex-1 bg-canvas" contentContainerClassName="gap-4 p-5 pb-10" refreshControl={<RefreshControl refreshing={query.refreshing} onRefresh={query.refresh} />}>
      <View className="gap-2"><Text className="text-2xl font-bold text-ink">내 투자</Text></View>
      <InvestmentStyleEntry />
      {hasAssets && portfolio && <View className="flex-row flex-wrap gap-3"><ActionButton tone="primary" disabled={saving || portfolio.holdings.length >= 50} label="자산 추가" onPress={() => openHolding()} /><ActionButton label="보유 내역 보기" onPress={() => scroll.current?.scrollTo({ y: holdingsY.current, animated: true })} /><ActionButton disabled={saving} label="현금·투자 계획" onPress={() => { setError(null); setPlan(toDraft(portfolio)) }} /></View>}
      {query.error && <View className="gap-2"><Text className="text-ink">{query.error}</Text><Pressable onPress={query.reload} className="min-h-12 justify-center"><Text className="text-primary">다시 확인</Text></Pressable></View>}
      {error && !editing && !plan && !noteTarget && <Text className="text-danger">{error}</Text>}
      {!hasAssets && portfolio && <View className="gap-5 py-2"><Text className="text-2xl font-bold text-ink">내 투자가 어디에 몰려 있는지 확인해보세요</Text><Text className="text-muted">종목을 선택하고 수량만 입력하면 돼요. 평균 구매 가격은 나중에 추가해도 괜찮아요.</Text><View accessibilityLabel="개인 기록에 저장되지 않는 점검 예시" className="gap-3 rounded-2xl bg-surface p-5"><Text className="text-xs text-muted">점검 예시 · 개인 기록에 저장되지 않아요</Text><Text className="text-lg font-bold text-ink">다른 ETF인데, 같은 시장을 따라가네요</Text><View className="flex-row justify-between"><Text className="text-ink">ETF A · ETF B</Text><Text className="font-bold text-ink">S&amp;P 500</Text></View><Text className="text-sm text-muted">등록한 지수명을 비교해 겹치는 투자를 찾아봐요. 실제 구성 종목은 별도 확인이 필요해요.</Text></View><ActionButton tone="primary" fullWidth disabled={saving} label="첫 자산 등록하기" onPress={() => openHolding()} />{navigation.onOpenCandidates && <Pressable accessibilityRole="button" onPress={navigation.onOpenCandidates} className="min-h-12 justify-center"><Text className="text-primary">회사부터 찾아볼게요 →</Text></Pressable>}</View>}
      {hasAssets && portfolio && <>
        {lastSaved && <View accessibilityRole="alert" className="gap-2"><Text className="text-ink">{portfolio.holdings.find(row => row.holding.symbol === lastSaved)?.holding.name} 기록을 저장했어요.</Text>{portfolio.holdingNotes !== undefined && <ActionButton label="보유 이유 남기기" onPress={() => openNote(lastSaved, portfolio.holdings.find(row => row.holding.symbol === lastSaved)?.holding.name ?? lastSaved)} />}<Pressable accessibilityRole="button" onPress={() => openHolding()} className="min-h-12 justify-center"><Text className="text-primary">다른 자산도 등록</Text></Pressable></View>}
        <PortfolioCheckup portfolio={portfolio} busy={saving} refreshing={query.loading} onRefresh={query.reload} onInspect={inspectFinding} onEdit={symbol => { const index = portfolio.holdings.findIndex(row => row.holding.symbol === symbol); if (index >= 0) openHolding(index) }} onReview={() => void markReview()} onOpenStock={navigation.onOpenStock} onOpenNews={navigation.onOpenNews} />
        <HoldingNotes portfolio={portfolio} busy={saving} edit={openNote} />
        <View onLayout={event => setCompositionY(event.nativeEvent.layout.y)} className="gap-3 rounded-2xl bg-surface p-5"><Text className="text-lg font-bold text-ink">내 자산 구성</Text><Text className="text-xs text-muted">{portfolioCoverageText(portfolio)}</Text><AllocationDonut allocation={portfolio.allocation} holdingsCount={portfolio.holdings.length} />{Object.entries(portfolio.allocation).map(([key, value]) => <View key={key} className="flex-row items-center justify-between gap-2"><View className="flex-row items-center gap-2"><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: key === 'ETF' ? colors.success : key === 'STOCK' ? colors.info : colors.muted }} /><Text className="text-ink">{assetLabels[key]}</Text></View><Text className="font-bold text-ink">{value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%</Text></View>)}{!Object.keys(portfolio.allocation).length && <Text className="text-muted">가격·환율을 확인하면 비중을 볼 수 있어요.</Text>}</View>
        {details && <View style={{ gap: 16 }} onLayout={event => { detailY.current = event.nativeEvent.layout.y; if (pendingDetail.current) { pendingDetail.current = false; requestAnimationFrame(() => scroll.current?.scrollTo({ y: detailY.current, animated: true })) } }}><PortfolioExposureCard portfolio={portfolio} focusKind={inspectionKind} /><PortfolioConnections portfolio={portfolio} {...navigation} /></View>}
        <View onLayout={event => { holdingsY.current = event.nativeEvent.layout.y }} className="gap-3"><Text className="text-lg font-bold text-ink">보유 자산</Text><Text className="text-xs text-muted">{portfolioCoverageText(portfolio)}</Text>{portfolio.holdings.map((row, index) => <View key={row.holding.symbol} style={lastSaved === row.holding.symbol ? { backgroundColor: colors.primarySoft } : undefined} className="gap-2 border-b border-line py-3"><Pressable accessibilityRole="button" disabled={!navigation.onOpenStock} onPress={() => navigation.onOpenStock?.(row.holding.symbol)} className="min-h-12 justify-center"><Text className="text-base font-bold text-ink">{row.holding.name}</Text></Pressable><Text className="text-muted">{row.holding.quantity.toLocaleString()}주 · {assetLabels[row.holding.assetClass]}</Text><Text className="font-bold text-ink">{row.valueKrw == null ? '가격·환율 확인 필요' : `${row.valueKrw.toLocaleString()}원`}</Text><Text className="text-xs text-muted">{row.holding.averageCost == null ? '평균 구매 가격 미입력 · 손익 계산 안 함' : `평균 구매 가격 ${row.holding.averageCost.toLocaleString()} ${row.holding.currency === 'KRW' ? '원' : '달러'}`}</Text><Text className="text-xs text-muted">{row.quoteAsOf ? `시세 ${new Date(row.quoteAsOf).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}` : '시세 미수집'}</Text><View className="flex-row flex-wrap gap-4">{portfolio.holdingNotes !== undefined && <Pressable accessibilityRole="button" accessibilityLabel={`${row.holding.name} 투자 메모`} disabled={saving} onPress={() => openNote(row.holding.symbol, row.holding.name)} className="min-h-12 justify-center"><Text className="text-primary">투자 메모</Text></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel={`${row.holding.name} 기록 수정`} disabled={saving} onPress={() => openHolding(index)} className="min-h-12 justify-center"><Text className="text-primary">수정</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${row.holding.name} 기록 삭제`} disabled={saving} onPress={() => remove(index)} className="min-h-12 justify-center"><Text className="text-danger">삭제</Text></Pressable></View></View>)}<View className="flex-row items-center justify-between"><Text className="text-muted">등록한 현금</Text><View className="flex-row items-center gap-3"><Text className="font-bold text-ink">{portfolio.cash.toLocaleString()}원</Text><Pressable accessibilityRole="button" accessibilityLabel="보유 현금 수정" disabled={saving} onPress={() => { setError(null); setPlan(toDraft(portfolio)) }} className="min-h-12 justify-center"><Text className="text-primary">수정</Text></Pressable></View></View>{lastContributionText(portfolio.lastContributionAppliedAt, portfolio.lastContributionAppliedAmount, portfolio.lastContributionAppliedMonths) && <Text className="text-xs text-muted">{lastContributionText(portfolio.lastContributionAppliedAt, portfolio.lastContributionAppliedAmount, portfolio.lastContributionAppliedMonths)}</Text>}</View>

        <Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => { setInspectionKind(undefined); setDetails(!details) }} className="min-h-12 justify-center"><Text className="text-primary">손익·분야·거래 통화·ETF 지수명 비교 {details ? '접기' : '더 보기'}</Text></Pressable>{details && <><View className="gap-3 rounded-xl bg-surface p-4">{portfolio.holdings.some(row => row.holding.averageCost == null) && <Text className="text-muted">평균 구매 가격이 없는 종목이 있어 전체 투자원금과 손익을 계산하지 않았어요.</Text>}<Text className="text-muted">투자원금 {portfolio.investedKrw == null ? '평균 구매 가격·환율 확인 필요' : `${portfolio.investedKrw.toLocaleString()}원`}</Text><Text className="text-muted">가격 변동 수익률 {portfolio.returnPercent == null ? '계산하지 않았어요' : `${portfolio.returnPercent}%`}</Text><Text className="text-xs text-muted">평균 구매 가격·시세·환율이 확인된 경우 계산해요. 수수료·세금은 포함하지 않아요.</Text><Text className="font-bold text-ink">저장된 조건의 구성 초안</Text>{Object.entries(portfolio.targetAllocation).map(([key, value]) => <Text key={key} className="text-muted">{assetLabels[key]} {value}% · 월 배분 예시 {portfolio.contributionPlan[key]?.toLocaleString()}원</Text>)}<Text className="text-xs text-muted">규칙 기반 예시예요. 실제 상품·계좌 적합성을 별도로 확인해주세요.</Text></View></>}
        <InvestmentFocus portfolio={portfolio} {...navigation} />
      </>}
      {portfolio && !hasAssets && <HoldingNotes portfolio={portfolio} busy={saving} edit={openNote} />}
      <InvestmentNotice />
    </ScrollView>
    {noteTarget && portfolio && <HoldingNoteEditor key={noteTarget.symbol} {...noteTarget} initial={portfolio.holdingNotes?.find(note => note.symbol === noteTarget.symbol)} version={portfolio.version} busy={saving} error={error} close={() => { setNoteTarget(null); setError(null) }} save={persistNote} />}
    {editing && <HoldingRegistration key={`${editing.index ?? 'new'}:${editing.initial.symbol}`} editExisting={symbol => { const index = editing.base.holdings.findIndex(row => row.symbol.toUpperCase() === symbol.toUpperCase()); if (index >= 0) openHolding(index) }} initial={editing.initial} others={editing.base.holdings.filter((_, i) => i !== editing.index)} editing={editing.index != null} saving={saving} error={error} close={() => setEditing(null)} save={holding => void persist({ ...editing.base, holdings: editing.index == null ? [...editing.base.holdings, holding] : editing.base.holdings.map((h, i) => i === editing.index ? holding : h) }, holding.symbol)} />}
    {plan && <PortfolioPlanEditor initial={plan} saving={saving} error={error} close={() => setPlan(null)} save={value => void persist(value)} lastContributionAppliedAt={portfolio?.lastContributionAppliedAt ?? null} lastContributionAppliedAmount={portfolio?.lastContributionAppliedAmount ?? null} lastContributionAppliedMonths={portfolio?.lastContributionAppliedMonths ?? null} />}
  </>
}
