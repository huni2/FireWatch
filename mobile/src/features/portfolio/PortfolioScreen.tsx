import { ScreenIntro } from '@/components/ScreenIntro'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { fetchPortfolio, savePortfolio } from '@/lib/investingApi'
import { useResource } from '@/lib/useResource'
import { accountLabels, assetLabels, emptyHolding, riskLabels, toDraft } from '../../../../shared/investing'
import type { Holding, PortfolioDraft } from '../../../../shared/investing'

function Field({ label, value, onChange, numeric = false }: { label: string; value: string; onChange: (value: string) => void; numeric?: boolean }) {
  const [text, setText] = useState(value)
  const focused = useRef(false)
  useEffect(() => {
    // Synchronize externally refreshed drafts without erasing a decimal separator being typed.
    if (!focused.current) setText(value)
  }, [value])
  return <View className="gap-1"><Text className="text-xs text-muted">{label}</Text><TextInput accessibilityLabel={label} value={numeric ? text : value} onFocus={() => { focused.current = true }} onBlur={() => { focused.current = false; setText(value) }} onChangeText={next => { setText(next); onChange(next) }} keyboardType={numeric ? 'decimal-pad' : 'default'} className="rounded-lg border border-line bg-surface p-3 text-ink" /></View>
}

export function PortfolioScreen() {
  const query = useResource(fetchPortfolio)
  const [draft, setDraft] = useState<PortfolioDraft | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (query.data && !dirty) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(toDraft(query.data))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data])
  const change = (patch: Partial<PortfolioDraft>) => { if (draft) { setDraft({ ...draft, ...patch }); setDirty(true) } }
  const holdingChange = (index: number, patch: Partial<Holding>) => { if (draft) change({ holdings: draft.holdings.map((h, i) => i === index ? { ...h, ...patch } : h) }) }
  async function save() {
    if (!draft) return
    setSaving(true)
    try { const saved = await savePortfolio(draft); setDraft(toDraft(saved)); setDirty(false); await query.reload(); Toast.show({ type: 'success', text1: '포트폴리오 저장 완료' }) }
    catch (e) { void query.reload(); Toast.show({ type: 'error', text1: '저장 실패', text2: e instanceof Error ? e.message : '다시 시도해주세요.' }) }
    finally { setSaving(false) }
  }
  return <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-5 p-5 pb-10" refreshControl={<RefreshControl refreshing={query.loading} onRefresh={query.reload} />}>
      <ScreenIntro eyebrow="MY INVESTMENT PLAN" title="내 포트폴리오" description="목표와 보유 자산을 연결하고, 시장 변화에 맞춰 점검하세요." />
    {query.error && <View className="gap-2 rounded-xl bg-red-50 p-4"><Text>{query.error}</Text><Pressable onPress={query.reload}><Text className="text-brand">다시 시도</Text></Pressable></View>}
    {!draft && query.loading && <ActivityIndicator />}
    {draft && <View className="gap-5" pointerEvents={saving ? 'none' : 'auto'}>
      <View className="gap-3 rounded-xl border border-line bg-surface p-4">
        <Text className="text-lg font-semibold">투자 계획</Text>
        <Field label="투자 목표" value={draft.goal} onChange={goal => change({ goal })} />
        <Field label="투자 기간 (개월)" numeric value={String(draft.horizonMonths)} onChange={v => change({ horizonMonths: Number(v) })} />
        <Text className="text-xs text-muted">투자 성향</Text><View className="flex-row flex-wrap gap-2">{Object.entries(riskLabels).map(([key, label]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: draft.riskLevel === key }} onPress={() => change({ riskLevel: key as PortfolioDraft['riskLevel'] })} className={`min-h-11 justify-center rounded-xl px-4 py-3 ${draft.riskLevel === key ? 'bg-brand' : 'bg-neutral-100'}`}><Text className={draft.riskLevel === key ? 'text-white' : 'text-muted'}>{label}</Text></Pressable>)}</View>
        <Text className="text-xs text-muted">계좌</Text><View className="flex-row gap-2">{Object.entries(accountLabels).map(([key, label]) => <Pressable key={key} onPress={() => change({ accountType: key as PortfolioDraft['accountType'] })} className={`min-h-11 justify-center rounded-xl px-4 py-3 ${draft.accountType === key ? 'bg-brand' : 'bg-neutral-100'}`}><Text className={draft.accountType === key ? 'text-white' : 'text-muted'}>{label}</Text></Pressable>)}</View>
        <Field label="월 추가 투자금 (원)" numeric value={String(draft.monthlyContribution)} onChange={v => change({ monthlyContribution: Number(v) })} />
        <Field label="보유 현금 (원)" numeric value={String(draft.cash)} onChange={v => change({ cash: Number(v) })} />
      </View>
      <Text className="text-lg font-semibold">보유 자산 직접 등록</Text>
      {draft.holdings.map((h, i) => <View key={i} className="gap-3 rounded-xl border border-line bg-surface p-4">
        <Field label="티커 (005930.KS / AAPL)" value={h.symbol} onChange={symbol => holdingChange(i, { symbol: symbol.trim().toUpperCase() })} />
        <Field label="자산 이름" value={h.name} onChange={name => holdingChange(i, { name })} />
        <Field label="수량" numeric value={String(h.quantity)} onChange={v => holdingChange(i, { quantity: Number(v) })} />
        <Field label="평균 매입가" numeric value={String(h.averageCost)} onChange={v => holdingChange(i, { averageCost: Number(v) })} />
        <View className="flex-row gap-2">{(['KRW', 'USD'] as const).map(currency => <Pressable key={currency} onPress={() => holdingChange(i, { currency })} className={`min-h-11 justify-center rounded-xl px-4 py-3 ${currency === h.currency ? 'bg-brand' : 'bg-neutral-100'}`}><Text className={currency === h.currency ? 'text-white' : 'text-muted'}>{currency}</Text></Pressable>)}</View>
        <View className="flex-row flex-wrap gap-2">{(['STOCK', 'ETF', 'BOND', 'OTHER'] as const).map(assetClass => <Pressable key={assetClass} onPress={() => holdingChange(i, { assetClass })} className={`min-h-11 justify-center rounded-xl px-4 py-3 ${assetClass === h.assetClass ? 'bg-brand' : 'bg-neutral-100'}`}><Text className={assetClass === h.assetClass ? 'text-white' : 'text-muted'}>{assetLabels[assetClass]}</Text></Pressable>)}</View>
        <View className="flex-row gap-2">{(['KR', 'US', 'GLOBAL'] as const).map(region => <Pressable key={region} onPress={() => holdingChange(i, { region })} className={`min-h-11 justify-center rounded-xl px-4 py-3 ${region === h.region ? 'bg-brand' : 'bg-neutral-100'}`}><Text className={region === h.region ? 'text-white' : 'text-muted'}>{region}</Text></Pressable>)}</View>
        <Field label="산업·분야" value={h.sector} onChange={sector => holdingChange(i, { sector })} />
        <Field label="추종 지수 (ETF, 예: S&P500)" value={h.underlyingIndex} onChange={underlyingIndex => holdingChange(i, { underlyingIndex })} />
        <Pressable disabled={saving} onPress={() => change({ holdings: draft.holdings.filter((_, n) => n !== i) })}><Text className="text-red-600">자산 삭제</Text></Pressable>
      </View>)}
      <Pressable disabled={saving || draft.holdings.length >= 50} onPress={() => change({ holdings: [...draft.holdings, emptyHolding()] })} className="items-center rounded-xl border border-brand p-3"><Text className="text-brand">자산 추가</Text></Pressable>
      <Pressable disabled={!dirty || saving} onPress={save} className={`items-center rounded-xl p-4 ${dirty ? 'bg-brand' : 'bg-neutral-300'}`}><Text className="font-bold text-white">{saving ? '저장 중...' : '저장하고 분석하기'}</Text></Pressable>
      {dirty && <Text className="text-sm text-orange-700">저장되지 않은 변경이 있습니다.</Text>}
      {dirty && <Pressable disabled={saving} onPress={() => { if (query.data) setDraft(toDraft(query.data)); setDirty(false) }}><Text className="text-muted">편집 취소 · 서버 저장본으로 돌아가기</Text></Pressable>}
    </View>}
    {query.data && <View className="gap-3 rounded-xl bg-surface border border-line p-4">
      <Text className="text-lg font-semibold">저장된 포트폴리오 분석</Text>
      <Text>투자원금: {query.data.investedKrw?.toLocaleString() ?? '환율 확인 중'}원</Text>
      <Text>평가금액: {query.data.totalValueKrw?.toLocaleString() ?? '일부 시세 미수집'}{query.data.totalValueKrw != null ? '원' : ''}</Text>
      <Text>가격 변동 수익률: {query.data.returnPercent ?? '—'}%</Text>
      <Text className="text-xs text-muted">비중은 매입원금 기준 · 시세는 장후 수집 스냅샷{query.data.fxAsOf ? ` · 환율 기준 ${query.data.fxAsOf}` : ''}</Text>
      {Object.entries(query.data.allocation).map(([key, value]) => <Text key={key}>{assetLabels[key]} {value}%</Text>)}
      {query.data.insights.map(x => <Text key={x} className="text-sm leading-5">• {x}</Text>)}
      <Text className="font-semibold">내 조건으로 만드는 구성 초안</Text>
      <Text className="text-xs text-muted">기간·성향을 반영한 규칙 기반 출발점입니다. 실제 상품과 계좌 조건을 확인한 후 조정하세요.</Text>
      {Object.entries(query.data.targetAllocation).map(([key, value]) => <Text key={`target-${key}`}>{assetLabels[key]} {value}% · 월 배분 예시 {query.data!.contributionPlan[key]?.toLocaleString()}원</Text>)}
      {query.data.holdings.map(h => <Text key={h.holding.symbol} className="text-xs text-muted">{h.holding.name} 시세 기준: {h.quoteAsOf ? new Date(h.quoteAsOf).toLocaleString('ko-KR') : '미수집'}</Text>)}
    </View>}
  </ScrollView>
}
