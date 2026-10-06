import { useEffect, useState } from 'react'
import { Alert, App, Button, Card, ConfigProvider, Empty, Input, InputNumber, Progress, Select, Space, Statistic, Table, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { useApi } from '../../lib/useApi'
import { fetchPortfolio, savePortfolio } from '../../lib/investingApi'
import { accountLabels, assetLabels, emptyHolding, riskLabels, toDraft } from '../../../../shared/investing'
import type { Holding, PortfolioDraft } from '../../../../shared/investing'
import { StockSearchInput } from '../stocks/components/StockSearchInput'
import { companies, sectors } from '../../../../shared/discovery'
import { RelatedNewsCard } from '../news/components/RelatedNewsCard'
const { Title, Text } = Typography

export function PortfolioPage() {
  const query = useApi(fetchPortfolio)
  const { message } = App.useApp()
  const [draft, setDraft] = useState<PortfolioDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  // Server refresh must not replace unsaved edits or the freshly saved response with an older snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (query.data && !dirty) setDraft(toDraft(query.data)) }, [query.data])
  const change = (patch: Partial<PortfolioDraft>) => { if (draft) { setDraft({ ...draft, ...patch }); setDirty(true) } }
  const holdingChange = (index: number, patch: Partial<Holding>) => { if (draft) change({ holdings: draft.holdings.map((h, i) => i === index ? { ...h, ...patch } : h) }) }
  async function save() {
    if (!draft) return
    setSaving(true)
    try { const saved = await savePortfolio(draft); setDraft(toDraft(saved)); setDirty(false); query.reload(); message.success('포트폴리오를 저장했습니다.') }
    catch (error) { query.reload(); message.error(error instanceof Error ? error.message : '저장에 실패했습니다.') }
    finally { setSaving(false) }
  }
  if (query.error) return <Alert type="error" showIcon message="포트폴리오 조회 실패" description={query.error.message} action={<Button onClick={query.reload}>다시 시도</Button>} />
  if (!draft) return <Card loading title="내 포트폴리오" />
  return <ConfigProvider componentDisabled={saving}><Space direction="vertical" size={24} style={{ width: '100%' }}>
    <div className="page-intro"><span className="eyebrow">FIREWATCH / MY INVESTMENT PLAN</span><Title level={2}>내 투자에, 방향을 더하다.</Title><Text type="secondary">목표와 보유 자산을 연결하고, 시장 변화에 맞춰 내 포트폴리오를 점검하세요.</Text><Space wrap style={{ marginTop: 24, display: 'flex' }}><Link to="/candidates"><Button type="primary">투자 후보·ETF 비교</Button></Link><Link to="/briefing"><Button>시장 브리핑</Button></Link><Link to="/game"><Button>가상투자 게임 ↗</Button></Link></Space></div>
    <Card title="투자 계획" extra={query.data?.updatedAt ? <Text type="secondary">저장 {new Date(query.data.updatedAt).toLocaleString('ko-KR')}</Text> : '첫 포트폴리오'}>
      <div className="portfolio-fields">
        <label>투자 목표<Input value={draft.goal} maxLength={120} onChange={e => change({ goal: e.target.value })} /></label>
        <label>투자 기간 (개월)<InputNumber min={1} max={600} value={draft.horizonMonths} onChange={v => change({ horizonMonths: v ?? 1 })} style={{ width: '100%' }} /></label>
        <label>투자 성향<Select value={draft.riskLevel} options={Object.entries(riskLabels).map(([value, label]) => ({ value, label }))} onChange={riskLevel => change({ riskLevel })} style={{ width: '100%' }} /></label>
        <label>계좌 종류<Select value={draft.accountType} options={Object.entries(accountLabels).map(([value, label]) => ({ value, label }))} onChange={accountType => change({ accountType })} style={{ width: '100%' }} /></label>
        <label>월 추가 투자금 (원)<InputNumber min={0} value={draft.monthlyContribution} onChange={v => change({ monthlyContribution: v ?? 0 })} style={{ width: '100%' }} /></label>
        <label>보유 현금 (원)<InputNumber min={0} value={draft.cash} onChange={v => change({ cash: v ?? 0 })} style={{ width: '100%' }} /></label>
      </div>
    </Card>
    <Card title="보유 자산 직접 등록" extra={<Button disabled={saving || draft.holdings.length >= 50} onClick={() => change({ holdings: [...draft.holdings, emptyHolding()] })}>자산 추가</Button>}>
      {draft.holdings.length === 0 && <Empty description="첫 보유 자산을 추가하거나 현금을 입력해보세요." />}
      <Space direction="vertical" size={16} style={{ width: '100%' }}>{draft.holdings.map((h, i) => <Card key={i} size="small" title={`자산 ${i + 1}`} extra={<Button danger size="small" disabled={saving} onClick={() => change({ holdings: draft.holdings.filter((_, index) => index !== i) })}>삭제</Button>}>
        <div className="portfolio-fields">
          <div>회사·상품 이름으로 찾기<StockSearchInput onSelect={(symbol, name) => {
            const company = companies.find(item => item.symbol === symbol)
            const korean = /\.(KS|KQ)$/.test(symbol)
            holdingChange(i, { symbol, name: name || company?.name || '', currency: korean ? 'KRW' : 'USD', region: korean ? 'KR' : 'US', sector: sectors.find(item => item.id === company?.sectorId)?.name || '', underlyingIndex: '' })
          }} />{h.symbol && <Text type="secondary">선택한 자산. {h.name || '자산 이름을 입력해주세요.'}</Text>}</div>
          <label>자산 이름<Input value={h.name} placeholder="회사명 또는 ETF 이름" onChange={e => holdingChange(i, { name: e.target.value })} /></label>
          <label>보유 수량<InputNumber min={0.0001} precision={4} value={h.quantity} onChange={v => holdingChange(i, { quantity: v ?? 0 })} style={{ width: '100%' }} /></label>
          <label>평균 매입가<InputNumber min={0.0001} precision={4} value={h.averageCost} onChange={v => holdingChange(i, { averageCost: v ?? 0 })} style={{ width: '100%' }} /></label>
          <label>가격 통화<Select value={h.currency} options={['KRW', 'USD'].map(value => ({ value, label: value }))} onChange={currency => holdingChange(i, { currency })} style={{ width: '100%' }} /></label>
          <label>자산 분류<Select value={h.assetClass} options={Object.entries(assetLabels).filter(([v]) => v !== 'CASH').map(([value, label]) => ({ value, label }))} onChange={assetClass => holdingChange(i, { assetClass })} style={{ width: '100%' }} /></label>
          <label>지역<Select value={h.region} options={[{ value: 'KR', label: '한국' }, { value: 'US', label: '미국' }, { value: 'GLOBAL', label: '글로벌' }]} onChange={region => holdingChange(i, { region })} style={{ width: '100%' }} /></label>
          <label>산업·분야<Input value={h.sector} onChange={e => holdingChange(i, { sector: e.target.value })} /></label>
          <label>추종 지수 (ETF)<Input placeholder="예: S&P500" value={h.underlyingIndex} onChange={e => holdingChange(i, { underlyingIndex: e.target.value })} /></label>
        </div>
      </Card>)}</Space>
      <Space style={{ marginTop: 20 }}><Button type="primary" onClick={save} loading={saving} disabled={!dirty}>저장하고 분석하기</Button><Button disabled={!dirty || saving} onClick={() => { if (query.data) setDraft(toDraft(query.data)); setDirty(false) }}>편집 취소</Button>{dirty && <Tag color="orange">저장되지 않은 변경</Tag>}</Space>
    </Card>
    {query.data && <>
      <Card title="저장된 포트폴리오 분석" extra={<Tag>{query.data.analysisVersion}</Tag>}>
        <Alert type="info" showIcon message="비중은 매입원금 기준 · 평가는 장후 수집 시세 기준" description={`시세가 누락되면 전체 평가금액은 표시하지 않습니다.${query.data.fxAsOf ? ` 환율 기준 브리핑: ${query.data.fxAsOf}` : ''}`} />
        <Space wrap size={32} style={{ marginBlock: 20 }}><Statistic title="투자원금 (원)" value={query.data.investedKrw ?? '—'} /><Statistic title="현금 포함 평가금액 (원)" value={query.data.totalValueKrw ?? '시세 확인 중'} /><Statistic title="가격 변동 수익률 (%)" value={query.data.returnPercent ?? '—'} precision={2} /></Space>
        {Object.entries(query.data.allocation).map(([key, value]) => <div key={key}><Text>{assetLabels[key]} {value}%</Text><Progress percent={value} showInfo={false} /></div>)}
        <Space direction="vertical" style={{ marginTop: 16 }}>{query.data.insights.map(insight => <Text key={insight}>• {insight}</Text>)}</Space>
        <Table style={{ marginTop: 20 }} pagination={false} scroll={{ x: 600 }} rowKey={r => r.holding.symbol} dataSource={query.data.holdings} columns={[{ title: '자산', render: (_, r) => `${r.holding.name} (${r.holding.symbol})` }, { title: '수량', render: (_, r) => r.holding.quantity }, { title: '수집 시세', render: (_, r) => r.currentPrice == null ? '미수집' : `${r.currentPrice.toLocaleString()} ${r.holding.currency}` }, { title: '시세 기준 시각', render: (_, r) => r.quoteAsOf ? new Date(r.quoteAsOf).toLocaleString('ko-KR') : '—' }]} />
      </Card>
      <Card title="내 조건으로 만드는 구성 초안">
        <Typography.Paragraph type="secondary">기간과 성향을 반영한 규칙 기반 출발점입니다. ETF·채권 상품의 투자 대상과 계좌 적합성을 확인한 후 비중을 결정하세요. ETF는 채권형 등 상품에 따라 실제 위험이 다릅니다.</Typography.Paragraph>
        <div className="portfolio-fields">{Object.entries(query.data.targetAllocation).map(([key, value]) => <div key={key}><Text strong>{assetLabels[key]} {value}%</Text><Progress percent={value} showInfo={false} /><Text type="secondary">월 투자금 배분 예시 {query.data!.contributionPlan[key]?.toLocaleString()}원</Text></div>)}</div>
      </Card>
      <RelatedNewsCard title="내 보유 자산 관련 소식" news={query.data.relatedNews} loading={false} emptyDescription="보유 자산 이름과 일치하는 뉴스가 없습니다. 뉴스 메뉴에서 추가 소식을 확인하세요." />
    </>}
  </Space></ConfigProvider>
}
