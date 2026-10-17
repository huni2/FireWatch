import { useState } from 'react'
import { Text, View } from 'react-native'
import { AppSheet, AppSheetScrollView } from '@/components/AppSheet'
import { ActionButton } from '@/components/ActionButton'
import { ChoiceTabs } from '@/components/ChoiceTabs'
import { accountRecordSummary, type AccountRecordChoice, type AccountRecordComparison, type AccountRecordSnapshot } from '../../../../../shared/account-record-link'
import { stockLabel } from '../../../../../shared/stock-labels'

function Records({ label, data }: { label: string; data: AccountRecordSnapshot }) {
  return <View className="gap-2 rounded-xl border border-line p-4">
    <Text className="text-base font-bold text-ink">{label}</Text>
    <Text className="text-sm text-muted">{data.accountType === 'ISA' ? 'ISA' : data.accountType === 'PENSION' ? '연금' : '일반'} 계좌 · {data.goal}</Text>
    <Text className="text-sm text-ink">보유 {data.holdings.length}개 · 현금 {data.cash.toLocaleString('ko-KR')}원</Text>
    {data.noteCount !== undefined && <Text className="text-sm text-muted">투자 메모 {data.noteCount}개 · 양쪽에 같은 종목의 메모가 있으면 선택한 쪽을 우선해요.</Text>}
    {data.holdings.map(h => <Text key={h.symbol} className="text-sm text-ink">{h.name} · {h.quantity.toLocaleString('ko-KR')}주 · 매입가 {h.averageCost == null ? '미입력' : `${h.averageCost.toLocaleString('ko-KR')}${h.currency === 'KRW' ? '원' : '달러'}`}</Text>)}
    <Text className="text-sm text-muted">관심 기업 {data.watchedStocks.length}개{data.watchedStocks.length ? ` · ${data.watchedStocks.map(s => data.watchedNames?.[s] ?? stockLabel(s)).join(', ')}` : ''}</Text>
  </View>
}
export function AccountRecordLinkSheet({ comparison, busy, error, close, confirm }: {
  comparison: AccountRecordComparison; busy: boolean; error: string | null; close(): void; confirm(choice: AccountRecordChoice): void
}) {
  const [mode, setMode] = useState<AccountRecordChoice['mode'] | null>(null)
  const [cashSource, setCashSource] = useState<AccountRecordChoice['cashSource']>('ACCOUNT')
  const summary = accountRecordSummary(comparison)
  const hasAssets = comparison.device.holdings.length > 0 || comparison.device.cash > 0
  const hasDeviceRecords = hasAssets || (comparison.device.noteCount ?? 0) > 0
  const mergeBlocked = summary.watches > 20 || (hasAssets && summary.holdings > 50)
  return <AppSheet open title="기록을 어떻게 연결할까요?" close={close} disabled={busy} footer={<ActionButton fullWidth tone="primary" label="선택한 방법으로 연결" busy={busy} disabled={!mode || (mode !== 'ACCOUNT' && mergeBlocked)} onPress={() => { if (mode) confirm({ mode, cashSource, fingerprint: comparison.fingerprint }) }} />}>
    <AppSheetScrollView>
      <Text className="text-sm text-muted">연결하기 전 기록을 비교해보세요. 취소하면 어느 쪽도 바뀌지 않아요.</Text>
      <Records label="이 기기의 기록" data={comparison.device} />
      <Records label="Google 계정의 기록" data={comparison.account} />
      <Text className="text-base font-bold text-ink">연결 방법</Text>
      <ActionButton fullWidth selected={mode === 'ACCOUNT'} label="계정 기록만 사용" onPress={() => setMode('ACCOUNT')} disabled={busy} />
      <Text className="text-sm text-muted">기기 기록을 합치지 않고 로그인해요. 기기 원본은 덮어쓰거나 삭제하지 않아요.</Text>
      <ActionButton fullWidth selected={mode === 'MERGE_ACCOUNT'} label={hasDeviceRecords ? '합치고, 중복은 계정 값 유지' : '관심 기업 합치기'} onPress={() => setMode('MERGE_ACCOUNT')} disabled={busy} />
      {hasDeviceRecords && <ActionButton fullWidth selected={mode === 'MERGE_DEVICE'} label="합치고, 중복은 기기 값으로 업데이트" onPress={() => setMode('MERGE_DEVICE')} disabled={busy} />}
      {mode && <Text accessibilityLiveRegion="polite" className="text-sm font-semibold text-ink">선택됨 · {mode === 'ACCOUNT' ? '계정 기록만 사용' : mode === 'MERGE_ACCOUNT' ? '합치고 계정 값 유지' : '합치고 기기 값으로 업데이트'}</Text>}
      {mode && mode !== 'ACCOUNT' && <>
        {mergeBlocked && <Text accessibilityRole="alert" className="text-sm text-danger">합친 기록이 보유 50개 또는 관심 기업 20개 한도를 넘어요. 기기 기록을 정리하거나 ‘계정 기록만 사용’을 선택해주세요.</Text>}
        <Text className="text-sm text-ink">합치면 보유 {summary.holdings}개 · 관심 기업 {summary.watches}개예요. 관심 기업은 중복을 하나로 정리해요.</Text>
        {hasAssets && <><Text className="text-sm text-muted">중복 보유 {summary.duplicates.length}개{summary.duplicates.length ? ` · ${summary.duplicates.map(h => h.name).join(', ')}` : ''}. 수량은 더하지 않고 선택한 쪽의 수량·매입가·분류를 사용해요.</Text>
        <Text className="text-sm font-semibold text-ink">현금은 어느 기록을 사용할까요?</Text>
        <ChoiceTabs<AccountRecordChoice['cashSource']> label="현금 기록 선택" disabled={busy} value={cashSource} onChange={setCashSource} options={[{ value: 'ACCOUNT', label: `계정 ${comparison.account.cash.toLocaleString('ko-KR')}원` }, { value: 'DEVICE', label: `기기 ${comparison.device.cash.toLocaleString('ko-KR')}원` }]} />
        <Text className="text-xs text-muted">현금은 합산하지 않아요. 투자 목표·기간·성향·계좌 설정은 기존 계정 설정을 유지해요. 계정에 포트폴리오가 없으면 기기 설정을 이어받아요.</Text></>}
      </>}
      {error && <Text accessibilityRole="alert" className="text-sm text-danger">{error}</Text>}
    </AppSheetScrollView>
  </AppSheet>
}
