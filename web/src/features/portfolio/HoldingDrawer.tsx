import { AppDrawer as Drawer } from '../../components/AppDrawer'
import { useEffect, useId, useRef, useState } from 'react'
import type { ElementRef } from 'react'
import { Alert, App, Button, Checkbox, ConfigProvider, Input, InputNumber, Select, Space, Typography } from 'antd'
import type { Holding } from '../../../../shared/investing'
import { assetLabels } from '../../../../shared/investing'
import { holdingError, holdingIdentity, selectedHolding } from '../../../../shared/holding-registration'
import { searchHoldingCatalog, type HoldingSearchResult } from '../../../../shared/holding-search'
import { request } from '../../lib/api'
import { HoldingSearch } from './HoldingSearch'

// 입력 중엔 그대로 두고(커서 점프 방지), 입력을 멈췄을 때만 천단위 콤마로 보여준다.
function formatCommitted(value: number | string | undefined) {
  if (value == null || String(value) === '') return ''
  const [intPart, decPart] = String(Number(value)).split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart == null ? grouped : `${grouped}.${decPart}`
}

export function HoldingDrawer({ initial, others, editing, saving, error, close, returnFocus, save, editExisting }: { initial: Holding; others: Holding[]; editing: boolean; saving: boolean; error: string | null; close: () => void; returnFocus: () => void; save: (value: Holding) => void; editExisting: (symbol: string) => void }) {
  const [holding, setHolding] = useState(initial)
  const [search, setSearch] = useState(!initial.symbol)
  const [costOpen, setCostOpen] = useState(initial.averageCost != null)
  const [validation, setValidation] = useState<string | null>(null)
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState<Holding | null>(null)
  const [metadataMissing, setMetadataMissing] = useState(!editing && !!initial.symbol)
  const [metadataConfirmed, setMetadataConfirmed] = useState(false)
  const [checking, setChecking] = useState(!editing && !!initial.symbol)
  const metadataLookup = useRef(true)
  const quantity = useRef<ElementRef<typeof InputNumber>>(null)
  const formId = useId()
  const { modal } = App.useApp()
  useEffect(() => {
    if (editing || !initial.symbol) return
    let active = true
    void searchHoldingCatalog(request, initial.symbol).then(found => {
      const instrument = found.results.find(item => item.symbol.toUpperCase() === initial.symbol.toUpperCase())?.instrument
      if (active && metadataLookup.current && instrument) { setHolding(current => selectedHolding(current, current.symbol, current.name, instrument)); setMetadataMissing(false) }
    }).catch(() => { /* Preserve input; metadata can be completed below. */ }).finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [initial.symbol, editing])
  const changed = JSON.stringify(holding) !== JSON.stringify(initial)
  function cancel() {
    if (saving) return
    if (changed) {
      let discarded = false
      modal.confirm({ title: '입력한 내용을 취소할까요?', okText: '입력 취소', cancelText: '계속 입력', onOk: () => { discarded = true; close() }, afterClose: () => { if (discarded) returnFocus() } })
    } else close()
  }
  function change(patch: Partial<Holding>) { setHolding(current => ({ ...current, ...patch })); setValidation(null) }
  function pick(item: HoldingSearchResult) {
    const existing = others.find(row => row.symbol.toUpperCase() === item.symbol.toUpperCase())
    if (existing) { setDuplicate(existing); return }
    const reset = !!holding.symbol && holding.symbol !== item.symbol
    setSelectionNotice(reset ? '종목이 바뀌어 수량과 평균 구매 가격을 비웠어요.' : null)
    metadataLookup.current = false; setChecking(false); setMetadataConfirmed(false)
    setHolding(current => selectedHolding(current, item.symbol, item.name, item.instrument))
    setMetadataMissing(!item.instrument); setSearch(false); setDuplicate(null); setValidation(null)
    if (reset) setCostOpen(false)
    requestAnimationFrame(() => quantity.current?.focus())
  }
  function switchToExisting() {
    if (!duplicate) return
    const symbol = duplicate.symbol
    if (changed) modal.confirm({ title: '입력 중인 내용을 취소하고 기존 기록을 수정할까요?', okText: '기존 기록 수정', cancelText: '계속 입력', onOk: () => editExisting(symbol) })
    else editExisting(symbol)
  }
  function submit() {
    if (search || checking || duplicate || (metadataMissing && !metadataConfirmed)) return
    const problem = holdingError(holding, others); setValidation(problem)
    if (!problem) save(holding)
    else if (problem.includes('수량')) quantity.current?.focus()
  }
  const quantityError = validation?.includes('수량') ? validation : null
  const costError = validation?.includes('매입가') ? '평균 구매 가격은 0보다 크게, 소수점 네 자리까지 입력해주세요.' : null
  return <Drawer open title={editing ? '보유 자산 수정' : '보유 자산 등록'} width="min(480px, 100vw)" onClose={cancel} closable={!saving} maskClosable={!saving} keyboard={!saving} className="holding-drawer"
    footer={<Button block type="primary" size="large" aria-label={editing ? '변경사항 저장' : '보유 자산 등록'} aria-busy={saving} loading={saving} disabled={saving || search || checking || !!duplicate || (metadataMissing && !metadataConfirmed)} htmlType="submit" form={formId}>{editing ? '변경사항 저장' : '보유 자산 등록'}</Button>}>
    <ConfigProvider componentDisabled={saving}><form id={formId} aria-label="보유 자산 입력" onSubmit={event => { event.preventDefault(); submit() }}><Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Typography.Text type="secondary">{editing ? '현재 보유한 총수량과 평균 구매 가격을 수정해주세요.' : '종목을 선택하고 보유 수량을 입력해주세요.'}</Typography.Text>
      {!editing && <Typography.Text role="status" strong>{search ? '1/2 · 보유한 종목 선택' : '2/2 · 보유 수량 입력'}</Typography.Text>}
      {search ? <><HoldingSearch id={`${formId}-search`} registered={others.map(row => row.symbol.toUpperCase())} onSelect={pick} onQueryChange={() => setDuplicate(null)} />
        {holding.symbol && <Button onClick={() => { setSearch(false); setDuplicate(null) }}>선택한 종목으로 돌아가기</Button>}
        {duplicate && <Alert type="info" message={`${duplicate.name}은 이미 등록했어요.`} description={`현재 보유 수량 ${duplicate.quantity.toLocaleString()}주`} action={<Button onClick={switchToExisting}>기존 기록 수정</Button>} />}
      </> : <>
        <div className="holding-selected"><div><small>선택한 종목</small><strong>{holding.name}</strong><small>{metadataMissing && !metadataConfirmed ? `${holding.symbol.replace(/\.(KS|KQ)$/i, '')} · 종목 정보 확인 필요` : holdingIdentity(holding)}</small>{holding.assetClass === 'ETF' && holding.underlyingIndex && <small>추종 지수 · {holding.underlyingIndex}</small>}</div>
          {!editing && <Button onClick={() => { setSearch(true); setDuplicate(null) }}>변경</Button>}</div>
        {selectionNotice && <Typography.Text role="status" type="secondary">{selectionNotice}</Typography.Text>}
        {checking && <Typography.Text role="status">종목 정보를 확인하고 있어요…</Typography.Text>}
        <div><label className="holding-field" htmlFor={`${formId}-quantity`}>보유 수량<InputNumber id={`${formId}-quantity`} ref={quantity} aria-label="보유 수량" aria-invalid={!!quantityError} aria-describedby={`${formId}-quantity-hint`} status={quantityError ? 'error' : undefined} size="large" min={0.0001} max={1e9} precision={4} formatter={(value, info) => info.userTyping ? info.input : formatCommitted(value)} value={holding.quantity || null} onChange={value => change({ quantity: value ?? 0 })} addonAfter="주" style={{ width: '100%' }} /></label>
          <Space wrap style={{ marginTop: 8 }}>{[-100, -10, -1, 1, 10, 100].map(delta => <Button key={delta} size="small" aria-label={`보유 수량 ${delta > 0 ? delta + '개 추가' : Math.abs(delta) + '개 빼기'}`} onClick={() => change({ quantity: Math.max(0, Math.round(((holding.quantity || 0) + delta) * 10000) / 10000) })}>{delta > 0 ? `+${delta}` : delta}</Button>)}</Space>
          <div id={`${formId}-quantity-hint`}>{quantityError ? <Typography.Text role="alert" type="danger">{quantityError}</Typography.Text> : <Typography.Text type="secondary">현재 보유한 총수량을 입력해주세요. 소수점 네 자리까지 입력할 수 있어요.</Typography.Text>}</div></div>
        {costOpen ? <div><label className="holding-field" htmlFor={`${formId}-cost`}>평균 구매 가격 (선택)<InputNumber id={`${formId}-cost`} aria-label="평균 구매 가격" aria-invalid={!!costError} aria-describedby={`${formId}-cost-hint`} status={costError ? 'error' : undefined} size="large" min={0.0001} max={1e9} precision={4} formatter={(value, info) => info.userTyping ? info.input : formatCommitted(value)} value={holding.averageCost} onChange={value => change({ averageCost: value })} addonAfter={holding.currency === 'KRW' ? '원 / 주' : '달러 / 주'} style={{ width: '100%' }} /></label>
          <div id={`${formId}-cost-hint`}>{costError && <Typography.Text role="alert" type="danger">{costError}</Typography.Text>}<p>증권 앱에 표시된 평균단가를 입력해주세요. 총 구매 금액이 아니에요.</p><Typography.Text type="secondary">비워두면 이 종목의 손익은 계산하지 않아요.</Typography.Text></div></div>
          : <Button type="link" style={{ padding: 0 }} onClick={() => setCostOpen(true)}>＋ 평균 구매 가격 입력 (선택)</Button>}
        {(editing || metadataMissing) && <details open={metadataMissing && !checking}><summary>{metadataMissing ? '종목 정보 보완' : '저장된 종목 정보 수정'}</summary>
          {metadataMissing && <Typography.Text type="secondary">자동 확인하지 못한 정보가 있어요. 분류와 통화를 확인해주세요.</Typography.Text>}
          <div className="holding-advanced">
            <label>종목 이름<Input aria-label="종목 이름" value={holding.name} onChange={event => change({ name: event.target.value })} /></label>
            <label>자산 분류<Select aria-label="자산 분류" value={holding.assetClass} options={Object.entries(assetLabels).filter(([key]) => key !== 'CASH').map(([value, label]) => ({ value, label }))} onChange={assetClass => change({ assetClass })} /></label>
            <label>가격 통화<Select aria-label="가격 통화" value={holding.currency} options={[{ value: 'KRW', label: '원화' }, { value: 'USD', label: '달러' }]} onChange={currency => change({ currency })} /></label>
            <label>기록된 지역<Select aria-label="기록된 지역" value={holding.region} options={[{ value: 'KR', label: '한국' }, { value: 'US', label: '미국' }, { value: 'GLOBAL', label: '글로벌' }]} onChange={region => change({ region })} /></label>
            <label>분야<Input aria-label="분야" value={holding.sector} onChange={event => change({ sector: event.target.value })} /></label>
            {holding.assetClass === 'ETF' && <label>추종 지수<Input aria-label="추종 지수" value={holding.underlyingIndex} placeholder="예: S&P 500" onChange={event => change({ underlyingIndex: event.target.value })} /></label>}
            {metadataMissing && <Checkbox checked={metadataConfirmed} onChange={event => setMetadataConfirmed(event.target.checked)}>종목 이름·분류·통화를 확인했어요.</Checkbox>}
          </div></details>}
      </>}
      {((validation && !quantityError && !costError) || error) && <Alert type="error" showIcon message={quantityError || costError ? error : validation || error} description="입력한 내용은 유지했어요. 확인한 뒤 다시 저장해주세요." />}
      <Typography.Text type="secondary">실제 주문 없이 보유 내역만 저장해요.</Typography.Text>
    </Space></form></ConfigProvider>
  </Drawer>
}
