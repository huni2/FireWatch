// Android에서 키보드와 뒤로가기를 고려한 별도 자산·계획 입력 화면을 제공한다.
import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StockSearchInput } from '../stocks/components/StockSearchInput'
import { holdingError, selectedHolding } from '../../../../shared/holding-registration'
import { accountLabels, assetLabels, riskLabels } from '../../../../shared/investing'
import type { Holding, PortfolioDraft } from '../../../../shared/investing'
import tokens from '../../../../shared/design-tokens.json'
const c = tokens.light

function EditorFrame({ title, saving, error, changed, close, submit, button, children }: { title: string; saving: boolean; error: string | null; changed: boolean; close: () => void; submit: () => void; button: string; children: ReactNode }) {
  const insets = useSafeAreaInsets()
  function cancel() {
    if (saving) return
    if (Keyboard.isVisible()) { Keyboard.dismiss(); return }
    if (changed) Alert.alert('입력한 내용을 취소할까요?', '저장하지 않은 변경만 취소해요.', [{ text: '계속 입력', style: 'cancel' }, { text: '입력 취소', style: 'destructive', onPress: close }])
    else close()
  }
  return <Modal visible animationType="slide" onRequestClose={cancel}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: c.surface, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}><Pressable accessibilityRole="button" accessibilityLabel="입력 화면 닫기" disabled={saving} onPress={cancel} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.muted }}>닫기</Text></Pressable><Text style={{ flex: 1, fontSize: 20, fontWeight: '700', color: c.text }}>{title}</Text></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 24 }} pointerEvents={saving ? 'none' : 'auto'}>{children}{error && <View accessibilityRole="alert" style={{ gap: 8 }}><Text style={{ color: '#B42318' }}>{error}</Text><Text style={{ color: c.muted }}>입력한 내용은 그대로 있어요. 확인한 뒤 다시 저장해주세요.</Text></View>}</ScrollView>
      <View style={{ padding: 20, paddingBottom: Math.max(20, insets.bottom), borderTopWidth: 1, borderTopColor: c.border }}><Pressable accessibilityRole="button" accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => { Keyboard.dismiss(); submit() }} style={{ minHeight: 52, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', opacity: saving ? .6 : 1 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{saving ? '기록 저장 중…' : button}</Text></Pressable></View>
    </KeyboardAvoidingView>
  </Modal>
}
function Field({ label, value, change, numeric = false }: { label: string; value: string; change: (value: string) => void; numeric?: boolean }) { return <View style={{ gap: 8 }}><Text style={{ color: c.muted }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={change} keyboardType={numeric ? 'decimal-pad' : 'default'} style={{ minHeight: 48, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, color: c.text }} /></View> }
function Choice({ label, selected, press }: { label: string; selected: boolean; press: () => void }) { return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={press} style={{ minHeight: 44, padding: 12, borderWidth: 1, borderColor: selected ? c.accent : c.border, borderRadius: 10 }}><Text style={{ color: selected ? c.accent : c.text }}>{label}</Text></Pressable> }

export function HoldingRegistration({ initial, others, editing, saving, error, close, save }: { initial: Holding; others: Holding[]; editing: boolean; saving: boolean; error: string | null; close: () => void; save: (value: Holding) => void }) {
  const [holding, setHolding] = useState(initial)
  const [quantity, setQuantity] = useState(initial.quantity ? String(initial.quantity) : '')
  const [cost, setCost] = useState(initial.averageCost == null ? '' : String(initial.averageCost))
  const [search, setSearch] = useState(!initial.symbol)
  const [costOpen, setCostOpen] = useState(initial.averageCost != null)
  const [advanced, setAdvanced] = useState(false)
  const [validation, setValidation] = useState<string | null>(null)
  const quantityInput = useRef<TextInput>(null)
  const value = { ...holding, quantity: Number(quantity), averageCost: cost.trim() ? Number(cost) : null }
  function submit() { const problem = holdingError(value, others); setValidation(problem); if (!problem) save(value) }
  return <EditorFrame title={editing ? '보유 기록 수정' : '보유 자산 등록'} saving={saving} error={validation || error} changed={JSON.stringify(value) !== JSON.stringify(initial)} close={close} submit={submit} button={editing ? '수정한 기록 저장하기' : '등록하고 점검하기'}>
    <Text style={{ fontSize: 24, fontWeight: '700', color: c.text }}>어떤 주식을 갖고 있나요?</Text><Text style={{ color: c.muted, lineHeight: 22 }}>실제 구매가 아닌 보유 기록이에요. 매입가는 나중에 입력해도 돼요.</Text>
    {search ? <StockSearchInput onSelect={(symbol, name) => { setHolding(current => selectedHolding(current, symbol, name)); setSearch(false); setValidation(null); requestAnimationFrame(() => quantityInput.current?.focus()) }} /> : <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><View style={{ flex: 1, gap: 6 }}><Text style={{ color: c.text, fontSize: 20, fontWeight: '700' }}>{holding.name}</Text><Text style={{ color: c.muted }}>{holding.currency === 'KRW' ? '원화' : '달러'} · {assetLabels[holding.assetClass]}</Text></View><Choice label="다시 선택" selected={false} press={() => setSearch(true)} /></View>}
    <View style={{ gap: 10 }}><Text style={{ color: c.text }}>몇 주를 갖고 있나요?</Text><TextInput ref={quantityInput} accessibilityLabel="보유 수량" keyboardType="decimal-pad" value={quantity} onChangeText={setQuantity} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} style={{ minHeight: 56, padding: 14, fontSize: 24, color: c.text, borderWidth: 1, borderColor: c.border, borderRadius: 12 }} /><Text style={{ color: c.muted }}>주 · 소수점 네 자리까지 입력할 수 있어요.</Text></View>
    {costOpen ? <View style={{ gap: 8 }}><Field label={`평균 매입가 · 선택 · ${holding.currency === 'KRW' ? '원' : '달러'}`} value={cost} change={setCost} numeric /><Choice label="매입가 없이 기록하기" selected={false} press={() => { setCost(''); setCostOpen(false) }} /></View> : <Choice label="매입가도 기록하기" selected={false} press={() => setCostOpen(true)} />}
    <Choice label={`상품 정보 ${advanced ? '접기' : '더 확인하기'}`} selected={advanced} press={() => setAdvanced(!advanced)} />
    {advanced && <View style={{ gap: 18 }}><Field label="자산 이름" value={holding.name} change={name => setHolding({ ...holding, name })} /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['STOCK', 'ETF', 'BOND', 'OTHER'] as const).map(assetClass => <Choice key={assetClass} label={assetLabels[assetClass]} selected={holding.assetClass === assetClass} press={() => setHolding({ ...holding, assetClass })} />)}</View><View style={{ flexDirection: 'row', gap: 8 }}>{(['KRW', 'USD'] as const).map(currency => <Choice key={currency} label={currency === 'KRW' ? '원화' : '달러'} selected={holding.currency === currency} press={() => setHolding({ ...holding, currency })} />)}</View><View style={{ flexDirection: 'row', gap: 8 }}>{(['KR', 'US', 'GLOBAL'] as const).map(region => <Choice key={region} label={{ KR: '한국', US: '미국', GLOBAL: '글로벌' }[region]} selected={holding.region === region} press={() => setHolding({ ...holding, region })} />)}</View><Field label="분야" value={holding.sector} change={sector => setHolding({ ...holding, sector })} />{holding.assetClass === 'ETF' && <Field label="추종 지수" value={holding.underlyingIndex} change={underlyingIndex => setHolding({ ...holding, underlyingIndex })} />}</View>}
    <Text style={{ color: c.muted, lineHeight: 22 }}>비중은 수집 시세 기준으로 계산해요. 매입가가 없으면 손익은 표시하지 않아요.</Text>
  </EditorFrame>
}

export function PortfolioPlanEditor({ initial, saving, error, close, save }: { initial: PortfolioDraft; saving: boolean; error: string | null; close: () => void; save: (value: PortfolioDraft) => void }) {
  const [draft, setDraft] = useState(initial)
  const [cash, setCash] = useState(String(initial.cash)), [months, setMonths] = useState(String(initial.horizonMonths)), [monthly, setMonthly] = useState(String(initial.monthlyContribution))
  const value = { ...draft, cash: Number(cash), horizonMonths: Number(months), monthlyContribution: Number(monthly) }
  return <EditorFrame title="현금·투자 계획" saving={saving} error={error} changed={JSON.stringify(value) !== JSON.stringify(initial)} close={close} submit={() => save(value)} button="계획 저장하기">
    <Field label="보유 현금 · 원" value={cash} change={setCash} numeric /><Field label="투자 목표" value={draft.goal} change={goal => setDraft({ ...draft, goal })} /><Field label="투자 기간 · 개월" value={months} change={setMonths} numeric />
    <Text style={{ color: c.muted }}>투자 성향</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{Object.entries(riskLabels).map(([key, label]) => <Choice key={key} label={label} selected={draft.riskLevel === key} press={() => setDraft({ ...draft, riskLevel: key as PortfolioDraft['riskLevel'] })} />)}</View>
    <Text style={{ color: c.muted }}>계좌 종류</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{Object.entries(accountLabels).map(([key, label]) => <Choice key={key} label={label} selected={draft.accountType === key} press={() => setDraft({ ...draft, accountType: key as PortfolioDraft['accountType'] })} />)}</View><Field label="월 추가 투자금 · 원" value={monthly} change={setMonthly} numeric />
  </EditorFrame>
}
