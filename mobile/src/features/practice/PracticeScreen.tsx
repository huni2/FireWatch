import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { ApiRequestError } from '@/lib/api'
import { assetsForGame, filterGameAssets } from '../../../../shared/game-assets'
import { historyChange, positionStats } from '../../../../shared/game-turn'
import { PracticeAssetDetail, type PracticeTarget } from './PracticeAssetDetail'
import { PracticeReplay, type PracticeReplayState } from './PracticeReplay'
import { virtualOrderPreview } from '../../../../shared/game-preview'
import * as Crypto from 'expo-crypto'
import { practice, previewPractice, type PracticePreview, type PracticeTurn } from '@/lib/investingApi'
import { PracticeRankings } from './PracticeRankings'
import { PracticeCompletion } from './PracticeCompletion'
import type { RankingTab } from '../../../../shared/game-ranking'
import { PracticeMenu } from './PracticeMenu'
import tokens from '../../../../shared/design-tokens.json'
import { FirewatchIcon } from '../../components/FirewatchIcon'
import type { FirewatchIconName } from '../../../../shared/firewatch-icons'

const c = tokens.light, accent = tokens.light.accent
const amount = (v: number | null | undefined) => v == null ? '평가 미확정' : v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
const assets = [['KOSPI', '코스피'], ['KOSDAQ', '코스닥'], ['SP500', 'S&P 500'], ['NASDAQ', '나스닥'], ['DOW', '다우'], ['GOLD', '금'], ['SILVER', '은'], ['USD', '달러'], ['STOCK', '개별 종목']]

export function PracticeScreen() {
  const [turn, setTurn] = useState<PracticeTurn | null>(null)
  const gameAssets = assetsForGame(turn)
  const [companyQuery, setCompanyQuery] = useState(''), [companySector, setCompanySector] = useState(''), [companyPage, setCompanyPage] = useState(1)
  const filteredCompanies = filterGameAssets(gameAssets, companyQuery, companySector)
  const displayedPage = Math.max(1, Math.min(companyPage, Math.ceil(filteredCompanies.length / 6)))
  const visibleCompanies = filteredCompanies.slice((displayedPage - 1) * 6, displayedPage * 6)
  const [rankingTab, setRankingTab] = useState<RankingTab>('board'), [rankingOpen, setRankingOpen] = useState(false)
  function showRanking(tab: RankingTab) { setRankingTab(tab); setRankingOpen(true) }
  const [replay, setReplay] = useState<PracticeReplayState | null>(null)
  const [lastReplay, setLastReplay] = useState<PracticeReplayState | null>(null)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false)
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(busy || loading), busy || loading ? 3000 : 0)
    return () => clearTimeout(timer)
  }, [busy, loading])
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState('1'), [symbol, setSymbol] = useState(''), [instrument, setInstrument] = useState('KOSPI')
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [difficulty, setDifficulty] = useState('NORMAL'), [short, setShort] = useState(false), [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [serverPreview, setPreview] = useState<PracticePreview | null>(null), [previewError, setPreviewError] = useState<string | null>(null)
  const [remotePreviewLoading, setPreviewLoading] = useState(false), [revision, setRevision] = useState(0)
  const previewLoading = !turn?.simulation && remotePreviewLoading
  const [detail, setDetail] = useState<PracticeTarget | null>(null)
  const scrollRef = useRef<ScrollView | null>(null), orderY = useRef(0)
  const [selectionNotice, setSelectionNotice] = useState('')
  const assetName = (type: string, symbol: string | null) => symbol ? gameAssets.find(a => a.symbol === symbol)?.name ?? symbol : assets.find(a => a[0] === type)?.[1] ?? type
  function selectOrder(target: PracticeTarget, action: 'BUY' | 'SELL' = 'BUY') {
    if (busy || turn?.status !== 'ACTIVE') return
    setInstrument(target.instrumentType); setSymbol(target.symbol ?? ''); setSide(action); setDetail(null)
    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) setQuantity('1')
    setSelectionNotice(`${target.name}이 ${action === 'BUY' ? '매수' : '매도'} 주문에 선택됐습니다.`)
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: orderY.current, animated: true }))
  }
  const operation = useRef(false), previewGeneration = useRef(0), requestId = useRef<string | null>(null)
  function resetOrder() {
    if (operation.current) return
    previewGeneration.current++; requestId.current = null
    setInstrument('STOCK'); setSymbol(''); setSide('BUY'); setQuantity('')
    setPreview(null); setPreviewError(null); setPreviewLoading(false); setSelectionNotice('주문 입력을 초기화했습니다. 자산과 수량을 다시 선택하세요.')
    setRevision(value => value + 1)
  }
  const ticker = instrument === 'STOCK' ? symbol.trim().toUpperCase() : null, qty = Number(quantity)
  useEffect(() => {
    let active = true
    practice('current').then(t => { if (active) setTurn(t) }).catch(e => { if (active && !(e instanceof ApiRequestError && e.status === 404)) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    const pg = previewGeneration
    return () => { active = false; pg.current++ }
  }, [])
  const orderKey = `${turn?.sessionId}:${turn?.turnIndex}:${instrument}:${ticker}:${side}:${qty}:${revision}`
  const preview = turn?.simulation ? virtualOrderPreview(turn, instrument, ticker, side, qty) : serverPreview
  useEffect(() => {
    const generation = previewGeneration, id = ++generation.current
    requestId.current = null
    if (turn?.simulation) return
    const timer = setTimeout(() => {
      setPreview(null); setPreviewError(null)
      if (!turn || turn.status !== 'ACTIVE' || !Number.isFinite(qty) || qty <= 0 || (instrument === 'STOCK' && !ticker)) { setPreviewLoading(false); return }
      setPreviewLoading(true)
      previewPractice({ instrumentType: instrument, symbol: ticker ?? undefined, action: side, quantity: qty, expectedTurnIndex: turn.turnIndex })
        .then(p => { if (id === generation.current) setPreview(p) }).catch(e => { if (id === generation.current) setPreviewError(e.message) }).finally(() => { if (id === generation.current) setPreviewLoading(false) })
    }, 250)
    return () => { clearTimeout(timer); generation.current++ }
    // Every order input and post-mutation revision is included in orderKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey])
  const matches = preview != null && preview.turnIndex === turn?.turnIndex && preview.instrumentType === instrument && preview.symbol === ticker && preview.action === side && preview.quantity === qty
  async function reload() {
    try { setTurn(await practice('current')); setError(null) } catch (e) { setError(e instanceof Error ? e.message : '조회 실패') }
  }
  async function action(name: 'start' | 'trade' | 'next-turn' | 'end') {
    if (operation.current || (name === 'trade' && (!matches || !preview?.allowed))) return
    operation.current = true; setBusy(true); setError(null)
    const replayBefore = name === 'next-turn' && turn?.simulation ? turn : null
    if (replayBefore && replayBefore.turnIndex < replayBefore.totalTurns - 2) setReplay({ before: replayBefore, after: null })
    if (name === 'start') { setReplay(null); setLastReplay(null) }
    const body = name === 'start' ? { difficulty, allowShortSelling: short } : name === 'trade' ? { instrumentType: instrument, symbol: ticker ?? undefined, action: side, quantity: qty, requestId: requestId.current ?? (requestId.current = Crypto.randomUUID()), expectedTurnIndex: turn?.turnIndex, expectedPrice: preview!.unitPrice } : name === 'next-turn' ? { expectedTurnIndex: turn?.turnIndex } : undefined
    try {
      const updated = await practice(name, body)
      if (updated.status === 'ENDED' && (name === 'end' || name === 'next-turn')) { setReplay(null); setRankingOpen(false); setCompletionOpen(true) }
      setTurn(updated); setPreview(null); setRevision(v => v + 1)
      if (replayBefore && updated.turnIndex > replayBefore.turnIndex) { const completed = { before: replayBefore, after: updated }; setLastReplay(completed); setReplay(current => current ? completed : null) }
      else if (replayBefore) setReplay(null)
    }
    catch (e) { setReplay(null); setError(e instanceof Error ? e.message : '요청 실패'); if (e instanceof ApiRequestError && e.status === 409) await reload() }
    finally { operation.current = false; setBusy(false) }
  }
  function confirmTrade() {
    if (!matches || !preview?.allowed || busy) return
    requestId.current ??= Crypto.randomUUID()
    Alert.alert('거래 금액 확인', `${assetName(instrument, ticker)} · ${qty}개\n총 ${amount(preview.total)} 게임머니\n거래 후 현금 ${amount(preview.cashAfter)}`, [{ text: '돌아가기', style: 'cancel' }, { text: '이 금액으로 체결', onPress: () => void action('trade') }])
  }
  function gameMenu(lobby = false) {
    return <PracticeMenu lobby={lobby} busy={busy} canPublish={turn?.simulation && turn.turnIndex > 0} canReplay={!!lastReplay} canEnd={turn?.status === 'ACTIVE'}
      onRules={() => Alert.alert('게임 규칙', '뉴스·지표·가격·AI 픽은 가상입니다. 가격은 턴 순서와 시나리오를 따라 변화합니다. 단가 × 수량을 게임머니로 계산합니다. 가상 사이드카는 이번 턴 지수 주문만 막습니다. 가상 종목 거래정지는 직전 가격을 유지하고 매매만 막습니다. 다음 턴에 제한이 해제되며 새 사건이 다시 발생할 수 있습니다. 실제 거래소 제도와 다른 게임 규칙입니다. 실제 원화 환산·수수료·세금·기업행사는 반영하지 않습니다. 가격이 없으면 평가 미확정이며, 다음 턴의 보유 가격이 없으면 현재 턴을 유지합니다. 공매도 모드는 증거금·강제청산을 반영하지 않습니다.')} onRanking={() => showRanking('board')} onPublish={() => showRanking('publish')}
      onReplay={() => { if (lastReplay) setReplay(lastReplay) }} onEnd={() => Alert.alert('게임을 종료할까요?', '현재 기록은 보관됩니다. 순위 공개는 종료 후 선택합니다.', [{ text: '계속 플레이', style: 'cancel' }, { text: '게임 종료', style: 'destructive', onPress: () => void action('end') }])} />
  }
  return <ScrollView ref={scrollRef} style={s.screen} contentContainerStyle={s.content}>
    {rankingOpen && <PracticeRankings turn={turn} initialTab={rankingTab} close={() => setRankingOpen(false)} />}
    {completionOpen && turn?.status === 'ENDED' && <PracticeCompletion turn={turn} close={() => setCompletionOpen(false)} publish={() => { setCompletionOpen(false); showRanking('publish') }} />}
    <PracticeReplay value={replay} close={() => setReplay(null)} />
    {(busy || loading) && <ActivityIndicator color={accent} />}
    {slow && (busy || loading) && <Text style={s.muted}>서버 응답 대기 중입니다. 잠든 서버의 첫 요청은 시간이 걸릴 수 있습니다.</Text>}
    {error && <View style={s.panel}><Text style={s.warning}>{error}</Text>{<GameButton label={'현재 상태 확인'} onPress={ () => void reload()} disabled={busy} />}</View>}
    {!loading && !turn && <View style={s.lobby}>
      <Text style={s.eyebrow}>FIREWATCH / PRACTICE</Text><Text style={s.title}>가상투자 게임</Text>
      <Text style={s.muted}>시장을 읽고, 나만의 선택을 연습하세요.</Text>{gameMenu(true)}
      <Text style={[s.muted, { textAlign: 'center' }]}>24턴 · 게임머니 {difficulty === 'EASY' ? '2,000만' : difficulty === 'HARD' ? '500만' : '1,000만'} · 공매도 {short ? '허용' : '사용 안 함'}</Text>
      <View style={{ alignSelf: 'center' }}><GameButton tone="primary" icon="start" label="게임 시작" onPress={() => void action('start')} disabled={busy} /></View>
      <Text style={s.muted}>뉴스·가격·픽은 모두 가상입니다.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="시작 설정" accessibilityState={{ expanded: optionsOpen }} disabled={busy} onPress={() => setOptionsOpen(value => !value)} style={s.optionsToggle}><Text style={s.muted}>시작 설정 {optionsOpen ? '접기' : '보기'}</Text></Pressable>
      {optionsOpen && <View style={s.options}><View style={s.row}>{[['EASY','2,000만'],['NORMAL','1,000만'],['HARD','500만']].map(([key,label]) => <Pressable accessibilityRole="button" accessibilityState={{ selected: difficulty === key }} disabled={busy} key={key} onPress={() => setDifficulty(key)} style={[s.chip, s.iconRow, difficulty === key && s.selected]}><Text style={s.text}>{label}</Text>{difficulty === key && <FirewatchIcon name="selected" size={18} />}</Pressable>)}</View><View style={s.split}><Text style={s.text}>공매도 모드</Text><Switch accessibilityLabel="공매도 허용" disabled={busy} value={short} onValueChange={setShort} trackColor={{ false: c.border, true: accent }} /></View><Text style={s.muted}>공매도는 실제 증거금·강제청산을 반영하지 않습니다.</Text></View>}
    </View>}
    {turn && !turn.simulation && <View style={s.panel}><Text style={s.muted}>기존 기록을 보관하고 완전 가상 게임을 시작하세요.</Text><GameButton label="완전 가상 게임 시작" onPress={() => void action('start')} disabled={busy} /></View>}
    {turn && <>
      <View style={s.split}><View style={{ flex: 1 }}><Text style={s.heading}>가상투자 게임</Text><Text style={s.muted}>TURN {turn.turnIndex + 1} / {turn.totalTurns} · 가상 날짜 {turn.turnDate}</Text></View>{gameMenu()}</View>
      <View style={s.panel}><Text style={s.muted}>총자산 · 게임머니</Text><Text style={s.amount}>{amount(turn.portfolioValue)}</Text><View style={s.split}><Text style={s.text}>현금 {amount(turn.cash)}</Text><Text style={s.orange}>수익률 {turn.returnPercent == null ? '—' : `${turn.returnPercent.toFixed(2)}%`}</Text></View>{turn.portfolioValue == null && <Text style={s.warning}>가격 자료가 없어 평가 미확정입니다. 보유 수량과 현금은 유지됩니다.</Text>}{turn.turnIndex > 0 && <Text style={s.muted}>직전 턴 대비 {turn.turnChange == null ? '변화액 미확정' : `${turn.turnChange >= 0 ? '+' : ''}${amount(turn.turnChange)}`} · 가격 변화 기준</Text>}</View>
      {(turn.marketEvents ?? []).map(e => <View key={e.code} style={[s.panel, { borderColor: accent }]}><View style={s.iconRow}><FirewatchIcon name="warning" /><Text style={[s.heading, { flex: 1 }]}>{e.title}</Text></View><Text style={s.text}>{e.description}</Text></View>)}
      {turn.turnIndex > 0 && <View style={s.panel}><Text style={s.eyebrow}>TURN BREAKDOWN</Text><View style={s.iconRow}><FirewatchIcon name="turn-result" /><Text style={s.heading}>자산별 손익 기여</Text></View><Text style={s.muted}>직전 턴 보유 수량 × 가격 변화. 이번 턴 매도 자산과 공매도도 포함합니다.</Text>{(turn.turnContributions ?? []).length ? turn.turnContributions.map(item => <View key={item.symbol ?? item.instrumentType} style={s.receipt}><View style={s.split}><Text style={s.text}>{item.symbol ? item.name : assets.find(a => a[0] === item.instrumentType)?.[1]}</Text><Text style={[s.orange, item.profit != null && item.profit < 0 && { color: '#2563EB' }]}>{item.profit == null ? '미확정' : (item.profit >= 0 ? '+' : '') + amount(item.profit)}</Text></View><Text style={s.muted}>{item.carriedQuantity}개 × ({amount(item.currentPrice)} − {amount(item.previousPrice)})</Text><Text style={s.muted}>{item.reason}</Text></View>) : <Text style={s.muted}>직전 턴 보유 자산이 없어 가격 변화에 따른 손익은 0입니다.</Text>}</View>}
      <View style={s.panel}><Text style={s.eyebrow}>MARKET CONTEXT</Text><Text style={s.heading}>이번 턴의 시장</Text><Text style={s.text}>{turn.briefing.marketSummary || '시장 요약이 없습니다.'}</Text><Text style={s.muted}>코스피 {amount(turn.briefing.kospi)}</Text></View>
      <View style={s.panel}><Text style={s.eyebrow}>AI WATCHLIST</Text><View style={s.row}><Image source={require('../../../../shared/assets/firewatch-scout.png')} accessibilityLabel="FireWatch 불꽃 정찰대" style={{ width: 80, height: 95 }} resizeMode="contain" /><View style={{ flex: 1 }}><Text style={s.heading}>AI의 이번 턴 픽</Text><Text style={s.muted}>불꽃 정찰대의 관찰 노트</Text></View></View>{turn.briefing.recommendedStocks.length ? turn.briefing.recommendedStocks.map(name => <View key={name} style={s.receipt}><GameButton icon="buy" label={`${name} · ${amount(turn.stockPrices[gameAssets.find(a => a.name === name || a.symbol === name)?.symbol ?? ''])} 게임머니 · 매수 주문`} onPress={ () => { const asset = gameAssets.find(a => a.name === name || a.symbol === name); if (asset) selectOrder({ instrumentType: 'STOCK', symbol: asset.symbol, name: asset.name }); else setError('이 픽은 현재 가상 시장에서 거래할 수 없습니다.') }} disabled={busy} />{(() => { const note = turn.gamePicks?.find(p => p.name === name); return note ? <View style={{ gap: 8 }}><Text style={s.text}>왜 골랐나요?</Text><Text style={s.muted}>{note.reason}</Text><Text style={s.muted}>{note.newsTitle}</Text><Text style={s.text}>확인할 위험</Text><Text style={s.muted}>{note.risk}</Text></View> : <Text style={s.muted}>이 기록에는 선정 이유가 없습니다.</Text> })()}</View>) : <Text style={s.muted}>{turn.briefing.dataSourceStatus === 'FALLBACK' ? '대체 브리핑으로 저장되어 AI 후보가 없습니다.' : '이 날짜에 저장된 AI 후보가 없습니다. 직접 검색할 수 있습니다.'}</Text>}</View>
      <View style={s.panel}><Text style={s.heading}>거래할 기업 찾기</Text><Text style={s.muted}>{gameAssets.length}개 기업 · 실제 기업명, 가상 가격·뉴스·픽</Text><TextInput accessibilityLabel="게임 기업 검색" placeholder="회사 이름으로 찾기" value={companyQuery} onChangeText={v => { setCompanyQuery(v); setCompanyPage(1) }} style={s.input} /><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={s.row}>{['', ...new Set(gameAssets.map(a => a.sector).filter(Boolean))].map(sector => <Pressable key={sector ?? ''} accessibilityRole="button" accessibilityState={{ selected: companySector === sector }} onPress={() => { setCompanySector(sector ?? ''); setCompanyPage(1) }} style={[s.chip, companySector === sector && s.selected]}><Text style={s.text}>{sector || '모든 분야'}</Text></Pressable>)}</View></ScrollView><Text style={s.muted}>검색 결과 {filteredCompanies.length}개 · {displayedPage}페이지</Text>{visibleCompanies.map(a => { const change = historyChange(turn.assetHistories?.find(h => h.symbol === a.symbol)); return <View key={a.symbol} style={s.receipt}><Text style={s.text}>{a.name}</Text>{a.sector && <Text style={s.muted}>{a.sector}</Text>}<Text style={s.orange}>{amount(turn.stockPrices[a.symbol])} 게임머니</Text><Text style={s.muted}>{change ? `직전 턴 ${change.percent >= 0 ? '+' : ''}${change.percent.toFixed(2)}%` : '첫 턴 또는 이전 기록 없음'}</Text><GameButton label="상세보기 · 턴별 그래프" disabled={busy} onPress={() => setDetail({ instrumentType: 'STOCK', symbol: a.symbol, name: a.name })} />{turn.status === 'ACTIVE' && <GameButton icon="buy" label="매수 주문에 담기" disabled={busy || turn.stockPrices[a.symbol] == null} onPress={() => selectOrder({ instrumentType: 'STOCK', symbol: a.symbol, name: a.name })} />}</View> })}{!filteredCompanies.length && <Text style={s.muted}>찾는 기업이 없어요. 이름이나 분야를 바꿔보세요.</Text>}<View style={s.row}><GameButton label="이전 기업" disabled={displayedPage === 1} onPress={() => setCompanyPage(displayedPage - 1)} /><GameButton label="다음 기업" disabled={displayedPage * 6 >= filteredCompanies.length} onPress={() => setCompanyPage(displayedPage + 1)} /></View></View>
      {turn.status === 'ACTIVE' && <View onLayout={event => { orderY.current = event.nativeEvent.layout.y }} style={s.panel}><View style={s.split}><Text style={s.heading}>거래 주문</Text><Pressable accessibilityRole="button" disabled={busy} onPress={resetOrder} style={[s.chip, s.iconRow, busy && s.disabled]}><FirewatchIcon name="reset" size={18} /><Text style={s.orange}>주문 초기화</Text></Pressable></View>{selectionNotice && <Text accessibilityRole="alert" style={s.orange}>{selectionNotice}</Text>}<Text style={s.muted}>가상 단가 · 실제 상품 거래와 다릅니다.</Text><View style={s.row}>{assets.map(([key,label]) => <Pressable accessibilityRole="button" disabled={busy} key={key} onPress={() => setInstrument(key)} style={[s.chip, instrument === key && s.selected]}><Text style={s.text}>{label}</Text></Pressable>)}</View>{instrument === 'STOCK' && <><Text style={s.muted}>기업 선택 · 위에서 이름이나 분야로 찾을 수 있어요.</Text><View style={s.row}>{visibleCompanies.map(a => <Pressable accessibilityRole="button" accessibilityState={{ selected: symbol === a.symbol }} disabled={busy} key={a.symbol} onPress={() => setSymbol(a.symbol)} style={[s.chip, symbol === a.symbol && s.selected]}><Text style={s.text}>{a.name} · {amount(turn.stockPrices[a.symbol])}</Text></Pressable>)}</View></>}<View style={s.row}>{(['BUY','SELL'] as const).map(v => <Pressable accessibilityRole="button" disabled={busy} key={v} onPress={() => setSide(v)} style={[s.chip,side === v && s.selected]}><Text style={s.text}>{v === 'BUY' ? '매수' : '매도'}</Text></Pressable>)}</View><Text style={s.muted}>거래 수량</Text><TextInput accessibilityLabel="거래 수량" editable={!busy} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" style={s.input} /><View style={s.preview}>{previewLoading ? <ActivityIndicator color={accent} /> : matches ? <><Text style={s.muted}>적용 단가 {amount(preview.unitPrice)}</Text><Text style={s.heading}>총 거래 금액 {amount(preview.total)}</Text><Text style={s.text}>거래 후 현금 {amount(preview.cashAfter)}</Text><Text style={s.text}>거래 후 보유량 {preview.quantityAfter}개</Text>{!preview.allowed && <Text style={s.warning}>{preview.reason}</Text>}</> : <Text style={s.muted}>{previewError ?? '자산과 수량을 선택하면 총액을 확인할 수 있습니다.'}</Text>}</View>{<GameButton tone="primary" icon={side === 'BUY' ? 'buy' : 'sell'} label={'거래 금액 확인'} onPress={ confirmTrade} disabled={busy || ( previewLoading || !matches || !preview?.allowed)} />}</View>}
      <View style={s.panel}><Text style={s.eyebrow}>MY POSITIONS</Text><Text style={s.heading}>보유 자산</Text>{turn.holdings.length ? turn.holdings.map(h => { const stats = positionStats(turn.transactions, h.instrumentType, h.symbol, h.currentPrice); const change = historyChange(turn.assetHistories?.find(a => a.instrumentType === h.instrumentType && a.symbol === h.symbol)); return <View style={s.receipt} key={`${h.instrumentType}:${h.symbol}`}><Text style={s.text}>{assetName(h.instrumentType, h.symbol)} · {h.quantity}개</Text><Text style={s.muted}>단가 {amount(h.currentPrice)} · 평가액 {amount(h.value)}</Text><Text style={s.muted}>직전 턴 가격 {change ? `${change.percent >= 0 ? '+' : ''}${change.percent.toFixed(2)}%` : '이전 기록 없음'}</Text><Text style={[s.orange, (stats.profit ?? 0) < 0 && { color: '#2563eb' }]}>평가손익 {stats.profit == null ? '미확정' : `${stats.profit >= 0 ? '+' : ''}${amount(stats.profit)}`} 게임머니{stats.returnPercent != null ? ` (${stats.returnPercent.toFixed(2)}%)` : ''}</Text><GameButton label="상세보기 · 턴별 그래프" disabled={busy} onPress={() => setDetail({ instrumentType: h.instrumentType, symbol: h.symbol, name: assetName(h.instrumentType, h.symbol) })} /></View> }) : <Text style={s.muted}>첫 거래를 하면 보유 자산이 표시됩니다.</Text>}</View>
      <View style={s.panel}><Text style={s.eyebrow}>TRADE RECEIPTS</Text><Text style={s.heading}>체결 내역</Text>{turn.transactions.length ? [...turn.transactions].reverse().map(t => <View key={t.id} style={s.receipt}><Text style={s.text}>턴 {t.turnIndex + 1} · {assetName(t.instrumentType, t.symbol)} · {t.action === 'BUY' ? '매수' : '매도'} {t.quantity}개</Text><Text style={s.orange}>총 {amount(t.total)} · 단가 {amount(t.price)}</Text></View>) : <Text style={s.muted}>아직 체결된 거래가 없습니다.</Text>}</View>
      <View style={s.panel}><Text style={s.heading}>게임 속 가상 뉴스</Text>{turn.briefing.news.length ? turn.briefing.news.slice(0,5).map(n => <View key={n.title} style={s.receipt}><Text style={s.text}>{n.title}</Text><Text style={s.muted}>{n.description}</Text></View>) : <Text style={s.muted}>이 턴에는 뉴스가 없습니다.</Text>}</View>
      {turn.status === 'ACTIVE' ? <>{<GameButton tone="next" icon="next-turn" label={'다음 턴으로'} onPress={ () => void action('next-turn')} disabled={busy} />}</> : <View style={s.panel}><Text style={s.heading}>이번 게임 돌아보기</Text><Text style={s.muted}>첫 턴 대비 코스피 {turn.benchmarkReturnPercent ?? '미확정'} · 실제 기간 벤치마크와 다릅니다.</Text>{turn.review.map(x => <Text key={x} style={s.text}>• {x}</Text>)}<GameButton label={'결과 다시 보기'} onPress={() => setCompletionOpen(true)} disabled={busy} />{<GameButton label={'새 게임 설정'} onPress={ () => setTurn(null)} disabled={busy} />}</View>}
    </>}
    {turn && <PracticeAssetDetail target={detail} turn={turn} close={() => setDetail(null)} order={selectOrder} />}
  </ScrollView>
}
function GameButton({ label, onPress, disabled, tone, icon }: { label: string; onPress: () => void; disabled: boolean; tone?: 'primary' | 'next'; icon?: FirewatchIconName }) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[s.button, tone === 'primary' && s.primaryButton, tone === 'next' && s.nextButton, disabled && s.disabled]}>{icon && <FirewatchIcon name={icon} size={20} color={tone ? c.surface : c.text} monochrome={!!tone} />}<Text style={[s.buttonText, tone && { color: tone === 'primary' ? '#fff' : c.surface }]}>{label}</Text></Pressable> }
const s = StyleSheet.create({
  lobby: { padding: 24, gap: 14, alignItems: 'center', borderRadius: 24, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }, optionsToggle: { minHeight: 44, width: '100%', alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: c.border, marginTop: 4 }, options: { width: '100%', gap: 14 },
  screen: { flex: 1, backgroundColor: c.canvas }, content: { padding: 20, gap: 18, paddingBottom: 40 }, panel: { padding: 20, gap: 14, borderWidth: 1, borderColor: c.border, borderRadius: 18, backgroundColor: c.surface },
  eyebrow: { color: accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.4 }, title: { color: c.text, fontSize: 30, fontWeight: '800' }, heading: { color: c.text, fontSize: 20, fontWeight: '700' }, amount: { color: accent, fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'] }, text: { color: c.text, lineHeight: 23 }, muted: { color: c.muted, fontSize: 13, lineHeight: 22 }, orange: { color: accent }, warning: { color: accent, lineHeight: 22 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, split: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }, chip: { borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 12 }, selected: { borderColor: accent, backgroundColor: '#FFF0E6' }, iconRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, button: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', borderRadius: 13, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingVertical: 11, paddingHorizontal: 22 }, primaryButton: { backgroundColor: accent, borderColor: accent }, nextButton: { alignSelf: 'flex-end', backgroundColor: c.text, borderColor: c.text }, buttonText: { flexShrink: 1, color: c.text, textAlign: 'center', fontWeight: '700' }, disabled: { opacity: .4 }, input: { borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 14, color: c.text, backgroundColor: c.canvas }, preview: { backgroundColor: c.canvas, borderRadius: 12, padding: 16, gap: 12, minHeight: 100 }, receipt: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border, gap: 8 },
})
