import { useEffect, useRef, useState } from 'react'
import { Alert, App, Button, Empty, InputNumber, Modal, Popconfirm, Segmented, Select, Skeleton, Space, Table, Tag } from 'antd'
import { ArrowRightOutlined, CheckOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { GameDifficulty, GameInstrumentType, GameOrderPreview, GameTradeAction, GameTurn, StockSearchResult } from '../../lib/api'
import { ApiRequestError, endGame, fetchCurrentTurn, nextGameTurn, previewGame, startGame, tradeGame } from '../../lib/api'
import { gameAssets, searchGameAssets } from '../../../../shared/game-assets'
import { virtualOrderPreview } from '../../../../shared/game-preview'
import { historyChange, positionStats } from '../../../../shared/game-turn'
import { GameAssetDetail, type GameDetailTarget } from './GameAssetDetail'
import { GameReplay, type ReplayState } from './GameReplay'
import scout from '../../../../shared/assets/firewatch-scout.png'
import { ModernToggle } from '../../vendor/threeui/ModernToggle'
import './game.css'

const instruments: { value: GameInstrumentType; label: string }[] = [
  { value: 'STOCK', label: '개별 종목' }, { value: 'KOSPI', label: '코스피' }, { value: 'KOSDAQ', label: '코스닥' },
  { value: 'SP500', label: 'S&P 500' }, { value: 'NASDAQ', label: '나스닥' }, { value: 'DOW', label: '다우' },
  { value: 'GOLD', label: '금' }, { value: 'SILVER', label: '은' }, { value: 'USD', label: '달러' },
]
const assetName = (type: GameInstrumentType, symbol: string | null) => symbol ? gameAssets.find(a => a.symbol === symbol)?.name ?? symbol : instruments.find(i => i.value === type)?.label ?? type
const money = (value: number | null | undefined) => value == null ? '평가 미확정' : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
const percent = (value: number | null) => value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`

export function GameExperience() {
  const { message } = App.useApp()
  const [turn, setTurn] = useState<GameTurn | null>(null)
  const [workspaceView, setWorkspaceView] = useState('market')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<GameDifficulty>('NORMAL')
  const [short, setShort] = useState(false)
  const [busy, setBusy] = useState(false)
  const [replay, setReplay] = useState<ReplayState | null>(null)
  const [lastReplay, setLastReplay] = useState<ReplayState | null>(null)
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(busy || loading), busy || loading ? 3000 : 0)
    return () => clearTimeout(timer)
  }, [busy, loading])
  const [help, setHelp] = useState(false)
  const [instrument, setInstrument] = useState<GameInstrumentType>('KOSPI')
  const [symbol, setSymbol] = useState<string | null>(null)
  const [detail, setDetail] = useState<GameDetailTarget | null>(null)
  const orderPanel = useRef<HTMLElement | null>(null)
  const [selectionNotice, setSelectionNotice] = useState('')
  function selectOrder(target: GameDetailTarget, action: 'BUY' | 'SELL' = 'BUY') {
    if (busy || turn?.status !== 'ACTIVE') return
    setInstrument(target.instrumentType); setSymbol(target.symbol); setSide(action); setDetail(null)
    setWorkspaceView('order')
    setQuantity(current => current != null && current > 0 ? current : 1)
    setSelectionNotice(`${target.name}이 ${action === 'BUY' ? '매수' : '매도'} 주문에 선택됐습니다. 수량과 총액을 확인해주세요.`)
    requestAnimationFrame(() => orderPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }
  const [side, setSide] = useState<GameTradeAction>('BUY')
  const [quantity, setQuantity] = useState<number | null>(1)
  const [serverPreview, setPreview] = useState<GameOrderPreview | null>(null)
  const [remotePreviewLoading, setPreviewLoading] = useState(false)
  const previewLoading = !turn?.simulation && remotePreviewLoading
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [candidates, setCandidates] = useState<StockSearchResult[] | null>(null)
  const [pickName, setPickName] = useState('')
  const [pickLoading, setPickLoading] = useState(false)
  const [pickError, setPickError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const generation = useRef(0), pickGeneration = useRef(0), operation = useRef(false), orderId = useRef<string | null>(null)
  async function load() {
    setLoading(true); setError(null)
    try { setTurn(await fetchCurrentTurn()) }
    catch (e) { if (!(e instanceof ApiRequestError && e.status === 404)) setError(e instanceof Error ? e.message : '조회 실패') }
    finally { setLoading(false) }
  }
  useEffect(() => {
    let active = true
    fetchCurrentTurn().then(t => { if (active) setTurn(t) }).catch(e => { if (active && !(e instanceof ApiRequestError && e.status === 404)) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    const previewRef = generation, pickRef = pickGeneration
    return () => { active = false; previewRef.current++; pickRef.current++ }
  }, [])
  const orderKey = `${turn?.sessionId}:${turn?.turnIndex}:${instrument}:${symbol}:${side}:${quantity}:${revision}`
  const preview = turn?.simulation ? virtualOrderPreview(turn, instrument, instrument === 'STOCK' ? symbol : null, side, quantity) : serverPreview
  useEffect(() => {
    const previewRef = generation
    const id = ++previewRef.current
    orderId.current = null
    if (turn?.simulation) return
    const timer = setTimeout(() => {
      setPreview(null); setPreviewError(null)
      if (!turn || turn.status !== 'ACTIVE' || !quantity || quantity <= 0 || (instrument === 'STOCK' && !symbol)) { setPreviewLoading(false); return }
      setPreviewLoading(true)
      previewGame({ instrumentType: instrument, symbol: instrument === 'STOCK' ? symbol ?? undefined : undefined, action: side, quantity, expectedTurnIndex: turn.turnIndex })
        .then(p => { if (id === generation.current) setPreview(p) })
        .catch(e => { if (id === generation.current) setPreviewError(e.message) })
        .finally(() => { if (id === generation.current) setPreviewLoading(false) })
    }, 250)
    return () => { clearTimeout(timer); previewRef.current++ }
    // orderKey represents every order input and a refresh revision after mutations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey])
  const matches = preview != null && preview.turnIndex === turn?.turnIndex && preview.instrumentType === instrument && preview.symbol === (instrument === 'STOCK' ? symbol : null) && preview.action === side && preview.quantity === quantity
  async function run(action: 'start' | 'next' | 'end' | 'trade') {
    if (operation.current || (action === 'trade' && (!matches || !preview?.allowed))) return
    operation.current = true; setBusy(true); setError(null)
    if (action === 'next') message.destroy()
    const replayBefore = action === 'next' && turn?.simulation ? turn : null
    if (replayBefore) setReplay({ before: replayBefore, after: null })
    if (action === 'start') { setReplay(null); setLastReplay(null) }
    try {
      const updated = action === 'start' ? await startGame({ difficulty, allowShortSelling: short }) : action === 'next' ? await nextGameTurn(turn?.turnIndex) : action === 'end' ? await endGame()
        : await tradeGame({ instrumentType: instrument, symbol: instrument === 'STOCK' ? symbol ?? undefined : undefined, action: side, quantity: quantity!, expectedTurnIndex: turn!.turnIndex, expectedPrice: preview!.unitPrice, requestId: orderId.current ?? (orderId.current = crypto.randomUUID()) })
      setTurn(updated); setConfirming(false); setPreview(null); setRevision(v => v + 1)
      if (action === 'start' || action === 'next') setWorkspaceView('market')
      if (replayBefore && updated.turnIndex > replayBefore.turnIndex) {
        const completed = { before: replayBefore, after: updated }
        setLastReplay(completed); setReplay(current => current ? completed : null)
      } else if (replayBefore) setReplay(null)
      if (action === 'trade') message.success('거래 체결 완료 · 체결 내역에서 총액을 확인하세요.')
    } catch (e) { setReplay(null); setError(e instanceof Error ? e.message : '요청 실패'); if (e instanceof ApiRequestError && e.status === 409) void load() }
    finally { operation.current = false; setBusy(false) }
  }
  async function pick(name: string) {
    const asset = gameAssets.find(a => a.name === name || a.symbol === name)
    if (asset && turn?.stockPrices[asset.symbol] != null) { selectOrder({ instrumentType: 'STOCK', symbol: asset.symbol, name: asset.name }); return }
    const id = ++pickGeneration.current
    setPickName(name); setCandidates([]); setPickLoading(true); setPickError(null)
    try { const results = searchGameAssets(name); if (id === pickGeneration.current) setCandidates(results) }
    catch (e) { if (id === pickGeneration.current) setPickError(e instanceof Error ? e.message : '종목 확인 실패') }
    finally { if (id === pickGeneration.current) setPickLoading(false) }
  }
  return <div className={`game-page view-${workspaceView} ${turn?.status === 'ENDED' ? 'session-ended' : ''}`}>
    <GameReplay value={replay} close={() => setReplay(null)} />
    {lastReplay && <Button onClick={() => setReplay(lastReplay)}>지난 턴 복기 다시보기</Button>}
    {slow && (busy || loading) && <Alert type="info" showIcon message="서버 응답을 기다리고 있습니다. 서버가 잠들어 있었다면 첫 요청에 시간이 걸릴 수 있습니다." />}
    <section className={`game-hero ${turn ? 'in-session' : ''}`} data-tour="game-intro"><div className="game-signal" aria-hidden="true"><svg viewBox="0 0 500 200"><path d="M0 150H70L110 100L140 120L200 45L250 85L285 60L340 110L390 40L435 65L500 10" /><path d="M0 180H100L150 145L210 170L270 100L320 130L370 80L420 110L500 60" /></svg></div><span className="eyebrow"><ThunderboltOutlined /> FIREWATCH / MARKET ARCADE</span><h1>가상투자 게임<span>시장을 읽고, 다음 턴을 선택하세요.</span></h1><p>가상 뉴스·지표·가격으로 진행하는 독립 턴제 게임. 모든 매매는 게임머니로 진행됩니다.</p><Button onClick={() => setHelp(true)}>게임 규칙</Button></section>
    {turn && !turn.simulation && <Alert type="info" message="기존 과거 자료 게임입니다. 기존 기록을 보관하고 완전 가상 게임을 새로 시작할 수 있습니다." action={<Button loading={busy} onClick={() => run('start')}>완전 가상 게임 시작</Button>} />}{error && <Alert type="error" showIcon message={error} action={<Button disabled={busy} onClick={load}>현재 상태 확인</Button>} />}
    {loading ? <Skeleton active /> : !turn ? <section className="game-panel game-start"><h2>게임머니로 첫 선택을 해보세요.</h2><p>24턴 · 시작 게임머니 {difficulty === 'EASY' ? '2,000만' : difficulty === 'HARD' ? '500만' : '1,000만'} · 공매도 {short ? '허용' : '사용 안 함'}</p><Button size="large" type="primary" loading={busy} icon={<ArrowRightOutlined />} onClick={() => run('start')}>게임 시작</Button><details className="game-start-options"><summary>난이도·공매도 설정</summary><div className="difficulty-grid">{([{ value: 'EASY', name: '여유롭게', cash: '2,000만' }, { value: 'NORMAL', name: '균형 있게', cash: '1,000만' }, { value: 'HARD', name: '신중하게', cash: '500만' }] as const).map(d => <button key={d.value} disabled={busy} aria-pressed={difficulty === d.value} className={`difficulty ${difficulty === d.value ? 'selected' : ''}`} onClick={() => setDifficulty(d.value)}><span>{d.name}</span><strong>{d.cash}</strong><small>시작 게임머니</small>{difficulty === d.value && <CheckOutlined />}</button>)}</div><div className="short-setting"><div><h3>공매도 모드</h3><p>보유하지 않은 자산도 매도합니다. 실제 증거금·청산은 반영하지 않습니다.</p></div><ModernToggle checked={short} disabled={busy} onChange={setShort} label="공매도 허용" size={0.5} className="game-toggle" /></div></details></section> : <>
      <div className="game-turn-bar"><div><Tag color="orange">{turn.status === 'ENDED' ? '게임 종료' : '진행 중'}</Tag><strong>TURN {String(turn.turnIndex + 1).padStart(2, '0')} / {turn.totalTurns}</strong><span>가상 날짜 {turn.turnDate}</span><Tag>가상 시뮬레이션</Tag></div><Popconfirm title="현재 기록으로 게임을 종료할까요?" onConfirm={() => run('end')} disabled={busy || turn.status === 'ENDED'}><Button danger disabled={busy || turn.status === 'ENDED'}>게임 종료</Button></Popconfirm></div>
      <div className="game-metrics"><div className="metric-main"><span>총자산 · 게임머니</span><strong>{money(turn.portfolioValue)}</strong><small>현금 + 보유 자산 평가액</small></div><div><span>시작 대비 수익률</span><strong className={(turn.returnPercent ?? 0) < 0 ? 'negative' : 'positive'}>{percent(turn.returnPercent)}</strong><small>무작위 턴의 게임 결과</small></div><div><span>보유 현금</span><strong>{money(turn.cash)}</strong><small>현재 주문 가능한 게임머니</small></div></div>
      {turn.portfolioValue == null && <Alert type="warning" showIcon message="가격 자료가 없어 평가를 확정하지 않았습니다." description="보유 수량과 현금은 유지됩니다. 0원이나 실제 거래정지로 해석하지 마세요." />}
      {turn.status === 'ACTIVE' && <Segmented className="game-mobile-tabs" aria-label="게임 작업" value={workspaceView} onChange={v => setWorkspaceView(String(v))} options={[{ value: 'market', label: '시장·픽' }, { value: 'order', label: '주문' }, { value: 'positions', label: '보유·체결' }]} />}
      {turn.turnIndex > 0 && <section className="turn-result"><ThunderboltOutlined /><div><strong>이번 턴 결과</strong><p>{turn.turnChange == null ? '직전 턴 평가 기준이 없어 변화액을 확정할 수 없습니다.' : `직전 턴 대비 총자산 ${turn.turnChange >= 0 ? '+' : ''}${money(turn.turnChange)}. 보유 자산의 턴별 가격 변화가 반영됐습니다.`} 이번 턴의 가상 뉴스에서 시장과 업종에 영향을 준 사건을 확인하세요.</p></div></section>}
      {(turn.marketEvents ?? []).map(event => <Alert key={event.code} type="warning" showIcon message={event.title} description={event.description} />)}
      {turn.turnIndex > 0 && <section className="game-panel game-contributions"><span className="eyebrow">TURN BREAKDOWN</span><h2>자산별 손익 기여</h2><p>직전 턴 보유 수량 × (이번 가격 − 직전 가격). 이번 턴에 매도한 자산과 공매도도 포함합니다.</p><div className="turn-contributions">{(turn.turnContributions ?? []).length ? turn.turnContributions.map(c => <article key={`${c.instrumentType}:${c.symbol}`}><div><strong>{c.symbol ? c.name : assetName(c.instrumentType as GameInstrumentType, null)}</strong><strong className={(c.profit ?? 0) < 0 ? 'negative' : 'positive'}>{c.profit == null ? '미확정' : `${c.profit >= 0 ? '+' : ''}${money(c.profit)}`}</strong></div><p>{c.carriedQuantity}개 × ({money(c.currentPrice)} − {money(c.previousPrice)})</p><small>{c.reason}</small></article>) : <p className="muted">직전 턴 보유 자산이 없어 가격 변화에 따른 손익은 0입니다.</p>}</div></section>}
      {turn.status === 'ENDED' ? <section className="game-panel"><span className="eyebrow">SESSION COMPLETE</span><h2>이번 게임, 어떻게 플레이했나요?</h2><p>첫 턴 대비 코스피 변화 {percent(turn.benchmarkReturnPercent)} · 무작위 날짜이므로 실제 기간 벤치마크가 아닙니다.</p><ul>{turn.review.map(r => <li key={r}>{r}</li>)}</ul><Button type="primary" onClick={() => { setTurn(null); setError(null) }}>새 게임 설정</Button></section> : <div className="game-workspace"><div className="market-column">
        <section className="game-panel"><div className="panel-heading"><div><span className="eyebrow">MARKET CONTEXT</span><h2>이번 턴의 시장</h2></div><Tag>{turn.turnDate}</Tag></div><p className="market-summary">{turn.briefing.marketSummary || '이 턴의 시장 요약이 없습니다.'}</p><div className="market-readings">{[{ name: '코스피', value: turn.briefing.kospi }, { name: 'S&P 500', value: turn.briefing.sp500 }, { name: '달러/원', value: turn.briefing.usdKrw }].map(m => <div key={m.name}><span>{m.name}</span><strong>{m.value == null ? '자료 없음' : money(m.value)}</strong></div>)}</div></section>
        <section className="game-panel pick-panel"><span className="eyebrow">AI WATCHLIST</span><div className="pick-guide"><img src={scout} alt="FireWatch 불꽃 정찰대" /><div><h2>AI의 이번 턴 픽</h2><small>불꽃 정찰대의 관찰 노트</small></div></div><p>게임 시나리오로 생성한 가상 후보입니다. 실제 AI의 투자 추천이 아닙니다.</p>{turn.briefing.recommendedStocks.length ? <div className="pick-list">{turn.briefing.recommendedStocks.map(name => <article className="pick-note" key={name}><button key={name} disabled={busy} onClick={() => pick(name)}><span>{name}<small style={{ display: 'block', marginTop: 6 }}>가격 {money(turn.stockPrices[gameAssets.find(a => a.name === name || a.symbol === name)?.symbol ?? ''])} 게임머니 · 매수 주문에 담기</small></span><ArrowRightOutlined /></button>{(() => { const note = turn.gamePicks?.find(p => p.name === name); return note ? <div className="pick-reason"><strong>왜 골랐나요?</strong><p>{note.reason}</p><small>{note.newsTitle}</small><div className="pick-risk"><strong>확인할 위험</strong><p>{note.risk}</p></div></div> : <p className="pick-reason">이 기록에는 선정 이유가 없습니다. 가상 후보 목록으로만 확인해주세요.</p> })()}</article>)}</div> : <div className="game-empty"><strong>이 턴에는 저장된 AI 후보가 없습니다.</strong><p>{turn.briefing.dataSourceStatus === 'FALLBACK' ? '브리핑이 대체 데이터로 저장됐습니다. 후보를 임의로 만들지 않습니다.' : '후보가 비어 있습니다. 거래 패널에서 직접 종목을 탐색할 수 있습니다.'}</p></div>}</section>
        <section className="game-panel"><span className="eyebrow">ALL COMPANIES</span><h2>거래 가능한 가상 회사 전체</h2><p>이번 턴의 픽 외 회사도 선택할 수 있습니다. 가격 단위는 게임머니입니다.</p><div className="game-company-list">{gameAssets.map(asset => { const change = historyChange(turn.assetHistories?.find(h => h.symbol === asset.symbol)); return <article key={asset.symbol}><strong>{asset.name}</strong><span>{money(turn.stockPrices[asset.symbol])} 게임머니</span><small className={change && change.percent < 0 ? 'negative' : 'positive'}>{change ? `직전 턴 ${percent(change.percent)}` : '첫 턴 또는 이전 기록 없음'}</small><Space><Button onClick={() => setDetail({ instrumentType: 'STOCK', symbol: asset.symbol, name: asset.name })}>상세보기</Button><Button disabled={busy || turn.stockPrices[asset.symbol] == null} onClick={() => selectOrder({ instrumentType: 'STOCK', symbol: asset.symbol, name: asset.name })}>매수 주문</Button></Space></article> })}</div></section>
        <section className="game-panel"><span className="eyebrow">NEWS DESK</span><h2>판단에 참고할 소식</h2>{turn.briefing.news.length ? <div className="game-news">{turn.briefing.news.slice(0, 5).map(n => <article key={n.title}><strong>{n.title}</strong><span>{n.description ?? "게임 속 가상 사건"}</span></article>)}</div> : <p className="muted">이 날짜에 저장된 뉴스가 없습니다.</p>}</section>
      </div><section ref={orderPanel} className="game-panel order-panel"><span className="eyebrow">YOUR NEXT MOVE</span><h2>거래 주문</h2>{selectionNotice && <Alert type="success" message={selectionNotice} />}<p>가상 거래 단가입니다. 실제 금·환율·지수 상품 주문과 다릅니다.</p><label>거래 자산<Select aria-label="거래 자산" disabled={busy} value={instrument} options={instruments} onChange={setInstrument} /></label>{instrument === 'STOCK' && <div className="order-stock"><Select aria-label="가상 종목 선택" showSearch optionFilterProp="label" disabled={busy} value={symbol} placeholder="가상 회사 선택" options={gameAssets.map(a => ({ value: a.symbol, label: `${a.name} · ${money(turn.stockPrices[a.symbol])} 게임머니` }))} onChange={setSymbol} />{symbol && <Tag>{assetName('STOCK', symbol)}</Tag>}</div>}<label>주문 방향<Segmented block disabled={busy} value={side} onChange={v => setSide(v as GameTradeAction)} options={[{ label: '매수', value: 'BUY' }, { label: '매도', value: 'SELL' }]} /></label><label>수량<InputNumber aria-label="거래 수량" disabled={busy} min={0.0001} max={1000000000} precision={4} value={quantity} onChange={setQuantity} style={{ width: '100%' }} /></label>
        <div className="order-preview" aria-live="polite">{previewLoading ? <p>적용 가격과 거래 금액 확인 중…</p> : matches ? <><dl><div><dt>적용 단가</dt><dd>{money(preview.unitPrice)}</dd></div><div className="preview-total"><dt>총 거래 금액</dt><dd>{money(preview.total)}</dd></div><div><dt>거래 후 현금</dt><dd>{money(preview.cashAfter)}</dd></div><div><dt>거래 후 보유량</dt><dd>{preview.quantityAfter.toLocaleString()}개</dd></div></dl>{!preview.allowed && <Alert type="warning" message={preview.reason} />}</> : <p>{previewError ?? '자산과 수량을 선택하면 총액이 표시됩니다.'}</p>}</div>
        <Button type="primary" size="large" block disabled={busy || previewLoading || !matches || !preview?.allowed} onClick={() => { orderId.current = crypto.randomUUID(); setConfirming(true) }}>{side === 'BUY' ? '매수' : '매도'} 금액 확인</Button><small className="order-footnote">수수료·세금 0 · 확인된 가격으로 체결</small>
      </section></div>}
      <section className="game-panel game-positions"><span className="eyebrow">MY POSITIONS</span><h2>보유 자산</h2><p>평가손익은 현재 보유분의 평균 진입 단가 기준입니다. 직전 턴 가격 등락과 구분해 보세요.</p><div className="game-mobile-list">{turn.holdings.length ? turn.holdings.map(h => { const stats = positionStats(turn.transactions, h.instrumentType, h.symbol, h.currentPrice); return <article key={`${h.instrumentType}:${h.symbol}`}><Button type="link" onClick={() => setDetail({ instrumentType: h.instrumentType, symbol: h.symbol, name: assetName(h.instrumentType, h.symbol) })}>{assetName(h.instrumentType, h.symbol)} 상세보기</Button><p>보유 {h.quantity}개 · 단가 {money(h.currentPrice)}</p><strong>평가액 {money(h.value)} 게임머니</strong><p className={(stats.profit ?? 0) < 0 ? "negative" : "positive"}>평가손익 {money(stats.profit)} · {percent(stats.returnPercent)}</p></article> }) : <p>첫 거래를 하면 보유 자산이 표시됩니다.</p>}</div><Table rowKey={h => `${h.instrumentType}:${h.symbol}`} dataSource={turn.holdings} pagination={false} scroll={{ x: 900 }} locale={{ emptyText: <Empty description="첫 거래를 하면 보유 자산이 표시됩니다." /> }} columns={[{ title: '자산', render: (_, h) => <Button type="link" onClick={() => setDetail({ instrumentType: h.instrumentType, symbol: h.symbol, name: assetName(h.instrumentType, h.symbol) })}>{assetName(h.instrumentType, h.symbol)} 상세보기</Button> }, { title: '수량', dataIndex: 'quantity', align: 'right' }, { title: '적용 단가', render: (_, h) => h.currentPrice == null ? '가격 자료 없음' : money(h.currentPrice), align: 'right' }, { title: '평가액', render: (_, h) => money(h.value), align: 'right' }, { title: '직전 턴 가격', render: (_, h) => { const change = historyChange(turn.assetHistories?.find(a => a.instrumentType === h.instrumentType && a.symbol === h.symbol)); return change ? <span className={change.percent < 0 ? 'negative' : 'positive'}>{percent(change.percent)}</span> : '이전 기록 없음' } }, { title: '평가손익', render: (_, h) => { const stats = positionStats(turn.transactions, h.instrumentType, h.symbol, h.currentPrice); return <span className={(stats.profit ?? 0) < 0 ? 'negative' : 'positive'}>{stats.profit == null ? '미확정' : `${stats.profit >= 0 ? '+' : ''}${money(stats.profit)} (${percent(stats.returnPercent)})`}</span> } }]} /></section>
      <section className="game-panel game-receipts"><span className="eyebrow">TRADE RECEIPTS</span><h2>체결 내역</h2><div className="game-mobile-list">{[...(turn.transactions ?? [])].reverse().slice(0, 5).map(t => <article key={t.id}><strong>{assetName(t.instrumentType, t.symbol)} · {t.action === "BUY" ? "매수" : "매도"}</strong><p>턴 {t.turnIndex + 1} · {t.quantity}개 × {money(t.price)}</p><strong>총 {money(t.total)} 게임머니</strong></article>)}{!turn.transactions?.length && <p>체결된 거래가 없습니다.</p>}<small>최근 5개 체결 · 자산 상세에서 전체 자산별 기록을 확인하세요.</small></div><Table rowKey="id" dataSource={[...(turn.transactions ?? [])].reverse()} pagination={{ pageSize: 5, hideOnSinglePage: true }} scroll={{ x: 600 }} locale={{ emptyText: '아직 체결된 거래가 없습니다.' }} columns={[{ title: '턴', render: (_, t) => t.turnIndex + 1 }, { title: '자산', render: (_, t) => assetName(t.instrumentType, t.symbol) }, { title: '거래', render: (_, t) => <Tag color={t.action === 'BUY' ? 'orange' : 'blue'}>{t.action === 'BUY' ? '매수' : '매도'}</Tag> }, { title: '수량', dataIndex: 'quantity', align: 'right' }, { title: '단가', render: (_, t) => money(t.price), align: 'right' }, { title: '총 거래 금액', render: (_, t) => money(t.total), align: 'right' }]} /></section>
      {turn.status === 'ACTIVE' && <div className="game-bottom-bar"><div><strong>이번 턴의 선택을 마쳤나요?</strong><span>보유 자산 평가가 확인된 경우에만 진행합니다.</span></div><Button type="primary" size="large" loading={busy} disabled={confirming || previewLoading} icon={<ArrowRightOutlined />} onClick={() => run('next')}>다음 턴으로</Button></div>}
    </>}
    {turn && <GameAssetDetail target={detail} turn={turn} close={() => setDetail(null)} order={selectOrder} />}
    <Modal title={`${side === 'BUY' ? '매수' : '매도'} 주문 확인`} open={confirming} onCancel={() => { if (!busy) setConfirming(false) }} onOk={() => run('trade')} confirmLoading={busy} okButtonProps={{ disabled: !matches || !preview?.allowed }} cancelButtonProps={{ disabled: busy }} okText="이 금액으로 체결" cancelText="돌아가기">{matches && <><p>{assetName(instrument, instrument === 'STOCK' ? symbol : null)} · {quantity}개 × {money(preview.unitPrice)}</p><h2>{money(preview.total)} 게임머니</h2><p>거래 후 현금 {money(preview.cashAfter)} · 보유량 {preview.quantityAfter}개</p></>}</Modal>
    <Modal title="가상투자 게임 규칙" open={help} onCancel={() => setHelp(false)} footer={<Button onClick={() => setHelp(false)}>확인</Button>}><p>모든 뉴스·지표·가격·AI 픽은 가상으로 생성됩니다. 날짜는 무작위이며 가격은 날짜가 아닌 턴 순서와 시나리오를 따라 변화합니다.</p><p>단가 × 수량을 게임머니로 계산합니다. 실제 원화 환산·수수료·세금·기업행사는 반영하지 않습니다.</p><p>가상 사이드카는 이번 턴의 지수 주문만 막습니다. 가상 개별 종목 거래정지는 매매를 막고 직전 가격으로 평가합니다. 제한은 한 턴 뒤 해제되며 새로운 사건이 다시 발생할 수 있습니다. 실제 거래소 제도와 다른 게임 규칙입니다.</p><p>자료가 없는 가격은 0원으로 처리하지 않습니다. 다음 턴의 보유 가격이 없으면 진행을 보류합니다.</p></Modal>
    <Modal title={`후보 종목 확인 · ${pickName}`} open={candidates != null} onCancel={() => { pickGeneration.current++; setCandidates(null) }} footer={<Button onClick={() => { pickGeneration.current++; setCandidates(null) }}>닫기</Button>}>{pickLoading ? <Skeleton active /> : pickError ? <Alert message={pickError} type="error" action={<Button onClick={() => pick(pickName)}>재시도</Button>} /> : candidates?.length ? <Space direction="vertical" style={{ width: '100%' }}>{candidates.map(c => <Button key={c.symbol} block onClick={() => { selectOrder({ instrumentType: 'STOCK', symbol: c.symbol, name: c.name }); setCandidates(null) }}>{c.name} · {money(turn?.stockPrices[c.symbol])} 게임머니</Button>)}</Space> : <Empty description="검색 결과가 없습니다. 거래 패널에서 직접 검색해주세요." />}</Modal>
  </div>
}
