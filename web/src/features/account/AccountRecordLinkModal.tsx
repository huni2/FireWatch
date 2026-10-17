import { useState } from 'react'
import { Alert, Button, Modal, Radio } from 'antd'
import { accountRecordSummary, type AccountRecordComparison, type AccountRecordChoice, type AccountRecordSnapshot } from '../../../../shared/account-record-link'
import { stockLabel } from '../../../../shared/stock-labels'

function Records({ title, data }: { title: string; data: AccountRecordSnapshot }) {
  return <section style={{ border: '1px solid var(--border-color, #ddd)', borderRadius: 12, padding: 16, flex: '1 1 240px', minWidth: 0 }}>
    <h3>{title}</h3><p>{data.accountType === 'ISA' ? 'ISA' : data.accountType === 'PENSION' ? '연금' : '일반'} 계좌 · {data.goal}</p><p>보유 {data.holdings.length}개 · 현금 {data.cash.toLocaleString('ko-KR')}원</p>
    {data.noteCount !== undefined && <p>투자 메모 {data.noteCount}개 · 양쪽에 같은 종목의 메모가 있으면 선택한 쪽을 우선해요.</p>}
    <ul>{data.holdings.map(h => <li key={h.symbol}>{h.name} · {h.quantity.toLocaleString('ko-KR')}주 · 매입가 {h.averageCost == null ? '미입력' : `${h.averageCost.toLocaleString('ko-KR')}${h.currency === 'KRW' ? '원' : '달러'}`}</li>)}</ul>
    <p>관심 기업 {data.watchedStocks.length}개{data.watchedStocks.length ? ` · ${data.watchedStocks.map(s => data.watchedNames?.[s] ?? stockLabel(s)).join(', ')}` : ''}</p>
  </section>
}
export function AccountRecordLinkModal({ comparison, busy, error, close, confirm }: {
  comparison: AccountRecordComparison; busy: boolean; error: string; close(): void; confirm(choice: AccountRecordChoice): void
}) {
  const [mode, setMode] = useState<AccountRecordChoice['mode'] | null>(null)
  const [cashSource, setCashSource] = useState<AccountRecordChoice['cashSource']>('ACCOUNT')
  const summary = accountRecordSummary(comparison)
  const hasAssets = comparison.device.holdings.length > 0 || comparison.device.cash > 0
  const hasDeviceRecords = hasAssets || (comparison.device.noteCount ?? 0) > 0
  const mergeBlocked = summary.watches > 20 || (hasAssets && summary.holdings > 50)
  return <Modal open title="기록을 어떻게 연결할까요?" width={760} onCancel={close} maskClosable={false} closable={!busy} keyboard={!busy}
    styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }} footer={<><Button disabled={busy} onClick={close}>취소</Button><Button type="primary" loading={busy} disabled={!mode || (mode !== 'ACCOUNT' && mergeBlocked)} onClick={() => { if (mode) confirm({ mode, cashSource, fingerprint: comparison.fingerprint }) }}>선택한 방법으로 연결</Button></>}>
    <p>연결하기 전 기록을 비교해보세요. 취소하면 어느 쪽도 바뀌지 않아요.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}><Records title="이 기기의 기록" data={comparison.device} /><Records title="Google 계정의 기록" data={comparison.account} /></div>
    <h3>연결 방법</h3>
    <Radio.Group disabled={busy} value={mode} onChange={e => setMode(e.target.value)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Radio value="ACCOUNT">계정 기록만 사용</Radio>
      <Radio value="MERGE_ACCOUNT">{hasDeviceRecords ? '합치고, 중복은 계정 값 유지' : '관심 기업 합치기'}</Radio>
      {hasDeviceRecords && <Radio value="MERGE_DEVICE">합치고, 중복은 기기 값으로 업데이트</Radio>}
    </Radio.Group>
    {mode === 'ACCOUNT' && <p>기기 기록을 합치지 않고 로그인해요. 기기 원본은 덮어쓰거나 삭제하지 않아요.</p>}
    {mode && mode !== 'ACCOUNT' && <>
      {mergeBlocked && <Alert type="warning" message="합친 기록이 보유 50개 또는 관심 기업 20개 한도를 넘어요. 기기 기록을 정리하거나 ‘계정 기록만 사용’을 선택해주세요." />}
      <p>합치면 보유 {summary.holdings}개 · 관심 기업 {summary.watches}개예요. 관심 기업은 중복을 하나로 정리해요.</p>
      {hasAssets && <><p>중복 보유 {summary.duplicates.length}개{summary.duplicates.length ? ` · ${summary.duplicates.map(h => h.name).join(', ')}` : ''}. 수량은 더하지 않고 선택한 쪽의 수량·매입가·분류를 사용해요.</p>
      <h3>현금은 어느 기록을 사용할까요?</h3>
      <Radio.Group disabled={busy} value={cashSource} onChange={e => setCashSource(e.target.value)}><Radio value="ACCOUNT">계정 {comparison.account.cash.toLocaleString('ko-KR')}원</Radio><Radio value="DEVICE">기기 {comparison.device.cash.toLocaleString('ko-KR')}원</Radio></Radio.Group>
      <p>현금은 합산하지 않아요. 투자 목표·기간·성향·계좌 설정은 기존 계정 설정을 유지해요. 계정에 포트폴리오가 없으면 기기 설정을 이어받아요.</p></>}
    </>}
    {error && <Alert type="error" message={error} style={{ marginTop: 16 }} />}
  </Modal>
}
