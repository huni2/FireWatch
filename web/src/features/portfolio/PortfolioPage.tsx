// 등록과 점검을 분리하고 저장 응답을 즉시 홈에 반영한다.
import { useEffect, useRef, useState } from 'react'
import { Alert, App, Button, Card, Drawer, Input, InputNumber, Modal, Progress, Select, Space, Statistic, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { useApi } from '../../lib/useApi'
import { fetchPortfolio, savePortfolio } from '../../lib/investingApi'
import { accountLabels, assetLabels, emptyHolding, riskLabels, toDraft } from '../../../../shared/investing'
import type { Holding, PortfolioDraft } from '../../../../shared/investing'
import { portfolioCoverageText, portfolioFinding } from '../../../../shared/holding-registration'
import { RelatedNewsCard } from '../news/components/RelatedNewsCard'
import { InvestmentNotice } from '../../components/InvestmentNotice'
import { PortfolioExposureCard } from './PortfolioExposureCard'
import { InvestmentFocus } from './InvestmentFocus'
import { HoldingDrawer } from './HoldingDrawer'
import { SlowLoadingHint } from '../../components/SlowLoadingHint'
import './portfolio.css'
const { Title, Text } = Typography

export function PortfolioPage() {
  const query = useApi(fetchPortfolio)
  const { message, modal } = App.useApp()
  const [editingDraft, setDraft] = useState<PortfolioDraft | null>(null)
  const [selected, setSelected] = useState<{ initial: Holding; index: number | null } | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sampleOpen, setSampleOpen] = useState(false)
  const operation = useRef(false)
  const savedFocus = useRef(false)
  const findingRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLElement>(null)
  const analysisRef = useRef<HTMLElement>(null)
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const draft = editingDraft ?? (query.data ? toDraft(query.data) : null)
  useEffect(() => {
    if (!savedFocus.current) return
    savedFocus.current = false
    const frame = requestAnimationFrame(() => (findingRef.current ?? headingRef.current)?.focus())
    return () => cancelAnimationFrame(frame)
  }, [query.data])
  async function persist(next: PortfolioDraft) {
    if (operation.current) return false
    operation.current = true; setSaving(true); setError(null)
    try {
      const saved = await savePortfolio(next)
      savedFocus.current = true
      query.replaceData(saved); setDraft(null); setSelected(null); setPlanOpen(false)
      message.success({ key: 'portfolio-save', content: '보유 기록을 저장했어요. 아래에서 내 자산을 점검해보세요.' })
      return true
    } catch (e) { setError(e instanceof Error ? e.message : '기록을 저장하지 못했어요.'); return false }
    finally { operation.current = false; setSaving(false) }
  }
  function openHolding(index: number | null = null) { if (!draft || saving) return; setError(null); setDraft(draft); setSelected({ initial: index == null ? emptyHolding() : draft.holdings[index], index }) }
  function deleteHolding(index: number) {
    if (!draft || saving) return
    modal.confirm({ title: `${draft.holdings[index].name} 기록을 삭제할까요?`, content: '보유 기록만 삭제하며 실제 주식은 매도하지 않아요.', okText: '기록 삭제', cancelText: '유지하기', okButtonProps: { danger: true }, onOk: async () => { if (!await persist({ ...draft, holdings: draft.holdings.filter((_, i) => i !== index) })) throw new Error('삭제 실패') } })
  }
  function closePlan() {
    if (saving) return
    if (query.data && JSON.stringify(draft) !== JSON.stringify(toDraft(query.data))) modal.confirm({ title: '변경한 계획을 저장하지 않고 닫을까요?', okText: '변경 취소', cancelText: '계속 입력', onOk: () => { setDraft(null); setPlanOpen(false) } })
    else { setDraft(null); setPlanOpen(false) }
  }
  if (!draft) return query.error ? <Alert type="error" message="기록을 불러오지 못했어요." description="등록한 기록을 지우지 않았어요. 다시 불러와주세요." action={<Button onClick={query.reload}>다시 시도</Button>} /> : <section aria-label="내 기록 조회" aria-busy="true"><p role="status">내 기록을 확인하고 있어요.</p><SlowLoadingHint loading={query.loading} isSlow={query.isSlow} /><Card loading title="내 자산 점검" /></section>
  const portfolio = query.data
  const hasAssets = !!portfolio && (portfolio.holdings.length > 0 || portfolio.cash > 0)
  const finding = portfolio ? portfolioFinding(portfolio) : null
  const hasOverlap = !!portfolio?.exposure?.indexOverlaps.length
  const firstHolding = portfolio?.holdings[0]?.holding
  function inspectFinding() {
    const target = hasOverlap ? detailsRef.current : analysisRef.current
    if (!target) return
    if (hasOverlap && detailsRef.current) detailsRef.current.open = true
    target.style.scrollMarginTop = `${(document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0) + 16}px`
    const focusTarget = hasOverlap ? target.querySelector<HTMLElement>('summary') : target
    focusTarget?.focus({ preventScroll: true })
    target.scrollIntoView({ block: 'start' })
  }
  return <div className="portfolio-home">
    <header data-tour="portfolio-intro" ref={headingRef} tabIndex={-1} className="portfolio-home-heading"><div><span className="page-eyebrow">내 투자 기록</span><Title level={2}>{hasAssets ? '내 자산 점검' : '보유 자산 하나로 시작하세요.'}</Title><p>직접 등록한 기록에서 비중과 겹치는 투자를 확인해요.</p></div><Space wrap><Button data-tour="portfolio-registration" type="primary" size="large" disabled={saving || draft.holdings.length >= 50} onClick={() => openHolding()}>{hasAssets ? '자산 추가' : '첫 자산 등록하기'}</Button><Button disabled={saving} onClick={() => { setError(null); setDraft(draft); setPlanOpen(true) }}>현금·투자 계획</Button></Space></header>
    {query.loading && hasAssets && <p role="status">등록한 기록을 유지하며 최신 내용을 확인하고 있어요.</p>}
    {query.error && <Alert type="warning" message="최신 기록을 확인하지 못했어요. 현재 기록은 유지돼요." action={<Button onClick={query.reload}>다시 확인</Button>} />}
    {error && !selected && !planOpen && <Alert type="error" message={error} />}
    {!hasAssets && <section className="portfolio-welcome"><Title level={3}>회사 이름과 수량만 알려주세요.</Title><p>매입가를 몰라도 등록할 수 있어요. 시세가 있으면 비중을 확인할 수 있어요.</p><Button onClick={() => setSampleOpen(true)}>점검 예시 보기</Button></section>}
    {hasAssets && portfolio && <>
      <section className="portfolio-summary" aria-label="등록한 자산 요약"><Statistic title="등록한 자산 평가액 · 원" value={portfolio.totalValueKrw ?? '일부 가격 확인 필요'} /><div><strong>보유 자산 {portfolio.holdings.length}개</strong><small>{portfolio.updatedAt ? `기록 저장 ${new Date(portfolio.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}` : '저장한 보유 기록'}</small><small>수집 시세 기준 · 증권사 자동 연동 없음</small></div></section>
      <section ref={findingRef} tabIndex={-1} className="portfolio-finding" aria-label="내 기록에서 발견" aria-describedby="portfolio-finding-text"><span className="page-eyebrow">내 기록에서 확인할 점</span><strong id="portfolio-finding-text">{finding}</strong><div className="portfolio-finding-actions"><Button onClick={inspectFinding}>{hasOverlap ? '겹치는 ETF 확인하기' : '계산 기준과 비중 보기'}</Button>{firstHolding && <Link to={`/stocks?symbol=${encodeURIComponent(firstHolding.symbol)}`}>{firstHolding.name} 가격·근거 보기 →</Link>}</div></section>
      <div className="portfolio-home-grid"><section ref={analysisRef} tabIndex={-1} id="portfolio-analysis" className="portfolio-holdings" aria-label="저장된 보유 자산"><div className="portfolio-section-heading"><Title level={3}>보유 자산</Title><Text type="secondary">기록 수정</Text></div><p className="portfolio-coverage">{portfolioCoverageText(portfolio)}</p>
        {portfolio.holdings.map((row, index) => <article className="portfolio-holding-row" key={row.holding.symbol}><div><Link to={`/stocks?symbol=${encodeURIComponent(row.holding.symbol)}`}><strong>{row.holding.name}</strong></Link><small>{row.holding.quantity.toLocaleString()}주 · {assetLabels[row.holding.assetClass]}</small><small>{row.holding.averageCost == null ? '매입가 미입력 · 손익 계산 안 함' : `평균 매입가 ${row.holding.averageCost.toLocaleString()} ${row.holding.currency === 'KRW' ? '원' : '달러'}`}</small></div><div className="portfolio-holding-value"><strong>{row.valueKrw == null ? '가격·환율 확인 필요' : `${row.valueKrw.toLocaleString()}원`}</strong><small>{row.quoteAsOf ? `시세 ${new Date(row.quoteAsOf).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}` : '시세 미수집'}</small></div><Space><Button disabled={saving} aria-label={`${row.holding.name} 기록 수정`} onClick={() => openHolding(index)}>수정</Button><Button type="text" danger disabled={saving} aria-label={`${row.holding.name} 기록 삭제`} onClick={() => deleteHolding(index)}>삭제</Button></Space></article>)}
        <div className="portfolio-cash-row"><Text>등록한 현금</Text><strong>{portfolio.cash.toLocaleString()}원</strong></div>
        <details className="portfolio-profit"><summary>투자원금·손익 확인</summary><p>투자원금 {portfolio.investedKrw == null ? '매입가·환율 확인 필요' : `${portfolio.investedKrw.toLocaleString()}원`}</p><p>가격 변동 수익률 {portfolio.returnPercent == null ? '계산하지 않았어요' : `${portfolio.returnPercent}%`}</p><small>매입가·수집 시세·환율이 확인된 경우 계산해요. 수수료·세금은 포함하지 않아요.</small></details>
      </section><aside className="portfolio-allocation" aria-label="등록한 자산 구성"><Title level={3}>내 자산 구성</Title><p>{portfolioCoverageText(portfolio)}</p>{Object.entries(portfolio.allocation).map(([key, value]) => <div key={key}><div className="portfolio-weight-label"><span>{assetLabels[key]}</span><strong>{value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%</strong></div><Progress percent={value} showInfo={false} strokeColor="var(--ant-color-primary)" /></div>)}{!Object.keys(portfolio.allocation).length && <p>가격·환율을 확인하면 비중을 볼 수 있어요.</p>}<small>등록하지 않은 자산은 포함되지 않아요.</small></aside></div>
      <details ref={detailsRef} className="portfolio-details"><summary>분야·통화·ETF 중복 더 보기</summary><PortfolioExposureCard portfolio={portfolio} /></details>
      <InvestmentFocus portfolio={portfolio} />
      {firstHolding && <Link className="portfolio-news-link" to={`/news?q=${encodeURIComponent(firstHolding.name)}`}>{firstHolding.name} 저장 뉴스 찾아보기 →</Link>}<RelatedNewsCard title="내 보유 자산 관련 소식" news={portfolio.relatedNews} loading={false} emptyDescription="아직 연결된 소식이 없어요. 뉴스 메뉴에서 찾아볼 수 있어요." />
    </>}
    <InvestmentNotice />
    {!hasAssets && <Link to="/candidates">분야별 기업 살펴보기 →</Link>}
    <Modal title="이렇게 점검할 수 있어요" open={sampleOpen} onCancel={() => setSampleOpen(false)} footer={<Button type="primary" onClick={() => { setSampleOpen(false); openHolding() }}>내 첫 자산 등록하기</Button>}><Tag>가상 예시 · 개인 기록에 저장되지 않음</Tag><p>등록한 두 ETF가 같은 지수를 따르는지, 특정 회사에 비중이 몰렸는지 확인해요.</p><p>ETF 안의 실제 기업별 비중은 별도로 확인해야 해요.</p></Modal>
    {selected && <HoldingDrawer initial={selected.initial} others={draft.holdings.filter((_, index) => index !== selected.index)} editing={selected.index != null} saving={saving} error={error} close={() => { setSelected(null); setDraft(null) }} save={holding => { const holdings = selected.index == null ? [...draft.holdings, holding] : draft.holdings.map((h, i) => i === selected.index ? holding : h); void persist({ ...draft, holdings }) }} />}
    <Drawer title="현금·투자 계획" open={planOpen} onClose={closePlan} width="min(480px, 100vw)" maskClosable={!saving} keyboard={!saving} closable={!saving} footer={<Button block type="primary" size="large" loading={saving} onClick={() => void persist(draft)}>계획 저장하기</Button>}>
      <div className="holding-advanced"><label>보유 현금 · 원<InputNumber aria-label="보유 현금 · 원" style={{ width: '100%' }} disabled={saving} min={0} max={1e12} value={draft.cash} onChange={v => setDraft({ ...draft, cash: v ?? 0 })} /></label><label>투자 목표<Input aria-label="투자 목표" disabled={saving} value={draft.goal} maxLength={120} onChange={e => setDraft({ ...draft, goal: e.target.value })} /></label><label>투자 기간 · 개월<InputNumber aria-label="투자 기간 · 개월" style={{ width: '100%' }} disabled={saving} min={1} max={600} value={draft.horizonMonths} onChange={v => setDraft({ ...draft, horizonMonths: v ?? 1 })} /></label><label>투자 성향<Select aria-label="투자 성향" disabled={saving} value={draft.riskLevel} options={Object.entries(riskLabels).map(([value, label]) => ({ value, label }))} onChange={riskLevel => setDraft({ ...draft, riskLevel })} /></label><label>계좌 종류<Select aria-label="계좌 종류" disabled={saving} value={draft.accountType} options={Object.entries(accountLabels).map(([value, label]) => ({ value, label }))} onChange={accountType => setDraft({ ...draft, accountType })} /></label><label>월 추가 투자금 · 원<InputNumber aria-label="월 추가 투자금 · 원" style={{ width: '100%' }} disabled={saving} min={0} max={1e9} value={draft.monthlyContribution} onChange={v => setDraft({ ...draft, monthlyContribution: v ?? 0 })} /></label>{error && <Alert type="error" message={error} description="입력한 내용은 유지돼요." />}</div>
      <details style={{ marginTop: 24 }}><summary>내 조건으로 만드는 구성 초안</summary><p>기간·성향을 반영한 규칙 기반 예시예요. 실제 상품과 계좌 조건은 별도로 확인해주세요.</p>{Object.entries(portfolio?.targetAllocation ?? {}).map(([key, value]) => <p key={key}>{assetLabels[key]} {value}% · 월 배분 예시 {portfolio?.contributionPlan[key]?.toLocaleString()}원</p>)}<small>저장된 투자 조건 기준이에요. 변경한 조건은 저장 후 반영돼요.</small></details>
    </Drawer>
  </div>
}
