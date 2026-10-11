// 회사 검색과 수량 중심의 자산 등록·수정을 별도 패널에서 처리한다.
import { useId, useRef, useState } from 'react'
import type { ElementRef } from 'react'
import { Alert, App, Button, ConfigProvider, Drawer, Input, InputNumber, Select, Space, Typography } from 'antd'
import type { Holding } from '../../../../shared/investing'
import { assetLabels } from '../../../../shared/investing'
import { holdingError, selectedHolding } from '../../../../shared/holding-registration'
import { StockSearchInput } from '../stocks/components/StockSearchInput'

export function HoldingDrawer({ initial, others, editing, saving, error, close, returnFocus, save }: { initial: Holding; others: Holding[]; editing: boolean; saving: boolean; error: string | null; close: () => void; returnFocus: () => void; save: (value: Holding) => void }) {
  const [holding, setHolding] = useState(initial)
  const [search, setSearch] = useState(!initial.symbol)
  const [costOpen, setCostOpen] = useState(initial.averageCost != null)
  const [validation, setValidation] = useState<string | null>(null)
  const quantity = useRef<ElementRef<typeof InputNumber>>(null)
  const formId = useId()
  const errorId = `${formId}-error`
  const { modal } = App.useApp()
  function cancel() {
    if (saving) return
    if (JSON.stringify(holding) !== JSON.stringify(initial)) {
      let discarded = false
      modal.confirm({ title: '입력한 내용을 취소할까요?', okText: '입력 취소', cancelText: '계속 입력', onOk: () => { discarded = true; close() }, afterClose: () => { if (discarded) returnFocus() } })
    }
    else close()
  }
  function change(patch: Partial<Holding>) { setHolding(current => ({ ...current, ...patch })); setValidation(null) }
  function submit() { const problem = holdingError(holding, others); setValidation(problem); if (!problem) save(holding); else if (holding.symbol && holding.quantity <= 0) quantity.current?.focus() }
  return <Drawer open title={editing ? '보유 기록 수정' : '어떤 주식을 갖고 있나요?'} width="min(480px, 100vw)" onClose={cancel} closable={!saving} maskClosable={!saving} keyboard={!saving} className="holding-drawer" footer={<Button block type="primary" size="large" loading={saving} htmlType="submit" form={formId}>{editing ? '수정한 기록 저장하기' : '등록하고 점검하기'}</Button>}>
    <ConfigProvider componentDisabled={saving}><form id={formId} aria-label="자산 기록 입력" onSubmit={e => { e.preventDefault(); submit() }}><Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Typography.Text type="secondary">실제 구매가 아닌 보유 기록이에요. 매입가는 나중에 입력해도 돼요.</Typography.Text>
      {search ? <div><label htmlFor={`${formId}-search`}>회사·상품 이름으로 찾기</label><StockSearchInput id={`${formId}-search`} onSelect={(symbol, name) => { setHolding(current => selectedHolding(current, symbol, name)); setSearch(false); setValidation(null); requestAnimationFrame(() => quantity.current?.focus()) }} /></div> : <div className="holding-selected"><div><strong>{holding.name}</strong><small>{holding.currency === 'KRW' ? '원화' : '달러'} · {assetLabels[holding.assetClass]}</small></div><Button disabled={saving} onClick={() => setSearch(true)}>다시 선택</Button></div>}
      <label className="holding-field">몇 주를 갖고 있나요?<InputNumber ref={quantity} aria-label="보유 수량" aria-invalid={!!validation && holding.quantity <= 0} aria-describedby={validation || error ? errorId : undefined} size="large" disabled={saving} min={0.0001} max={1e9} precision={4} value={holding.quantity || null} onChange={value => change({ quantity: value ?? 0 })} addonAfter="주" style={{ width: '100%' }} /></label>
      {costOpen ? <div><label className="holding-field">평균 매입가 · 선택<InputNumber aria-label="평균 매입가" aria-describedby={validation || error ? errorId : undefined} size="large" disabled={saving} min={0.0001} max={1e9} precision={4} value={holding.averageCost} onChange={value => change({ averageCost: value })} addonAfter={holding.currency === 'KRW' ? '원' : '달러'} style={{ width: '100%' }} /></label><Button type="link" disabled={saving} onClick={() => { change({ averageCost: null }); setCostOpen(false) }}>매입가 없이 기록하기</Button></div> : <Button style={{ alignSelf: 'flex-start' }} disabled={saving} onClick={() => setCostOpen(true)}>매입가도 기록하기</Button>}
      <details><summary>상품 정보 더 확인하기</summary><div className="holding-advanced">
        <label>자산 이름<Input aria-label="자산 이름" disabled={saving} value={holding.name} onChange={e => change({ name: e.target.value })} /></label>
        <label>자산 분류<Select aria-label="자산 분류" disabled={saving} value={holding.assetClass} options={Object.entries(assetLabels).filter(([key]) => key !== 'CASH').map(([value, label]) => ({ value, label }))} onChange={assetClass => change({ assetClass })} /></label>
        <label>가격 통화<Select aria-label="가격 통화" disabled={saving} value={holding.currency} options={[{ value: 'KRW', label: '원화' }, { value: 'USD', label: '달러' }]} onChange={currency => change({ currency })} /></label>
        <label>지역<Select aria-label="지역" disabled={saving} value={holding.region} options={[{ value: 'KR', label: '한국' }, { value: 'US', label: '미국' }, { value: 'GLOBAL', label: '글로벌' }]} onChange={region => change({ region })} /></label>
        <label>분야<Input aria-label="분야" disabled={saving} value={holding.sector} onChange={e => change({ sector: e.target.value })} /></label>
        {holding.assetClass === 'ETF' && <label>추종 지수<Input aria-label="추종 지수" disabled={saving} value={holding.underlyingIndex} placeholder="예: S&P 500" onChange={e => change({ underlyingIndex: e.target.value })} /></label>}
      </div></details>
      {(validation || error) && <Alert id={errorId} type="error" showIcon message={validation || error} description="입력한 내용은 그대로 있어요. 확인한 뒤 다시 저장해주세요." />}
      <Typography.Text type="secondary">비중은 수집 시세 기준으로 계산해요. 매입가가 없으면 손익은 표시하지 않아요.</Typography.Text>
    </Space></form></ConfigProvider>
  </Drawer>
}
