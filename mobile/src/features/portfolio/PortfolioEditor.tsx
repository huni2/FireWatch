import { ActionButton } from '@/components/ActionButton'
import { ModalHeader } from '@/components/ModalHeader'
import { useTheme, ThemeSurface } from '@/lib/theme'
// Android에서 키보드와 뒤로가기를 고려한 별도 자산·계획 입력 화면을 제공한다.
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HoldingSearch } from './HoldingSearch'
import { AppSheet, AppSheetScrollView } from '@/components/AppSheet'
import { request } from '@/lib/api'
import { searchHoldingCatalog, type HoldingSearchResult } from '../../../../shared/holding-search'
import { holdingError, holdingIdentity, selectedHolding } from '../../../../shared/holding-registration'
import { accountLabels, assetLabels, CONTRIBUTION_LAST_DAY_OF_MONTH, riskLabels } from '../../../../shared/investing'
import type { Holding, PortfolioDraft } from '../../../../shared/investing'
import { parsePortfolioNumber, portfolioNumberHint } from '../../../../shared/portfolio-input'

// 숫자 키패드는 항상 끝에 이어 입력하므로, 입력 중에도 커서 걱정 없이 천단위 콤마를 바로 넣어준다.
// parsePortfolioNumber가 콤마 섞인 문자열을 이미 올바르게 해석하므로 저장값 자체를 이 형태로 둬도 안전하다.
function groupThousands(raw: string): string {
  const cleaned = raw.replace(/,/g, '')
  const [intPart, decPart] = cleaned.split('.')
  if (!intPart) return cleaned
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart === undefined ? grouped : `${grouped}.${decPart}`
}

export function EditorFrame({ title, saving, error, changed, close, submit, button, children, submitDisabled = false }: { submitDisabled?: boolean; title: string; saving: boolean; error: string | null; changed: boolean; close: () => void; submit: () => void; button: string; children: ReactNode }) {
  const { colors: c } = useTheme()

  const insets = useSafeAreaInsets()
  function cancel() {
    if (saving) return
    if (Keyboard.isVisible()) { Keyboard.dismiss(); return }
    if (changed) Alert.alert('입력한 내용을 취소할까요?', '저장하지 않은 변경만 취소해요.', [{ text: '계속 입력', style: 'cancel' }, { text: '입력 취소', style: 'destructive', onPress: close }])
    else close()
  }
  return <Modal visible animationType="slide" onRequestClose={cancel}><ThemeSurface>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: c.surface, paddingTop: insets.top }}>
      <ModalHeader title={title} close={cancel} disabled={saving} closeLabel="입력 화면 닫기" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 24 }} pointerEvents={saving ? 'none' : 'auto'}>{children}{error && <View accessibilityRole="alert" style={{ gap: 8 }}><Text style={{ color: c.danger }}>{error}</Text><Text style={{ color: c.muted }}>입력한 내용은 그대로 있어요. 확인한 뒤 다시 저장해주세요.</Text></View>}</ScrollView>
      <View style={{ padding: 20, paddingBottom: Math.max(20, insets.bottom), borderTopWidth: 1, borderTopColor: c.border }}><ActionButton fullWidth tone="primary" busy={saving} disabled={submitDisabled} label={saving ? '기록 저장 중' : button} onPress={() => { Keyboard.dismiss(); submit() }} /></View>
    </KeyboardAvoidingView>
  </ThemeSurface></Modal>
}
function Field({ label, value, change, numeric = false, unit }: { label: string; value: string; change: (value: string) => void; numeric?: boolean; unit?: string }) {
  const { colors: c } = useTheme()
 return <View style={{ gap: 8 }}><Text style={{ color: c.muted }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={text => change(numeric ? groupThousands(text) : text)} keyboardType={numeric ? 'decimal-pad' : 'default'} selectTextOnFocus={numeric} style={{ minHeight: 48, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, color: c.text }} />{unit && portfolioNumberHint(value, unit) && <Text style={{ color: c.muted }}>{portfolioNumberHint(value, unit)}</Text>}</View> }
function Choice({ label, selected, press }: { label: string; selected: boolean; press: () => void }) {
  const { colors: c } = useTheme()
 return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={press} style={{ minHeight: 48, padding: 12, borderWidth: 1, borderColor: selected ? c.primary : c.border, borderRadius: 10 }}><Text style={{ color: selected ? c.primary : c.text }}>{label}</Text></Pressable> }
// 자주 쓰는 값을 칩으로 보여주되, 눌러서 채운 뒤에도 입력창에서 직접 고쳐 쓸 수 있다(웹의 자동완성 입력과 같은 역할).
function QuickPicks({ options, value, onPick }: { options: { value: string; label: string }[]; value: string; onPick: (value: string) => void }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{options.map(o => <Choice key={o.value} label={o.label} selected={value === o.value} press={() => onPick(o.value)} />)}</View>
}
const GOAL_PRESETS = ['목돈 마련', '주택 자금', '은퇴 준비', '자녀 교육비', '비상금 마련'].map(value => ({ value, label: value }))
const MONTH_PRESETS = ([[6, '6개월'], [12, '1년'], [24, '2년'], [36, '3년'], [60, '5년'], [120, '10년']] as const).map(([months, label]) => ({ value: String(months), label }))
const amountPresets = (amounts: number[]) => amounts.map(amount => ({ value: groupThousands(String(amount)), label: `${groupThousands(String(amount))}원` }))
const CASH_PRESETS = amountPresets([1000000, 5000000, 10000000, 30000000, 50000000, 100000000])
const MONTHLY_PRESETS = amountPresets([100000, 300000, 500000, 1000000, 2000000])
const CONTRIBUTION_DAY_OPTIONS: { value: number | null; label: string }[] = [{ value: null, label: '사용 안 함' }, ...Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: `매월 ${i + 1}일` })), { value: CONTRIBUTION_LAST_DAY_OF_MONTH, label: '매월 말일' }]
const contributionDayLabel = (day: number | null) => CONTRIBUTION_DAY_OPTIONS.find(o => o.value === day)?.label ?? '사용 안 함'
export function lastContributionText(at: string | null, amount: number | null, months: number | null) {
  if (!at || amount == null) return null
  const date = new Date(at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })
  return `최근 자동 반영 · ${date} · +${amount.toLocaleString()}원${months != null && months > 1 ? ` (${months}개월치 소급)` : ''}`
}

export function HoldingRegistration({ initial, others, editing, saving, error, close, save, editExisting }: { initial: Holding; others: Holding[]; editing: boolean; saving: boolean; error: string | null; close: () => void; save: (value: Holding) => void; editExisting: (symbol: string) => void }) {
  const { colors: c } = useTheme()
  const [holding, setHolding] = useState(initial)
  const [quantity, setQuantity] = useState(initial.quantity ? String(initial.quantity) : '')
  const [cost, setCost] = useState(initial.averageCost == null ? '' : String(initial.averageCost))
  const [search, setSearch] = useState(!initial.symbol)
  const [costOpen, setCostOpen] = useState(initial.averageCost != null)
  const [advanced, setAdvanced] = useState(false)
  const [validation, setValidation] = useState<string | null>(null)
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState<Holding | null>(null)
  const [metadataMissing, setMetadataMissing] = useState(!editing && !!initial.symbol)
  const [metadataConfirmed, setMetadataConfirmed] = useState(false)
  const [checking, setChecking] = useState(!editing && !!initial.symbol)
  const metadataLookup = useRef(true)
  const quantityInput = useRef<TextInput>(null)
  useEffect(() => {
    if (editing || !initial.symbol) return
    let active = true
    void searchHoldingCatalog(request, initial.symbol).then(found => {
      const instrument = found.results.find(item => item.symbol.toUpperCase() === initial.symbol.toUpperCase())?.instrument
      if (active && metadataLookup.current && instrument) { setHolding(current => selectedHolding(current, current.symbol, current.name, instrument)); setMetadataMissing(false) }
    }).catch(() => { /* Preserve input; metadata can be completed below. */ }).finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [initial.symbol, editing])
  useEffect(() => {
    // 기록 수정은 검색 단계 없이 곧장 수량 입력으로 열리는데, pick()의 포커스 호출을 안 타므로 여기서 보완한다.
    if (!search) requestAnimationFrame(() => quantityInput.current?.focus())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const value = { ...holding, quantity: parsePortfolioNumber(quantity), averageCost: cost.trim() ? parsePortfolioNumber(cost) : null }
  const changed = JSON.stringify(value) !== JSON.stringify(initial)
  function pick(item: HoldingSearchResult) {
    const existing = others.find(row => row.symbol.toUpperCase() === item.symbol.toUpperCase())
    if (existing) { setDuplicate(existing); return }
    const reset = !!holding.symbol && holding.symbol.toUpperCase() !== item.symbol.toUpperCase()
    setSelectionNotice(reset ? '종목이 바뀌어 수량과 평균 구매 가격을 비웠어요.' : null)
    metadataLookup.current = false; setChecking(false); setMetadataConfirmed(false)
    setHolding(current => selectedHolding(current, item.symbol, item.name, item.instrument))
    if (reset) { setQuantity(''); setCost(''); setCostOpen(false) }
    setMetadataMissing(!item.instrument); setAdvanced(false); setSearch(false); setDuplicate(null); setValidation(null)
    requestAnimationFrame(() => quantityInput.current?.focus())
  }
  function switchToExisting() {
    if (!duplicate) return
    const symbol = duplicate.symbol
    if (changed) Alert.alert('기존 기록을 수정할까요?', '입력 중인 내용은 취소돼요.', [{ text: '계속 입력', style: 'cancel' }, { text: '기존 기록 수정', onPress: () => editExisting(symbol) }])
    else editExisting(symbol)
  }
  function submit() {
    if (search || checking || duplicate || (metadataMissing && !metadataConfirmed)) return
    const problem = holdingError(value, others); setValidation(problem)
    if (!problem) save(value)
    else if (problem.includes('수량')) quantityInput.current?.focus()
  }
  const quantityError = validation?.includes('수량') ? validation : null
  const costError = validation?.includes('매입가') ? '평균 구매 가격은 0보다 크게, 소수점 네 자리까지 입력해주세요.' : null
  return <EditorFrame title={editing ? '보유 자산 수정' : '보유 자산 등록'} saving={saving} submitDisabled={search || checking || !!duplicate || (metadataMissing && !metadataConfirmed)} error={(quantityError || costError ? null : validation) || error} changed={changed} close={close} submit={submit} button={editing ? '변경사항 저장' : '보유 자산 등록'}>
    <Text style={{ color: c.muted, lineHeight: 22 }}>{editing ? '현재 보유한 총수량과 평균 구매 가격을 수정해주세요.' : '종목을 선택하고 보유 수량을 입력해주세요.'}</Text>
    {!editing && <Text accessibilityLiveRegion="polite" style={{ color: c.text, fontWeight: '600' }}>{search ? '1/2 · 보유한 종목 선택' : '2/2 · 보유 수량 입력'}</Text>}
    {search ? <View style={{ gap: 16 }}><HoldingSearch registered={others.map(row => row.symbol.toUpperCase())} onSelect={pick} onQueryChange={() => setDuplicate(null)} />
      {holding.symbol && <Choice label="선택한 종목으로 돌아가기" selected={false} press={() => { setSearch(false); setDuplicate(null) }} />}
      {duplicate && <View accessibilityLiveRegion="polite" style={{ padding: 16, gap: 8, backgroundColor: c.surface, borderRadius: 12 }}><Text style={{ color: c.text }}>{duplicate.name}은 이미 등록했어요.</Text><Text style={{ color: c.muted }}>현재 보유 수량 {duplicate.quantity.toLocaleString()}주</Text><Choice label="기존 기록 수정" selected={false} press={switchToExisting} /></View>}
    </View> : <>
      <View style={{ padding: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ flex: 1, gap: 6 }}><Text style={{ color: c.muted }}>선택한 종목</Text><Text style={{ color: c.text, fontSize: 20, fontWeight: '700' }}>{holding.name}</Text><Text style={{ color: c.muted }}>{metadataMissing && !metadataConfirmed ? `${holding.symbol.replace(/\.(KS|KQ)$/i, '')} · 종목 정보 확인 필요` : holdingIdentity(holding)}</Text>{holding.assetClass === 'ETF' && !!holding.underlyingIndex && <Text style={{ color: c.muted }}>추종 지수 · {holding.underlyingIndex}</Text>}</View>
        {!editing && <Choice label="변경" selected={false} press={() => { setSearch(true); setDuplicate(null) }} />}
      </View>
      {selectionNotice && <Text accessibilityLiveRegion="polite" style={{ color: c.muted }}>{selectionNotice}</Text>}
      {checking && <Text accessibilityLiveRegion="polite" style={{ color: c.muted }}>종목 정보를 확인하고 있어요…</Text>}
      <View style={{ gap: 8 }}><Text style={{ color: c.text, fontWeight: '600' }}>보유 수량</Text><View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: quantityError ? c.danger : c.border, borderRadius: 12 }}>
        <TextInput ref={quantityInput} accessibilityLabel="보유 수량" keyboardType="decimal-pad" value={quantity} onChangeText={text => { setQuantity(groupThousands(text)); setValidation(null) }} selectTextOnFocus returnKeyType="done" onSubmitEditing={Keyboard.dismiss} style={{ flex: 1, minHeight: 56, padding: 14, fontSize: 24, color: c.text }} /><Text style={{ paddingRight: 16, color: c.muted }}>주</Text></View>
        {quantityError && <Text accessibilityRole="alert" style={{ color: c.danger }}>{quantityError}</Text>}
        <Text style={{ color: c.muted, lineHeight: 20 }}>현재 보유한 총수량을 입력해주세요. 소수점 네 자리까지 입력할 수 있어요.</Text>
        {!!quantity && portfolioNumberHint(quantity, '주') && <Text style={{ color: c.muted }}>{portfolioNumberHint(quantity, '주')}</Text>}
      </View>
      {costOpen ? <View style={{ gap: 8 }}><Field label={`평균 구매 가격 (선택) · ${holding.currency === 'KRW' ? '원 / 주' : '달러 / 주'}`} value={cost} change={text => { setCost(text); setValidation(null) }} numeric unit={holding.currency === 'KRW' ? '원' : '달러'} />
        {costError && <Text accessibilityRole="alert" style={{ color: c.danger }}>{costError}</Text>}
        <Text style={{ color: c.muted, lineHeight: 22 }}>증권 앱에 표시된 평균단가를 입력해주세요. 총 구매 금액이 아니에요.</Text><Text style={{ color: c.muted }}>비워두면 이 종목의 손익은 계산하지 않아요.</Text>
      </View> : <Pressable accessibilityRole="button" onPress={() => setCostOpen(true)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.primary }}>＋ 평균 구매 가격 입력 (선택)</Text></Pressable>}
      {(editing || metadataMissing) && <View style={{ gap: 12 }}><Choice label={metadataMissing ? '종목 정보 보완' : `저장된 종목 정보 ${advanced ? '접기' : '수정'}`} selected={advanced || (metadataMissing && !checking)} press={() => setAdvanced(!advanced)} />
        {(advanced || (metadataMissing && !checking)) && <View style={{ gap: 18 }}>
          {metadataMissing && <Text style={{ color: c.muted }}>자동 확인하지 못한 정보가 있어요. 분류와 통화를 확인해주세요.</Text>}
          <Field label="종목 이름" value={holding.name} change={name => setHolding({ ...holding, name })} />
          <Text style={{ color: c.muted }}>자산 분류</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['STOCK', 'ETF', 'BOND', 'OTHER'] as const).map(assetClass => <Choice key={assetClass} label={assetLabels[assetClass]} selected={holding.assetClass === assetClass} press={() => setHolding({ ...holding, assetClass })} />)}</View>
          <Text style={{ color: c.muted }}>가격 통화</Text><View style={{ flexDirection: 'row', gap: 8 }}>{(['KRW', 'USD'] as const).map(currency => <Choice key={currency} label={currency === 'KRW' ? '원화' : '달러'} selected={holding.currency === currency} press={() => setHolding({ ...holding, currency })} />)}</View>
          <Text style={{ color: c.muted }}>기록된 지역</Text><View style={{ flexDirection: 'row', gap: 8 }}>{(['KR', 'US', 'GLOBAL'] as const).map(region => <Choice key={region} label={{ KR: '한국', US: '미국', GLOBAL: '글로벌' }[region]} selected={holding.region === region} press={() => setHolding({ ...holding, region })} />)}</View>
          <Field label="분야" value={holding.sector} change={sector => setHolding({ ...holding, sector })} />{holding.assetClass === 'ETF' && <Field label="추종 지수" value={holding.underlyingIndex} change={underlyingIndex => setHolding({ ...holding, underlyingIndex })} />}
          {metadataMissing && <Choice label="종목 이름·분류·통화를 확인했어요" selected={metadataConfirmed} press={() => setMetadataConfirmed(!metadataConfirmed)} />}
        </View>}
      </View>}
    </>}
    <Text style={{ color: c.muted, lineHeight: 22 }}>실제 주문 없이 보유 내역만 저장해요.</Text>
  </EditorFrame>
}
export function PortfolioPlanEditor({ initial, saving, error, close, save, lastContributionAppliedAt = null, lastContributionAppliedAmount = null, lastContributionAppliedMonths = null }: { initial: PortfolioDraft; saving: boolean; error: string | null; close: () => void; save: (value: PortfolioDraft) => void; lastContributionAppliedAt?: string | null; lastContributionAppliedAmount?: number | null; lastContributionAppliedMonths?: number | null }) {
  const { colors: c } = useTheme()
  const [dayPickerOpen, setDayPickerOpen] = useState(false)
  const [draft, setDraft] = useState(initial)
  const [cash, setCash] = useState(String(initial.cash)), [months, setMonths] = useState(String(initial.horizonMonths)), [monthly, setMonthly] = useState(String(initial.monthlyContribution))
  const value = { ...draft, cash: parsePortfolioNumber(cash), horizonMonths: parsePortfolioNumber(months), monthlyContribution: parsePortfolioNumber(monthly) }
  return <EditorFrame title="현금·투자 계획" saving={saving} error={error} changed={JSON.stringify(value) !== JSON.stringify(initial)} close={close} submit={() => save(value)} button="계획 저장하기">
    <Field label="보유 현금 · 원" value={cash} change={setCash} numeric unit="원" /><QuickPicks options={CASH_PRESETS} value={cash} onPick={setCash} />
    <Field label="투자 목표" value={draft.goal} change={goal => setDraft({ ...draft, goal })} /><QuickPicks options={GOAL_PRESETS} value={draft.goal} onPick={goal => setDraft({ ...draft, goal })} />
    <Field label="투자 기간 · 개월" value={months} change={setMonths} numeric /><QuickPicks options={MONTH_PRESETS} value={months} onPick={setMonths} />
    <Text style={{ color: c.muted }}>투자 성향</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{Object.entries(riskLabels).map(([key, label]) => <Choice key={key} label={label} selected={draft.riskLevel === key} press={() => setDraft({ ...draft, riskLevel: key as PortfolioDraft['riskLevel'] })} />)}</View>
    <Text style={{ color: c.muted }}>계좌 종류</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{Object.entries(accountLabels).map(([key, label]) => <Choice key={key} label={label} selected={draft.accountType === key} press={() => setDraft({ ...draft, accountType: key as PortfolioDraft['accountType'] })} />)}</View>
    <Field label="월 추가 투자금 · 원" value={monthly} change={setMonthly} numeric unit="원" /><QuickPicks options={MONTHLY_PRESETS} value={monthly} onPick={setMonthly} />
    <View style={{ gap: 8 }}>
      <Text style={{ color: c.text, fontWeight: '600' }}>월 추가 투자금 자동 반영</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`월 추가 투자금 자동 반영 · ${contributionDayLabel(draft.contributionDay)}`} onPress={() => setDayPickerOpen(true)} style={{ minHeight: 48, justifyContent: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14 }}>
        <Text style={{ color: c.text }}>{contributionDayLabel(draft.contributionDay)}</Text>
      </Pressable>
      <Text style={{ color: c.muted, fontSize: 13 }}>{draft.contributionDay != null ? '지정한 날짜가 지나면 보유 현금에 자동으로 더해요. 오래 접속하지 않았다면 최대 12개월까지 소급 반영해요.' : '지정하면 매달 정해진 날짜에 월 추가 투자금만큼 보유 현금이 자동으로 늘어나요.'}</Text>
      {lastContributionText(lastContributionAppliedAt, lastContributionAppliedAmount, lastContributionAppliedMonths) && <Text style={{ color: c.muted, fontSize: 13 }}>{lastContributionText(lastContributionAppliedAt, lastContributionAppliedAmount, lastContributionAppliedMonths)}</Text>}
    </View>
    <AppSheet open={dayPickerOpen} title="자동 반영 날짜 선택" close={() => setDayPickerOpen(false)}>
      <AppSheetScrollView>{CONTRIBUTION_DAY_OPTIONS.map(o => <Pressable key={o.label} accessibilityRole="button" accessibilityState={{ selected: draft.contributionDay === o.value }} onPress={() => { setDraft({ ...draft, contributionDay: o.value }); setDayPickerOpen(false) }} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: draft.contributionDay === o.value ? c.primary : c.text }}>{o.label}</Text></Pressable>)}</AppSheetScrollView>
    </AppSheet>
  </EditorFrame>
}
