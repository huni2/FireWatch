import { AppDrawer as Drawer } from '../../components/AppDrawer'
// 등록과 점검을 분리하고 저장 응답을 즉시 홈에 반영한다.
import { useEffect, useRef, useState } from 'react'
import { Alert, App, Button, Card, Dropdown, Input, InputNumber, Modal, Select, Space, Tag, Typography } from 'antd'
import { Link, useSearchParams } from 'react-router-dom'
import { useApi } from '../../lib/useApi'
import { fetchPortfolio, savePortfolio, reviewPortfolio, saveHoldingNote } from '../../lib/investingApi'
import { accountLabels, assetLabels, emptyHolding, riskLabels, toDraft } from '../../../../shared/investing'
import type { Holding, PortfolioDraft, HoldingNoteRequest } from '../../../../shared/investing'
import { portfolioCoverageText, selectedHolding } from '../../../../shared/holding-registration'
import { PortfolioCheckup } from './PortfolioCheckup'
import { HoldingNotes, HoldingNoteEditor } from './HoldingNotes'
import { noteIsEmpty } from '../../../../shared/holding-notes'
import type { CheckupFinding } from '../../../../shared/portfolio-checkup'
import { InvestmentNotice } from '../../components/InvestmentNotice'
import { InvestmentStyleEntry } from '../investment-style/InvestmentStyleEntry'
import { PortfolioExposureCard } from './PortfolioExposureCard'
import { AllocationDonut } from './AllocationDonut'
import { PortfolioHero } from './PortfolioHero'
import { InvestmentFocus } from './InvestmentFocus'
import { HoldingDrawer } from './HoldingDrawer'
import { PortfolioConnections } from './PortfolioConnections'
import { SlowLoadingHint } from '../../components/SlowLoadingHint'
import './portfolio.css'
const { Title, Text } = Typography

export function PortfolioPage() {
  const query = useApi(fetchPortfolio)
  const [params, setParams] = useSearchParams()
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const { message, modal } = App.useApp()
  const [editingDraft, setDraft] = useState<PortfolioDraft | null>(null)
  const [selected, setSelected] = useState<{ initial: Holding; index: number | null } | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [noteTarget, setNoteTarget] = useState<{ symbol: string; name: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sampleOpen, setSampleOpen] = useState(false)
  const operation = useRef(false)
  const savedFocus = useRef(false)
  const holdingOpener = useRef<HTMLElement | null>(null)
  const findingRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLElement>(null)
  const analysisRef = useRef<HTMLElement>(null)
  const allocationRef = useRef<HTMLElement>(null)
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const draft = editingDraft ?? (query.data ? toDraft(query.data) : null)
  useEffect(() => {
    if (!savedFocus.current) return
    savedFocus.current = false
    const frame = requestAnimationFrame(() => headingRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [query.data])
  async function persist(next: PortfolioDraft, savedSymbol?: string) {
    if (operation.current) return false
    operation.current = true; setSaving(true); setError(null)
    try {
      const saved = await savePortfolio(next)
      savedFocus.current = true; setLastSaved(savedSymbol ?? null)
      query.replaceData(saved); setDraft(null); setSelected(null); setPlanOpen(false)
      message.success({ key: 'portfolio-save', content: '보유 기록을 저장했어요. 아래에서 내 자산을 점검해보세요.' })
      return true
    } catch (e) { setError(e instanceof Error ? e.message : '기록을 저장하지 못했어요.'); return false }
    finally { operation.current = false; setSaving(false) }
  }
  useEffect(() => {
    const symbol = params.get('add'), name = params.get('name')
    if (!query.data || !symbol || !name || !/^[A-Za-z0-9]+(\.[A-Za-z0-9]+)?$/.test(symbol)) return
    const timer = setTimeout(() => {
      const base = toDraft(query.data!), index = base.holdings.findIndex(row => row.symbol === symbol)
      setDraft(base); setSelected({ initial: index >= 0 ? base.holdings[index] : selectedHolding(emptyHolding(), symbol, name), index: index >= 0 ? index : null })
      const next = new URLSearchParams(params); next.delete('add'); next.delete('name'); setParams(next, { replace: true })
    }, 0)
    return () => clearTimeout(timer)
  }, [params, query.data, setParams])
  function returnToHoldingOpener() { requestAnimationFrame(() => { if (holdingOpener.current?.isConnected) holdingOpener.current.focus() }) }
  function closeHolding() { setSelected(null); setDraft(null); returnToHoldingOpener() }
  function openHolding(index: number | null = null) { if (!draft || saving) return; holdingOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setError(null); setDraft(draft); setSelected({ initial: index == null ? emptyHolding() : draft.holdings[index], index }) }
  function deleteHolding(index: number) {
    if (!draft || saving) return
    modal.confirm({ title: `${draft.holdings[index].name} 기록을 삭제할까요?`, content: '보유 기록만 삭제하며 실제 주식은 매도하지 않아요.', okText: '기록 삭제', cancelText: '유지하기', okButtonProps: { danger: true }, onOk: async () => { if (!await persist({ ...draft, holdings: draft.holdings.filter((_, i) => i !== index) })) throw new Error('삭제 실패') } })
  }
  function closePlan() {
    if (saving) return
    if (query.data && JSON.stringify(draft) !== JSON.stringify(toDraft(query.data))) modal.confirm({ title: '변경한 계획을 저장하지 않고 닫을까요?', okText: '변경 취소', cancelText: '계속 입력', onOk: () => { setDraft(null); setPlanOpen(false) } })
    else { setDraft(null); setPlanOpen(false) }
  }
  if (!draft) return <div className="portfolio-home"><InvestmentStyleEntry />{query.error ? <Alert type="error" message="기록을 불러오지 못했어요." description="등록한 기록을 지우지 않았어요. 다시 불러와주세요." action={<Button onClick={query.reload}>다시 시도</Button>} /> : <section aria-label="내 기록 조회" aria-busy="true"><p role="status">내 기록을 확인하고 있어요.</p><SlowLoadingHint loading={query.loading} isSlow={query.isSlow} /><Card loading title="내 자산 점검" /></section>}</div>
  const portfolio = query.data
  const hasAssets = !!portfolio && (portfolio.holdings.length > 0 || portfolio.cash > 0)
  async function markReview() {
    if (!query.data || operation.current) return
    operation.current = true; setSaving(true); setError(null)
    try { const saved = await reviewPortfolio(query.data.version); savedFocus.current = true; query.replaceData(saved); message.success('점검 기준을 저장했어요. 다음 방문에서 변화를 확인해보세요.') }
    catch (e) { setError(e instanceof Error ? e.message : '점검 기준을 저장하지 못했어요. 이전 기준은 유지돼요.') }
    finally { operation.current = false; setSaving(false) }
  }
  async function persistNote(note: HoldingNoteRequest): Promise<boolean> {
    if (operation.current) return false
    operation.current = true; setSaving(true); setError(null)
    try {
      const saved = await saveHoldingNote(note); query.replaceData(saved); setNoteTarget(null)
      message.success(noteIsEmpty(note) ? '투자 메모를 삭제했어요.' : '투자 메모를 저장했어요.'); returnToHoldingOpener()
      return true
    } catch (e) { setError(e instanceof Error ? e.message : '메모를 저장하지 못했어요. 입력한 내용은 유지돼요.'); return false }
    finally { operation.current = false; setSaving(false) }
  }
  function openNote(symbol: string, name: string) {
    if (saving) return
    holdingOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setError(null); setNoteTarget({ symbol, name })
  }
  function inspectFinding(kind: CheckupFinding['kind']) {
    const hasOverlap = kind !== 'largest'
    const target = hasOverlap ? detailsRef.current : allocationRef.current
    if (!target) return
    if (hasOverlap && detailsRef.current) detailsRef.current.open = true
    if (!hasOverlap) {
      const basis = allocationRef.current?.querySelector<HTMLDetailsElement>('.allocation-basis')
      if (basis) basis.open = true
    }
    target.style.scrollMarginTop = `${(document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0) + 16}px`
    const focusTarget = hasOverlap ? target.querySelector<HTMLElement>(`[data-checkup-section="${kind}"]`) ?? target.querySelector<HTMLElement>('summary') : target
    if (focusTarget) focusTarget.style.scrollMarginTop = target.style.scrollMarginTop
    focusTarget?.focus({ preventScroll: true })
    const scrollTarget = focusTarget ?? target
    scrollTarget.scrollIntoView({ block: 'start' })
  }
  function showHoldings() {
    const target = analysisRef.current
    if (!target) return
    target.style.scrollMarginTop = `${(document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0) + 16}px`
    target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'start' })
  }
  return <div className="portfolio-home">
    <header data-tour="portfolio-intro" ref={headingRef} tabIndex={-1} className="portfolio-home-heading"><div><Title level={2}>내 투자</Title></div>{hasAssets && <Space wrap><Button data-tour="portfolio-registration" type="primary" disabled={saving || draft.holdings.length >= 50} onClick={() => openHolding()}>자산 추가</Button><Button type="text" disabled={saving} onClick={() => { setError(null); setDraft(draft); setPlanOpen(true) }}>현금·투자 계획</Button></Space>}</header>
    {query.loading && hasAssets && <p role="status">등록한 기록을 유지하며 최신 내용을 확인하고 있어요.</p>}
    {query.error && <Alert type="warning" message="최신 기록을 확인하지 못했어요. 현재 기록은 유지돼요." action={<Button onClick={query.reload}>다시 확인</Button>} />}
    {error && !selected && !planOpen && !noteTarget && <Alert type="error" message={error} />}
    <InvestmentStyleEntry />
    {hasAssets && <nav aria-label="내 투자 바로가기"><Button onClick={showHoldings}>보유 내역 보기</Button></nav>}
    {!hasAssets && <section className="portfolio-welcome"><div className="welcome-copy"><span className="section-kicker">내 투자에서 발견하기</span><Title level={3}>내 자산이 어디에<br />몰려 있는지 알아보세요</Title><p>종목을 선택하고 수량을 입력하면 내 투자 구성을 점검할 수 있어요.<br />평균 구매 가격은 나중에 입력해도 괜찮아요.</p><Button data-tour="portfolio-registration" type="primary" size="large" disabled={saving} onClick={() => openHolding()}>첫 자산 등록</Button><Button type="text" onClick={() => setSampleOpen(true)}>예시로 먼저 보기 →</Button></div><div className="welcome-connection" aria-hidden="true"><span>다른 상품</span><div><b>ETF A</b><i /><b>ETF B</b></div><strong>같은 시장</strong><small>가상 예시 · 개인 기록에 저장되지 않음</small></div></section>}
    {hasAssets && portfolio && <>
      <PortfolioHero portfolio={portfolio} />
      {lastSaved && <div className="portfolio-saved" role="status"><span>{portfolio.holdings.find(row => row.holding.symbol === lastSaved)?.holding.name} 기록을 저장했어요.</span><Space wrap>{portfolio.holdingNotes !== undefined && <Button onClick={() => openNote(lastSaved, portfolio.holdings.find(row => row.holding.symbol === lastSaved)?.holding.name ?? lastSaved)}>보유 이유 남기기</Button>}<Button onClick={() => openHolding()}>다른 자산도 등록</Button></Space></div>}
      <section ref={findingRef} tabIndex={-1} className="portfolio-checkup" aria-label="내 투자 점검"><PortfolioCheckup portfolio={portfolio} busy={saving} refreshing={query.loading} onRefresh={query.reload} onInspect={inspectFinding} onEdit={symbol => { const index = draft.holdings.findIndex(row => row.symbol === symbol); if (index >= 0) openHolding(index) }} onReview={() => void markReview()} /></section>
      <HoldingNotes portfolio={portfolio} busy={saving} edit={openNote} />
      <div className="portfolio-home-grid"><aside ref={allocationRef} tabIndex={-1} className="portfolio-allocation" aria-label="등록한 자산 구성"><Title level={3}>내 자산 구성</Title><AllocationDonut allocation={portfolio.allocation} holdingsCount={portfolio.holdings.length} />{Object.entries(portfolio.allocation).map(([key, value]) => <div key={key} className="portfolio-weight-label"><span><span className="allocation-dot" style={{ background: key === 'ETF' ? 'var(--fw-connection)' : key === 'STOCK' ? 'var(--fw-market)' : 'var(--ant-color-text-secondary)' }} aria-hidden="true" />{assetLabels[key]}</span><strong>{value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%</strong></div>)}{!Object.keys(portfolio.allocation).length && <p>가격·환율을 확인하면 비중을 볼 수 있어요.</p>}<details className="allocation-basis"><summary>비중 계산 기준</summary><p>{portfolioCoverageText(portfolio)}</p><p>등록하지 않은 자산은 포함되지 않아요.</p></details></aside><section ref={analysisRef} tabIndex={-1} id="portfolio-analysis" className="portfolio-holdings" aria-label="저장된 보유 자산"><div className="portfolio-section-heading"><Title level={3}>보유 자산</Title><Text type="secondary">기록 수정</Text></div><p className="portfolio-coverage">{portfolioCoverageText(portfolio)}</p>
        {portfolio.holdings.map((row, index) => <article className={`portfolio-holding-row ${lastSaved === row.holding.symbol ? "just-saved" : ""}`} key={row.holding.symbol}><div><Link to={`/stocks?symbol=${encodeURIComponent(row.holding.symbol)}`}><strong>{row.holding.name}</strong></Link><small>{row.holding.quantity.toLocaleString()}주 · {assetLabels[row.holding.assetClass]}</small><small>{row.holding.averageCost == null ? '평균 구매 가격 미입력 · 손익 계산 안 함' : `평균 구매 가격 ${row.holding.averageCost.toLocaleString()} ${row.holding.currency === 'KRW' ? '원' : '달러'}`}</small></div><div className="portfolio-holding-value"><strong>{row.valueKrw == null ? '가격·환율 확인 필요' : `${row.valueKrw.toLocaleString()}원`}</strong><small>{row.quoteAsOf ? `시세 ${new Date(row.quoteAsOf).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}` : '시세 미수집'}</small></div><Space wrap>{portfolio.holdingNotes !== undefined && <Button type="text" disabled={saving} aria-label={`${row.holding.name} 투자 메모`} onClick={() => openNote(row.holding.symbol, row.holding.name)}>투자 메모</Button>}<Button type="text" disabled={saving} aria-label={`${row.holding.name} 기록 수정`} onClick={() => openHolding(index)}>수정</Button><Dropdown trigger={['click']} menu={{ items: [{ key: 'delete', label: '보유 기록 삭제', danger: true, onClick: () => deleteHolding(index) }] }}><Button type="text" disabled={saving} aria-label={`${row.holding.name} 기록 더보기`}>···</Button></Dropdown></Space></article>)}
        <div className="portfolio-cash-row"><Text>등록한 현금</Text><strong>{portfolio.cash.toLocaleString()}원</strong></div>
        <details className="portfolio-profit"><summary>투자원금·손익 확인</summary>{portfolio.holdings.some(row => row.holding.averageCost == null) && <p>평균 구매 가격이 없는 종목이 있어 전체 투자원금과 손익을 계산하지 않았어요.</p>}<p>투자원금 {portfolio.investedKrw == null ? '평균 구매 가격·환율 확인 필요' : `${portfolio.investedKrw.toLocaleString()}원`}</p><p>가격 변동 수익률 {portfolio.returnPercent == null ? '계산하지 않았어요' : `${portfolio.returnPercent}%`}</p><small>평균 구매 가격·수집 시세·환율이 확인된 경우 계산해요. 수수료·세금은 포함하지 않아요.</small></details>
      </section></div>
      <PortfolioConnections portfolio={portfolio} />
      <details ref={detailsRef} className="portfolio-details"><summary>분야·거래 통화·ETF 지수명 비교</summary><PortfolioExposureCard portfolio={portfolio} /></details>
      <InvestmentFocus portfolio={portfolio} />
    </>}
    {portfolio && !hasAssets && <HoldingNotes portfolio={portfolio} busy={saving} edit={openNote} />}
    <InvestmentNotice />
    {!hasAssets && <Link to="/candidates">분야별 기업 살펴보기 →</Link>}
    <Modal title="다른 ETF, 같은 시장" open={sampleOpen} onCancel={() => setSampleOpen(false)} footer={<Button type="primary" onClick={() => { setSampleOpen(false); openHolding() }}>내 첫 자산 등록하기</Button>}><Tag>가상 예시 · 개인 기록에 저장되지 않음</Tag><div className="sample-connection"><span>S&P 500 ETF A</span><b>같은 지수 · S&P 500</b><span>S&P 500 ETF B</span></div><p>다른 상품을 등록해도 같은 지수명을 입력했다면 함께 보여줘요.</p><p>ETF 안의 실제 기업별 비중은 별도로 확인해야 해요.</p></Modal>
    {noteTarget && portfolio && <HoldingNoteEditor key={noteTarget.symbol} {...noteTarget} initial={portfolio.holdingNotes?.find(note => note.symbol === noteTarget.symbol)} version={portfolio.version} busy={saving} error={error} close={() => { setNoteTarget(null); setError(null); returnToHoldingOpener() }} save={persistNote} />}
    {selected && <HoldingDrawer key={`${selected.index ?? 'new'}:${selected.initial.symbol}`} editExisting={symbol => { const index = draft.holdings.findIndex(row => row.symbol.toUpperCase() === symbol.toUpperCase()); if (index >= 0) openHolding(index) }} initial={selected.initial} others={draft.holdings.filter((_, index) => index !== selected.index)} editing={selected.index != null} saving={saving} error={error} close={closeHolding} returnFocus={returnToHoldingOpener} save={holding => { const holdings = selected.index == null ? [...draft.holdings, holding] : draft.holdings.map((h, i) => i === selected.index ? holding : h); void persist({ ...draft, holdings }, holding.symbol) }} />}
    <Drawer title="현금·투자 계획" open={planOpen} onClose={closePlan} width="min(480px, 100vw)" maskClosable={!saving} keyboard={!saving} closable={!saving} footer={<Button block type="primary" size="large" loading={saving} onClick={() => void persist(draft)}>계획 저장하기</Button>}>
      <div className="holding-advanced"><label>보유 현금 · 원<InputNumber aria-label="보유 현금 · 원" style={{ width: '100%' }} disabled={saving} min={0} max={1e12} value={draft.cash} onChange={v => setDraft({ ...draft, cash: v ?? 0 })} /></label><label>투자 목표<Input aria-label="투자 목표" disabled={saving} value={draft.goal} maxLength={120} onChange={e => setDraft({ ...draft, goal: e.target.value })} /></label><label>투자 기간 · 개월<InputNumber aria-label="투자 기간 · 개월" style={{ width: '100%' }} disabled={saving} min={1} max={600} value={draft.horizonMonths} onChange={v => setDraft({ ...draft, horizonMonths: v ?? 1 })} /></label><label>투자 성향<Select aria-label="투자 성향" disabled={saving} value={draft.riskLevel} options={Object.entries(riskLabels).map(([value, label]) => ({ value, label }))} onChange={riskLevel => setDraft({ ...draft, riskLevel })} /></label><label>계좌 종류<Select aria-label="계좌 종류" disabled={saving} value={draft.accountType} options={Object.entries(accountLabels).map(([value, label]) => ({ value, label }))} onChange={accountType => setDraft({ ...draft, accountType })} /></label><label>월 추가 투자금 · 원<InputNumber aria-label="월 추가 투자금 · 원" style={{ width: '100%' }} disabled={saving} min={0} max={1e9} value={draft.monthlyContribution} onChange={v => setDraft({ ...draft, monthlyContribution: v ?? 0 })} /></label>{error && <Alert type="error" message={error} description="입력한 내용은 유지돼요." />}</div>
      <details style={{ marginTop: 24 }}><summary>내 조건으로 만드는 구성 초안</summary><p>기간·성향을 반영한 규칙 기반 예시예요. 실제 상품과 계좌 조건은 별도로 확인해주세요.</p>{Object.entries(portfolio?.targetAllocation ?? {}).map(([key, value]) => <p key={key}>{assetLabels[key]} {value}% · 월 배분 예시 {portfolio?.contributionPlan[key]?.toLocaleString()}원</p>)}<small>저장된 투자 조건 기준이에요. 변경한 조건은 저장 후 반영돼요.</small></details>
    </Drawer>
  </div>
}
