import { useEffect, useState } from 'react'
import { Alert, App, Button, Card, ConfigProvider, Input, InputNumber, Modal, Progress, Select, Space, Statistic, Table, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { useApi } from '../../lib/useApi'
import { fetchPortfolio, savePortfolio } from '../../lib/investingApi'
import { accountLabels, assetLabels, emptyHolding, riskLabels, toDraft } from '../../../../shared/investing'
import type { Holding, PortfolioDraft } from '../../../../shared/investing'
import { StockSearchInput } from '../stocks/components/StockSearchInput'
import { companies, sectors } from '../../../../shared/discovery'
import { RelatedNewsCard } from '../news/components/RelatedNewsCard'
import { InvestmentNotice } from '../../components/InvestmentNotice'
import { PortfolioExposureCard } from './PortfolioExposureCard'
import etfs from '../../../../shared/etfs.json'
import { InvestmentFocus } from './InvestmentFocus'
const { Title, Text } = Typography

export function PortfolioPage() {
  const query = useApi(fetchPortfolio)
  const { message } = App.useApp()
  const [draft, setDraft] = useState<PortfolioDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [editing, setEditing] = useState(false)
  const [sampleOpen, setSampleOpen] = useState(false)
  // Server refresh must not replace unsaved edits or the freshly saved response with an older snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (query.data && !dirty) setDraft(toDraft(query.data)) }, [query.data])
  const change = (patch: Partial<PortfolioDraft>) => { if (draft) { setDraft({ ...draft, ...patch }); setDirty(true) } }
  const holdingChange = (index: number, patch: Partial<Holding>) => { if (draft) change({ holdings: draft.holdings.map((h, i) => i === index ? { ...h, ...patch } : h) }) }
  async function save() {
    if (!draft) return
    setSaving(true)
    try { const saved = await savePortfolio(draft); setDraft(toDraft(saved)); setDirty(false); setEditing(false); query.reload(); message.success('포트폴리오를 저장했습니다.') }
    catch (error) { query.reload(); message.error(error instanceof Error ? error.message : '저장에 실패했습니다.') }
    finally { setSaving(false) }
  }
  function addHolding() {
    if (!draft || saving || draft.holdings.length >= 50) return
    setEditing(true)
    const unfinished = draft.holdings.findIndex(h => !h.symbol)
    const index = unfinished >= 0 ? unfinished : draft.holdings.length
    if (unfinished < 0) change({ holdings: [...draft.holdings, emptyHolding()] })
    requestAnimationFrame(() => {
      const row = document.querySelector<HTMLElement>(`[data-holding-index="${index}"]`)
      row?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
      row?.querySelector<HTMLElement>('[role="combobox"]')?.focus({ preventScroll: true })
    })
  }
  if (query.error && !draft) return <Alert type="error" showIcon message="포트폴리오 조회 실패" description={query.error.message} action={<Button onClick={query.reload}>다시 시도</Button>} />
  if (!draft) return <Card loading title="내 포트폴리오" />
  return <ConfigProvider componentDisabled={saving}><Space direction="vertical" size={24} style={{ width: '100%' }}>
    {query.error && <Alert type="error" showIcon message="최신 기록을 확인하지 못했습니다. 편집 내용은 유지됩니다." description={query.error.message} action={<Button onClick={query.reload}>다시 시도</Button>} />}
    <div className="page-intro portfolio-intro" data-tour="portfolio-intro">
      <div className="portfolio-heading"><div><span className="page-eyebrow">내 투자 기록</span><Title level={2}>{query.data?.holdings.length || query.data?.cash ? '내 자산, 한눈에' : '보유 자산 하나로 시작하세요.'}</Title><p>직접 등록한 기록으로 비중과 집중·중복을 점검해요.</p></div>
      <Space wrap><Button type="primary" size="large" disabled={draft.holdings.length >= 50} onClick={addHolding}>{query.data?.holdings.length || query.data?.cash ? '보유 자산 추가' : '첫 자산 등록하기'}</Button>{!query.data?.holdings.length && !query.data?.cash && <Button size="large" onClick={() => setSampleOpen(true)}>분석 예시 보기</Button>}<Link to="/candidates">기업·추천 살펴보기 →</Link></Space>
      </div>
      {query.data && (query.data.holdings.length > 0 || query.data.cash > 0) && <div className="portfolio-overview" aria-label="내 기록 한눈에"><Statistic title="현금 포함 평가금액 · 원" value={query.data.totalValueKrw ?? '시세 확인 필요'} /><Statistic title="투자원금 · 원" value={query.data.investedKrw ?? '환율 확인 필요'} /><div className="portfolio-overview-link"><strong>보유 자산 {query.data.holdings.length}개</strong><a href="#portfolio-analysis">비중·분석 확인 ↓</a><small>평가는 수집 시세 기준</small></div></div>}
      <div className="record-status"><strong role="status">{dirty ? '저장 전 · 변경한 내용을 저장해주세요.' : query.data?.updatedAt ? '저장 완료 · ' + new Date(query.data.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) + ' KST' : '아직 등록한 기록이 없어요.'}</strong><details><summary>기록 보관·연동 안내</summary><span>현재 브라우저로 연결된 기록 · 실제 주식 주문·증권사 자동 연동은 제공하지 않아요.</span><Link to="/guide?topic=saved-data">다른 기기에서 기록이 안 보이나요?</Link></details></div>
    </div>
    <Modal title="포트폴리오 분석 예시" open={sampleOpen} onCancel={() => setSampleOpen(false)} footer={<><Button onClick={() => setSampleOpen(false)}>닫기</Button><Button type="primary" onClick={() => { setSampleOpen(false); addHolding() }}>내 첫 자산 등록하기</Button></>}>
      <Tag color="orange">가상 예시 · 개인 기록에 저장되지 않음</Tag><p>매입원금 80만원과 현금 20만원을 입력했다고 가정한 예시입니다. 실제 시세·추천 상품이 아닙니다.</p>
      <div className="sample-allocation">{[{ name: '예시 기업 A', value: 60 }, { name: '예시 ETF B', value: 20 }, { name: '현금', value: 20 }].map(item => <div key={item.name}><strong>{item.name} · {item.value}%</strong><Progress percent={item.value} showInfo={false} /></div>)}</div>
      <p><strong>입력하면 이런 점을 확인해요.</strong></p><ul><li>어떤 자산에 보유 비중이 몰려 있는지</li><li>같은 기업·분야가 겹치는지</li><li>수집된 가격으로 평가할 수 있는지와 자료 기준 시각</li></ul><p>ETF 안에 포함된 기업은 상품 정보를 별도로 확인해야 합니다.</p>
    </Modal>
    {query.data?.insights[0] && <div className="portfolio-key-finding"><strong>내 기록에서 발견</strong><span>{query.data.insights[0]}</span><a href="#portfolio-analysis">분석 확인 →</a></div>}
    <InvestmentFocus portfolio={query.data} />
    <InvestmentNotice />
    <details className="portfolio-editor" open={editing || !(query.data?.holdings.length || query.data?.cash)} onToggle={e => { if (query.data?.holdings.length || query.data?.cash) setEditing(e.currentTarget.open) }}><summary>보유 자산 입력·수정</summary>
    <Card data-tour="portfolio-holdings" title="보유 자산 직접 등록" extra={<Button disabled={saving || draft.holdings.length >= 50} onClick={addHolding}>자산 추가</Button>}>
      {draft.holdings.length === 0 && <p>첫 보유 자산을 추가하거나 아래 투자 계획에 현금을 입력해보세요.</p>}
      <Space direction="vertical" size={16} style={{ width: '100%' }}>{draft.holdings.map((h, i) => <Card key={i} data-holding-index={i} size="small" title={`자산 ${i + 1}`} extra={<Button danger size="small" disabled={saving} onClick={() => change({ holdings: draft.holdings.filter((_, index) => index !== i) })}>삭제</Button>}>
        <div className="portfolio-fields">
          <div>회사·상품 이름으로 찾기<StockSearchInput onSelect={(symbol, name) => {
            const company = companies.find(item => item.symbol === symbol)
            const etf = etfs.find(item => item.symbol === symbol)
            const korean = /\.(KS|KQ)$/.test(symbol)
            holdingChange(i, { symbol, name: name || company?.name || etf?.name || '', assetClass: etf ? 'ETF' : 'STOCK', currency: korean ? 'KRW' : 'USD', region: korean ? 'KR' : 'US', sector: sectors.find(item => item.id === company?.sectorId)?.name || '미분류', underlyingIndex: etf?.underlyingIndex ?? '' })
          }} />{h.symbol && <Text type="secondary">선택한 자산. {h.name || '자산 이름을 입력해주세요.'}</Text>}</div>
          <label>보유 수량<InputNumber min={0.0001} precision={4} value={h.quantity} onChange={v => holdingChange(i, { quantity: v ?? 0 })} style={{ width: '100%' }} /></label>
          <label>평균 매입가 ({h.currency === 'KRW' ? '원' : '달러'})<InputNumber min={0.0001} precision={4} value={h.averageCost} onChange={v => holdingChange(i, { averageCost: v ?? 0 })} style={{ width: '100%' }} /></label>
          <label>자산 분류<Select value={h.assetClass} options={Object.entries(assetLabels).filter(([v]) => v !== 'CASH').map(([value, label]) => ({ value, label }))} onChange={assetClass => holdingChange(i, { assetClass })} style={{ width: '100%' }} /></label>
          <details style={{ gridColumn: '1 / -1' }}><summary>자산 상세 더 확인하기 · {h.currency}{h.assetClass === 'ETF' ? ' · ETF 추종 지수를 확인해주세요.' : ''}</summary><div className="portfolio-fields">
          <label>자산 이름<Input value={h.name} placeholder="회사명 또는 ETF 이름" onChange={e => holdingChange(i, { name: e.target.value })} /></label>
          <label>가격 통화<Select value={h.currency} options={['KRW', 'USD'].map(value => ({ value, label: value }))} onChange={currency => holdingChange(i, { currency })} style={{ width: '100%' }} /></label>
          <label>지역<Select value={h.region} options={[{ value: 'KR', label: '한국' }, { value: 'US', label: '미국' }, { value: 'GLOBAL', label: '글로벌' }]} onChange={region => holdingChange(i, { region })} style={{ width: '100%' }} /></label>
          <label>산업·분야<Input value={h.sector} onChange={e => holdingChange(i, { sector: e.target.value })} /></label>
          <label>추종 지수 (ETF)<Input placeholder="예: S&P500" value={h.underlyingIndex} onChange={e => holdingChange(i, { underlyingIndex: e.target.value })} /></label>
          </div></details>
        </div>
      </Card>)}</Space>
      {dirty && <Space wrap style={{ marginTop: 20 }}><Button type="primary" onClick={save} loading={saving}>저장하고 분석하기</Button><Button disabled={saving} onClick={() => { if (query.data) setDraft(toDraft(query.data)); setDirty(false) }}>편집 취소</Button><Tag color="orange">저장되지 않은 변경</Tag></Space>}
    </Card>
    </details>
    <Card title="투자 계획" extra={query.data?.updatedAt ? <Text type="secondary">저장 {new Date(query.data.updatedAt).toLocaleString('ko-KR')}</Text> : '첫 포트폴리오'}>
      <Text>먼저 보유 자산 하나를 등록해보세요. 수량과 매입가로 집중·중복을 확인할 수 있습니다.</Text>
      <details style={{ marginTop: 12 }}><summary>투자 조건 더 설정하기 · {draft.horizonMonths}개월 · {riskLabels[draft.riskLevel]} · {accountLabels[draft.accountType]}</summary>
      <div className="portfolio-fields">
        <label>투자 목표<Input value={draft.goal} maxLength={120} onChange={e => change({ goal: e.target.value })} /></label>
        <label>투자 기간 (개월)<InputNumber min={1} max={600} value={draft.horizonMonths} onChange={v => change({ horizonMonths: v ?? 1 })} style={{ width: '100%' }} /></label>
        <label>투자 성향<Select value={draft.riskLevel} options={Object.entries(riskLabels).map(([value, label]) => ({ value, label }))} onChange={riskLevel => change({ riskLevel })} style={{ width: '100%' }} /></label>
        <label>계좌 종류<Select value={draft.accountType} options={Object.entries(accountLabels).map(([value, label]) => ({ value, label }))} onChange={accountType => change({ accountType })} style={{ width: '100%' }} /></label>
        <label>월 추가 투자금 (원)<InputNumber min={0} value={draft.monthlyContribution} onChange={v => change({ monthlyContribution: v ?? 0 })} style={{ width: '100%' }} /></label>
        <label>보유 현금 (원)<InputNumber min={0} value={draft.cash} onChange={v => change({ cash: v ?? 0 })} style={{ width: '100%' }} /></label>
      </div>
      </details>
      {dirty && <Button type="primary" loading={saving} onClick={save} style={{ marginTop: 16 }}>투자 계획 저장하고 분석하기</Button>}
    </Card>
    {query.data && (query.data.holdings.length > 0 || query.data.cash > 0) && <>
      <Card id="portfolio-analysis" title="저장된 포트폴리오 분석" extra={<Tag>저장한 보유 기록</Tag>}>
        <Alert type="info" showIcon message="비중은 매입원금 기준 · 평가는 장후 수집 시세 기준" description={`시세가 누락되면 전체 평가금액은 표시하지 않습니다.${query.data.fxAsOf ? ` 환율 기준 브리핑: ${query.data.fxAsOf}` : ''}`} />
        <Space wrap size={32} style={{ marginBlock: 20 }}><Statistic title="투자원금 (원)" value={query.data.investedKrw ?? '—'} /><Statistic title="현금 포함 평가금액 (원)" value={query.data.totalValueKrw ?? '시세 확인 중'} /><Statistic title="가격 변동 수익률 (%)" value={query.data.returnPercent ?? '—'} precision={2} /></Space>
        {Object.entries(query.data.allocation).map(([key, value]) => <div key={key}><Text>{assetLabels[key]} {value}%</Text><Progress percent={value} showInfo={false} /></div>)}
        <Space direction="vertical" style={{ marginTop: 16 }}>{query.data.insights.map(insight => <Text key={insight}>• {insight}</Text>)}</Space>
        <Table style={{ marginTop: 20 }} pagination={false} scroll={{ x: 450 }} rowKey={r => r.holding.symbol} dataSource={query.data.holdings} columns={[{ title: '자산', render: (_, r) => r.holding.name }, { title: '수량', render: (_, r) => r.holding.quantity }, { title: '수집 가격·기준 시각', render: (_, r) => <div className="quote-value">{r.currentPrice == null ? <Tag color="orange">시세 미수집</Tag> : <strong>{r.currentPrice.toLocaleString()} {r.holding.currency}</strong>}<span>{r.quoteAsOf ? new Date(r.quoteAsOf).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) + ' KST' : '기준 시각 미확인'}</span></div> }]} />
      </Card>
      <Card title="내 조건으로 만드는 구성 초안">
        <Typography.Paragraph type="secondary">기간과 성향을 반영한 규칙 기반 출발점입니다. ETF·채권 상품의 투자 대상과 계좌 적합성을 확인한 후 비중을 결정하세요. ETF는 채권형 등 상품에 따라 실제 위험이 다릅니다.</Typography.Paragraph>
        <div className="portfolio-fields">{Object.entries(query.data.targetAllocation).map(([key, value]) => <div key={key}><Text strong>{assetLabels[key]} {value}%</Text><Progress percent={value} showInfo={false} /><Text type="secondary">월 투자금 배분 예시 {query.data!.contributionPlan[key]?.toLocaleString()}원</Text></div>)}</div>
      </Card>
      <PortfolioExposureCard portfolio={query.data} />
      <RelatedNewsCard title="내 보유 자산 관련 소식" news={query.data.relatedNews} loading={false} emptyDescription="보유 자산 이름과 일치하는 뉴스가 없습니다. 뉴스 메뉴에서 추가 소식을 확인하세요." />
    </>}
  </Space></ConfigProvider>
}
