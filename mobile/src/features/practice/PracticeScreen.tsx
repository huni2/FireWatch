import { AppSheetTextInput } from '@/components/AppSheet'
import tokens from '../../../../shared/design-tokens.json'
import { ChoiceTabs } from '@/components/ChoiceTabs'
import { ActionButton } from '@/components/ActionButton'
import { useTheme, type ThemeColors } from '@/lib/theme'
import { LoadingState } from '@/components/LoadingState'
// 주간 시장과 분야·기업 탐색, 주문·회고를 실제 자산과 구분해 안내한다.
import { useEffect, useRef, useState } from 'react'
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
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
import { canPublishGame } from '../../../../shared/game-ranking'
import { gamePeriod, gameNews } from '../../../../shared/game-week'
import type { RankingTab } from '../../../../shared/game-ranking'
import { PracticeMenu } from './PracticeMenu'
import { PracticeRules } from './PracticeRules'
import { shortSellingHelp } from '../../../../shared/game-rules'
import { PracticeOrderSheet } from './PracticeOrderSheet'
import { FirewatchIcon } from '../../components/FirewatchIcon'
import type { FirewatchIconName } from '../../../../shared/firewatch-icons'

const amount = (v: number | null | undefined) => v == null ? '평가 미확정' : v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
const assets = [['KOSPI', '코스피'], ['KOSDAQ', '코스닥'], ['SP500', 'S&P 500'], ['NASDAQ', '나스닥'], ['DOW', '다우'], ['GOLD', '금'], ['SILVER', '은'], ['USD', '달러'], ['STOCK', '개별 종목']]

export function PracticeScreen() {
  const { colors: c } = useTheme()
  const accent = c.accent, s = createStyles(c)

  const [workspaceView, setWorkspaceView] = useState<'market' | 'companies' | 'positions'>('market')
  const [turn, setTurn] = useState<PracticeTurn | null>(null)
  const gameAssets = assetsForGame(turn)
  const [companyQuery, setCompanyQuery] = useState(''), [companySector, setCompanySector] = useState(''), [companyPage, setCompanyPage] = useState(1)
  const [heldOnly, setHeldOnly] = useState(false), [newsExpanded, setNewsExpanded] = useState(false)
  const period = gamePeriod(turn)
  const heldSymbols = new Set(turn?.holdings.map(h => h.symbol))
  const filteredCompanies = filterGameAssets(gameAssets, companyQuery, companySector).filter(a => !heldOnly || heldSymbols.has(a.symbol))
  const relevantNews = gameNews(turn?.briefing.news ?? [], gameAssets, turn?.holdings ?? [], companySector, heldOnly)
  const displayedPage = Math.max(1, Math.min(companyPage, Math.ceil(filteredCompanies.length / 6)))
  const visibleCompanies = filteredCompanies.slice((displayedPage - 1) * 6, displayedPage * 6)
  const [rankingTab, setRankingTab] = useState<RankingTab>('board'), [rankingOpen, setRankingOpen] = useState(false)
  function showRanking(tab: RankingTab) { setRankingTab(tab); setRankingOpen(true) }
  const [replay, setReplay] = useState<PracticeReplayState | null>(null)
  const [lastReplay, setLastReplay] = useState<PracticeReplayState | null>(null)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState('1'), [symbol, setSymbol] = useState(''), [instrument, setInstrument] = useState('KOSPI')
  const [rulesOpen, setRulesOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [choosingAsset, setChoosingAsset] = useState(false)
  const [difficulty, setDifficulty] = useState('NORMAL'), [short, setShort] = useState(false), [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [serverPreview, setPreview] = useState<PracticePreview | null>(null), [previewError, setPreviewError] = useState<string | null>(null)
  const [remotePreviewLoading, setPreviewLoading] = useState(false), [revision, setRevision] = useState(0)
  const previewLoading = !turn?.simulation && remotePreviewLoading
  const [detail, setDetail] = useState<PracticeTarget | null>(null)
  const scrollRef = useRef<ScrollView | null>(null)
  const assetName = (type: string, symbol: string | null) => symbol ? gameAssets.find(a => a.symbol === symbol)?.name ?? symbol : assets.find(a => a[0] === type)?.[1] ?? type
  function selectOrder(target: PracticeTarget, action: 'BUY' | 'SELL' = 'BUY') {
    if (busy || turn?.status !== 'ACTIVE') return
    setInstrument(target.instrumentType); setSymbol(target.symbol ?? ''); setSide(action); setDetail(null)
    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) setQuantity('1')
    setChoosingAsset(false); setOrderOpen(true)
  }
  const operation = useRef(false), previewGeneration = useRef(0), requestId = useRef<string | null>(null)
  function resetOrder() {
    if (operation.current) return
    previewGeneration.current++; requestId.current = null
    setInstrument('STOCK'); setSymbol(''); setSide('BUY'); setQuantity('')
    setPreview(null); setPreviewError(null); setPreviewLoading(false)
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
    operation.current = true; setBusyAction(name); setBusy(true); setError(null)
    const replayBefore = name === 'next-turn' && turn?.simulation ? turn : null
    if (replayBefore && replayBefore.turnIndex < replayBefore.totalTurns - 2) setReplay({ before: replayBefore, after: null })
    if (name === 'start') { setWorkspaceView('market'); setReplay(null); setLastReplay(null) }
    const body = name === 'start' ? { difficulty, allowShortSelling: short } : name === 'trade' ? { instrumentType: instrument, symbol: ticker ?? undefined, action: side, quantity: qty, requestId: requestId.current ?? (requestId.current = Crypto.randomUUID()), expectedTurnIndex: turn?.turnIndex, expectedPrice: preview!.unitPrice } : name === 'next-turn' ? { expectedTurnIndex: turn?.turnIndex } : undefined
    try {
      const updated = await practice(name, body)
      if (updated.status === 'ENDED' && (name === 'end' || name === 'next-turn')) { setReplay(null); setRankingOpen(false); setCompletionOpen(true) }
      setOrderOpen(false)
      if (name !== 'trade') { setInstrument('STOCK'); setSymbol(''); setQuantity(''); setSide('BUY'); requestId.current = null }
      if (name === 'next-turn') { setWorkspaceView('market'); scrollRef.current?.scrollTo({ y: 0, animated: false }) }
      setTurn(updated); setPreview(null); setRevision(v => v + 1)
      if (replayBefore && updated.turnIndex > replayBefore.turnIndex) { const completed = { before: replayBefore, after: updated }; setLastReplay(completed); setReplay(current => current ? completed : null) }
      else if (replayBefore) setReplay(null)
    }
    catch (e) { setReplay(null); setError(e instanceof Error ? e.message : '요청 실패'); if (e instanceof ApiRequestError && e.status === 409) await reload() }
    finally { operation.current = false; setBusy(false); setBusyAction(null) }
  }
  function confirmTrade() {
    if (!matches || !preview?.allowed || busy) return
    requestId.current ??= Crypto.randomUUID()
    Alert.alert('거래 금액 확인', `${assetName(instrument, ticker)} · ${qty}개\n총 ${amount(preview.total)} 게임머니\n거래 후 현금 ${amount(preview.cashAfter)}`, [{ text: '돌아가기', style: 'cancel' }, { text: '이 금액으로 체결', onPress: () => void action('trade') }])
  }
  function gameMenu(lobby = false) {
    return <PracticeMenu lobby={lobby} busy={busy} canPublish={canPublishGame(turn)} canReplay={!!lastReplay} canEnd={turn?.status === 'ACTIVE'}
      onRules={() => setRulesOpen(true)} onRanking={() => showRanking('board')} onPublish={() => showRanking('publish')}
      onReplay={() => { if (lastReplay) setReplay(lastReplay) }} onEnd={() => Alert.alert('게임을 종료할까요?', '현재 기록은 남겨둘게요. 중간에 마무리한 게임은 순위에 등록할 수 없어요.', [{ text: '계속 플레이', style: 'cancel' }, { text: '게임 종료', style: 'destructive', onPress: () => void action('end') }])} />
  }
  const currentTrades = turn?.transactions.filter(trade => trade.turnIndex === turn.turnIndex).length ?? 0
  if (loading) return <LoadingState message="가상 시장을 준비하고 있어요" />
  return <View style={s.screen}>
    {turn && <View style={s.sessionHeader}>
      <View style={s.split}><Text style={s.eyebrow}>가상 투자 · {turn.status === 'ACTIVE' ? '진행 중' : '마무리'}</Text><Text style={s.muted}>{turn.turnIndex + 1} / {turn.totalTurns}{period}</Text></View>
      <View style={s.progressTrack} accessibilityLabel={`${turn.totalTurns}${period} 중 ${turn.turnIndex + 1}${period} 진행`}><View style={[s.progressFill, { width: `${Math.min(100, (turn.turnIndex + 1) / turn.totalTurns * 100)}%` }]} /></View>
      <View style={s.split}><View style={{ gap: 2 }}><Text style={s.muted}>총자산 · 게임머니</Text><Text style={s.amount}>{turn.portfolioValue == null ? '평가 미확정' : `${Math.round(turn.portfolioValue).toLocaleString('ko-KR')}원`}</Text></View><View style={{ alignItems: 'flex-end', gap: 3 }}><Text style={[s.orange, { fontWeight: '700', fontSize: 18 }, (turn.returnPercent ?? 0) < 0 && { color: c.negative }]}>{turn.returnPercent == null ? '미확정' : `${turn.returnPercent >= 0 ? '+' : ''}${turn.returnPercent.toFixed(2)}%`}</Text><Text style={s.muted}>현금 {Math.round(turn.cash).toLocaleString('ko-KR')}원</Text></View></View>
      {turn.portfolioValue == null && <Text style={s.warning}>가격이 없어 평가를 기다리고 있어요. 보유 수량과 현금은 그대로예요.</Text>}
    </View>}
    {turn?.status === 'ACTIVE' && <View style={{ paddingHorizontal: tokens.spacing.screen, paddingVertical: 8 }}><ChoiceTabs tone="game" label="게임 작업" value={workspaceView} options={[{ value: 'market', label: `이번 ${period} 소식` }, { value: 'companies', label: '기업·주문' }, { value: 'positions', label: '내 자산' }]} onChange={value => { setWorkspaceView(value); scrollRef.current?.scrollTo({ y: 0, animated: false }) }} /></View>}
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={s.content}>
    {rankingOpen && <PracticeRankings turn={turn} initialTab={rankingTab} close={() => setRankingOpen(false)} />}
    {completionOpen && turn?.status === 'ENDED' && <PracticeCompletion turn={turn} close={() => setCompletionOpen(false)} publish={() => { setCompletionOpen(false); showRanking('publish') }} />}
    <PracticeRules open={rulesOpen} close={() => setRulesOpen(false)} />
    <PracticeReplay value={replay} close={() => setReplay(null)} />
    {error && <View style={s.panel}><Text style={s.warning}>{error}</Text>{<GameButton label={'현재 상태 확인'} onPress={ () => void reload()} disabled={busy} />}</View>}
    {!loading && !turn && <View style={s.lobby}>
      <View style={s.heroHeading}><View style={{ flex: 1, gap: 12 }}><Text style={s.eyebrow}>돈 걱정 없이, 투자 연습</Text><Text style={s.title}>{'내 선택은\n어떤 결과가 될까?'}</Text></View><Image source={require('../../../../shared/assets/firewatch-scout.png')} accessibilityLabel="FireWatch 불꽃 정찰대" style={{ width: 90, height: 112 }} resizeMode="contain" /></View>
      <Text style={s.muted}>{'분야별 소식을 읽고 기업을 골라보세요.\n24주의 변화를 보며 내 선택을 돌아봐요.'}</Text>
      <View style={s.startBalance}><Text style={s.muted}>시작 게임머니</Text><Text style={s.amount}>{difficulty === 'EASY' ? '2,000만' : difficulty === 'HARD' ? '500만' : '1,000만'}</Text><Text style={s.muted}>실제 자산과 연결되지 않아요 · 공매도 {short ? '허용' : '사용 안 함'}</Text></View>
      {gameMenu(true)}<Text style={s.muted}>뉴스·가격·픽은 모두 가상이에요.</Text>
      <View style={s.options}><Text style={s.heading}>연습 난이도</Text><View style={s.row}>{[['EASY','여유롭게\n2,000만'],['NORMAL','균형 있게\n1,000만'],['HARD','신중하게\n500만']].map(([key,label]) => <Pressable accessibilityRole="button" accessibilityState={{ selected: difficulty === key }} disabled={busy} key={key} onPress={() => setDifficulty(key)} style={[s.chip, { flex: 1, alignItems: 'center' }, difficulty === key && s.selected]}><Text style={[s.text, { fontSize: 13, textAlign: 'center' }]}>{label}</Text>{difficulty === key && <FirewatchIcon name="selected" size={18} />}</Pressable>)}</View><View style={s.split}><View style={s.iconRow}><Text style={s.text}>공매도 허용</Text><Pressable accessibilityRole="button" accessibilityLabel="공매도 설명" onPress={() => Alert.alert('공매도란?', shortSellingHelp)} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: c.muted, borderWidth: 1, borderColor: c.border, width: 22, height: 22, borderRadius: 11, textAlign: 'center' }}>?</Text></Pressable></View><Switch accessibilityLabel="공매도 허용" disabled={busy} value={short} onValueChange={setShort} trackColor={{ false: c.border, true: accent }} /></View></View>
    </View>}
    {turn && !turn.simulation && <View style={s.panel}><Text style={s.muted}>기존 기록을 보관하고 완전 가상 게임을 시작하세요.</Text><GameButton label="완전 가상 게임 시작" onPress={() => void action('start')} disabled={busy} /></View>}
    {turn && <>
      <View style={{ gap: 8 }}><View style={s.split}>{workspaceView === 'market' && <Text style={s.heading}>이번 {period}의 투자 노트</Text>}<Text style={s.muted}>{turn.turnDate}</Text></View>{gameMenu()}{turn.turnIndex > 0 && <Text style={s.muted}>직전 {period} 대비 {turn.turnChange == null ? '변화액 미확정' : `${turn.turnChange >= 0 ? '+' : ''}${amount(turn.turnChange)}`} 게임머니</Text>}</View>
      {(turn.marketEvents ?? []).map(e => <View key={e.code} style={[s.panel, { borderColor: accent }]}><View style={s.iconRow}><FirewatchIcon name="warning" /><Text style={[s.heading, { flex: 1 }]}>{e.title}</Text></View><Text style={s.text}>{e.description}</Text></View>)}
      {(workspaceView === 'positions' || turn.status === 'ENDED') && turn.turnIndex > 0 && <View style={s.panel}><Text style={s.eyebrow}>지난 선택의 결과</Text><View style={s.iconRow}><FirewatchIcon name="turn-result" /><Text style={s.heading}>자산별 손익 기여</Text></View><Text style={s.muted}>직전 턴 보유 수량 × 가격 변화. 이번 턴 매도 자산과 공매도도 포함합니다.</Text>{(turn.turnContributions ?? []).length ? turn.turnContributions.map(item => <View key={item.symbol ?? item.instrumentType} style={s.receipt}><View style={s.split}><Text style={s.text}>{item.symbol ? item.name : assets.find(a => a[0] === item.instrumentType)?.[1]}</Text><Text style={[s.orange, item.profit != null && item.profit < 0 && { color: c.negative }]}>{item.profit == null ? '미확정' : (item.profit >= 0 ? '+' : '') + amount(item.profit)}</Text></View><Text style={s.muted}>{item.carriedQuantity}개 × ({amount(item.currentPrice)} − {amount(item.previousPrice)})</Text><Text style={s.muted}>{item.reason}</Text></View>) : <Text style={s.muted}>직전 턴 보유 자산이 없어 가격 변화에 따른 손익은 0입니다.</Text>}</View>}
      {workspaceView === 'market' && <>
      <View style={s.panel}><Text style={s.eyebrow}>시장 흐름</Text><Text style={s.heading}>이번 {period}의 시장</Text><Text style={s.text}>{turn.briefing.marketSummary || '시장 요약이 없습니다.'}</Text><Text style={s.muted}>코스피 {amount(turn.briefing.kospi)}</Text></View>
      <View style={s.panel}><Text style={s.heading}>이번 {period}의 가상 소식</Text><Text style={s.muted}>{companySector || '모든 분야'} · {heldOnly ? '보유 기업 관련' : '보유 분야 소식부터 보여드려요'}. 기업 목록의 분야를 선택해 관련 소식을 모아보세요.</Text>{relevantNews.length ? relevantNews.slice(0, newsExpanded ? relevantNews.length : 4).map(n => <View key={n.title} style={s.receipt}><Text style={s.text}>{n.title}</Text><Text style={s.muted}>{n.description}</Text></View>) : <Text style={s.muted}>살펴볼 소식이 아직 없어요.</Text>}{relevantNews.length > 4 && <GameButton disabled={busy} label={newsExpanded ? '소식 접기' : `소식 ${relevantNews.length}개 모두 보기`} onPress={() => setNewsExpanded(v => !v)} />}</View>
      <View style={s.panel}><Text style={s.eyebrow}>정찰대의 관찰 노트</Text><View style={s.row}><Image source={require('../../../../shared/assets/firewatch-scout.png')} accessibilityLabel="FireWatch 불꽃 정찰대" style={{ width: 80, height: 95 }} resizeMode="contain" /><View style={{ flex: 1 }}><Text style={s.heading}>이번 {period} 살펴볼 기업</Text><Text style={s.muted}>불꽃 정찰대의 관찰 노트</Text></View></View>{turn.briefing.recommendedStocks.length ? turn.briefing.recommendedStocks.map(name => <View key={name} style={s.receipt}><GameButton icon="buy" label={`${name} · ${amount(turn.stockPrices[gameAssets.find(a => a.name === name || a.symbol === name)?.symbol ?? ''])} 게임머니 · 매수 주문`} onPress={ () => { const asset = gameAssets.find(a => a.name === name || a.symbol === name); if (asset) selectOrder({ instrumentType: 'STOCK', symbol: asset.symbol, name: asset.name }); else setError('이 픽은 현재 가상 시장에서 거래할 수 없습니다.') }} disabled={busy} />{(() => { const note = turn.gamePicks?.find(p => p.name === name); return note ? <View style={{ gap: 8 }}><Text style={s.text}>왜 골랐나요?</Text><Text style={s.muted}>{note.reason}</Text><Text style={s.muted}>{note.newsTitle}</Text><Text style={s.text}>확인할 위험</Text><Text style={s.muted}>{note.risk}</Text></View> : <Text style={s.muted}>이 기록에는 선정 이유가 없습니다.</Text> })()}</View>) : <Text style={s.muted}>{turn.briefing.dataSourceStatus === 'FALLBACK' ? '대체 브리핑으로 저장되어 AI 후보가 없습니다.' : '이 날짜에 저장된 AI 후보가 없습니다. 직접 검색할 수 있습니다.'}</Text>}</View>
      <ActionButton fullWidth label="기업을 골라볼게요" onPress={() => { setWorkspaceView('companies'); scrollRef.current?.scrollTo({ y: 0, animated: false }) }} />
      </>}
      {workspaceView === 'companies' && <>
      <View style={s.panel}><Text style={s.heading}>거래할 기업 찾기</Text><ChoiceTabs label="게임 기업 범위" value={heldOnly ? 'held' : 'all'} options={[{ value: 'all', label: '전체 기업' }, { value: 'held', label: '보유 기업' }]} onChange={value => { setHeldOnly(value === 'held'); setCompanyPage(1) }} disabled={busy} /><TextInput accessibilityLabel="게임 기업 검색" placeholder="회사 이름으로 찾기" value={companyQuery} onChangeText={v => { setCompanyQuery(v); setCompanyPage(1) }} style={s.input} /><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={s.row}>{['', ...new Set(gameAssets.map(a => a.sector).filter(Boolean))].map(sector => <Pressable key={sector ?? ''} accessibilityRole="button" accessibilityState={{ selected: companySector === sector }} onPress={() => { setCompanySector(sector ?? ''); setCompanyPage(1) }} style={[s.chip, companySector === sector && s.selected]}><Text style={s.text}>{sector || '모든 분야'}</Text></Pressable>)}</View></ScrollView><Text style={s.muted}>검색 결과 {filteredCompanies.length}개 · {displayedPage}페이지</Text>{visibleCompanies.map(a => { const change = historyChange(turn.assetHistories?.find(h => h.symbol === a.symbol)); return <View key={a.symbol} style={s.receipt}><Text style={s.text}>{a.name}</Text>{a.sector && <Text style={s.muted}>{a.sector}</Text>}<Text style={s.orange}>{amount(turn.stockPrices[a.symbol])} 게임머니</Text><Text style={s.muted}>{change ? `직전 ${period} ${change.percent >= 0 ? '+' : ''}${change.percent.toFixed(2)}%` : '첫 턴 또는 이전 기록 없음'}</Text><View style={s.row}><GameButton label="가격·흐름 보기" disabled={busy} onPress={() => setDetail({ instrumentType: 'STOCK', symbol: a.symbol, name: a.name })} />{turn.status === 'ACTIVE' && <GameButton icon="buy" label="매수 주문" disabled={busy || turn.stockPrices[a.symbol] == null} onPress={() => selectOrder({ instrumentType: 'STOCK', symbol: a.symbol, name: a.name })} />}</View></View> })}{!filteredCompanies.length && <Text style={s.muted}>찾는 기업이 없어요. 이름이나 분야를 바꿔보세요.</Text>}<View style={s.row}><GameButton label="이전 기업" disabled={displayedPage === 1} onPress={() => setCompanyPage(displayedPage - 1)} /><GameButton label="다음 기업" disabled={displayedPage * 6 >= filteredCompanies.length} onPress={() => setCompanyPage(displayedPage + 1)} /></View></View>
      {turn.status === 'ACTIVE' && <GameButton icon="buy" label="주문 입력 열기" disabled={busy} onPress={() => setOrderOpen(true)} />}
      </>}
      {(workspaceView === 'positions' || turn.status === 'ENDED') && <>
      <View style={s.panel}><Text style={s.eyebrow}>내가 고른 자산</Text><Text style={s.heading}>보유 자산</Text>{turn.holdings.length ? turn.holdings.map(h => { const stats = positionStats(turn.transactions, h.instrumentType, h.symbol, h.currentPrice); const change = historyChange(turn.assetHistories?.find(a => a.instrumentType === h.instrumentType && a.symbol === h.symbol)); return <View style={s.receipt} key={`${h.instrumentType}:${h.symbol}`}><Text style={s.text}>{assetName(h.instrumentType, h.symbol)} · {h.quantity}개</Text><Text style={s.muted}>단가 {amount(h.currentPrice)} · 평가액 {amount(h.value)}</Text><Text style={s.muted}>직전 {period} 가격 {change ? `${change.percent >= 0 ? '+' : ''}${change.percent.toFixed(2)}%` : '이전 기록 없음'}</Text><Text style={[s.orange, (stats.profit ?? 0) < 0 && { color: c.negative }]}>평가손익 {stats.profit == null ? '미확정' : `${stats.profit >= 0 ? '+' : ''}${amount(stats.profit)}`} 게임머니{stats.returnPercent != null ? ` (${stats.returnPercent.toFixed(2)}%)` : ''}</Text><GameButton label="상세보기 · 턴별 그래프" disabled={busy} onPress={() => setDetail({ instrumentType: h.instrumentType, symbol: h.symbol, name: assetName(h.instrumentType, h.symbol) })} /></View> }) : <Text style={s.muted}>첫 거래를 하면 보유 자산이 표시됩니다.</Text>}</View>
      <View style={s.panel}><Text style={s.eyebrow}>거래 기록</Text><Text style={s.heading}>체결 내역</Text>{turn.transactions.length ? [...turn.transactions].reverse().map(t => <View key={t.id} style={s.receipt}><Text style={s.text}>{period} {t.turnIndex + 1} · {assetName(t.instrumentType, t.symbol)} · {t.action === 'BUY' ? '매수' : '매도'} {t.quantity}개</Text><Text style={s.orange}>총 {amount(t.total)} · 단가 {amount(t.price)}</Text></View>) : <Text style={s.muted}>아직 체결된 거래가 없습니다.</Text>}</View>
      </>}
      {turn.status !== 'ACTIVE' && <View style={s.panel}><Text style={s.heading}>이번 게임 돌아보기</Text><Text style={s.muted}>첫 턴 대비 코스피 {turn.benchmarkReturnPercent ?? '미확정'} · 실제 기간 벤치마크와 다릅니다.</Text>{turn.review.map(x => <Text key={x} style={s.text}>• {x}</Text>)}<GameButton label={'결과 다시 보기'} onPress={() => setCompletionOpen(true)} disabled={busy} />{<GameButton label={'새 게임 설정'} onPress={ () => setTurn(null)} disabled={busy} />}</View>}
    </>}
    {turn && <PracticeAssetDetail target={detail} turn={turn} close={() => setDetail(null)} order={selectOrder} />}
    </ScrollView>
    {!turn && <View style={s.startDock}><Text style={s.muted}>24주 연습 · 실제 돈은 쓰지 않아요</Text><GameButton fullWidth busy={busyAction === 'start'} tone="primary" icon="start" label={busyAction === 'start' ? '가상 시장을 준비하고 있어요' : '투자 연습 시작'} onPress={() => void action('start')} disabled={busy} /></View>}
    <PracticeOrderSheet open={orderOpen && turn?.status === 'ACTIVE'} busy={busy} error={error} close={() => setOrderOpen(false)} footer={<View style={{ gap: 8 }}><Text accessibilityLiveRegion="polite" style={[s.text, { fontWeight: '700', fontSize: 18 }]}>{previewLoading ? '거래 금액 확인 중' : matches ? `총 거래 금액 ${amount(preview?.total)} 게임머니` : '자산과 수량을 선택해주세요'}</Text><GameButton busy={busyAction === 'trade'} tone="primary" icon={side === 'BUY' ? 'buy' : 'sell'} label={busyAction === 'trade' ? '주문을 반영하는 중' : '거래 금액 확인'} onPress={ confirmTrade} disabled={busy || ( previewLoading || !matches || !preview?.allowed)} /></View>}>{turn?.status === 'ACTIVE' && <View style={s.panel}><View style={s.split}><Text style={s.muted}>실제 주문이 아니에요</Text><Pressable accessibilityRole="button" disabled={busy} onPress={resetOrder} style={[s.chip, s.iconRow, busy && s.disabled]}><FirewatchIcon name="reset" size={18} /><Text style={s.orange}>주문 초기화</Text></Pressable></View><View style={s.split}><View style={{ flex: 1, gap: 4 }}><Text style={s.heading}>{assetName(instrument, ticker)}</Text><Text style={s.muted}>가상 가격 · 게임머니</Text></View><GameButton label="다른 자산 선택" disabled={busy} onPress={() => setChoosingAsset(true)} /></View>{(choosingAsset || (instrument === 'STOCK' && !ticker)) && <><View style={s.row}>{assets.map(([key,label]) => <Pressable accessibilityRole="button" disabled={busy} key={key} onPress={() => { setInstrument(key); if (key !== 'STOCK') setChoosingAsset(false) }} style={[s.chip, instrument === key && s.selected]}><Text style={s.text}>{label}</Text></Pressable>)}</View>{instrument === 'STOCK' && <><Text style={s.muted}>기업 목록에서 고르거나, 시트를 닫고 이름·분야로 찾아보세요.</Text><View style={s.row}>{visibleCompanies.map(a => <Pressable accessibilityRole="button" accessibilityState={{ selected: symbol === a.symbol }} disabled={busy} key={a.symbol} onPress={() => { setSymbol(a.symbol); setChoosingAsset(false) }} style={[s.chip, symbol === a.symbol && s.selected]}><Text style={s.text}>{a.name} · {amount(turn.stockPrices[a.symbol])}</Text></Pressable>)}</View></>}</>}<View style={s.row}>{(['BUY','SELL'] as const).map(v => <Pressable accessibilityRole="button" disabled={busy} key={v} onPress={() => setSide(v)} style={[s.chip,side === v && s.selected]}><Text style={s.text}>{v === 'BUY' ? '매수' : '매도'}</Text></Pressable>)}</View><Text style={s.muted}>거래 수량</Text><AppSheetTextInput accessibilityLabel="거래 수량" editable={!busy} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" style={s.input} /><View style={s.preview}>{previewLoading ? <LoadingState inline compact message="거래 금액을 확인하고 있어요" /> : matches ? <><Text style={s.muted}>적용 단가 {amount(preview.unitPrice)}</Text><Text style={s.heading}>총 거래 금액 {amount(preview.total)}</Text><Text style={s.text}>거래 후 현금 {amount(preview.cashAfter)}</Text><Text style={s.text}>거래 후 보유량 {preview.quantityAfter}개</Text>{!preview.allowed && <Text style={s.warning}>{preview.reason}</Text>}</> : <Text style={s.muted}>{previewError ?? '자산과 수량을 선택하면 총액을 확인할 수 있습니다.'}</Text>}</View></View>}</PracticeOrderSheet>
    {turn?.status === 'ACTIVE' && <View style={s.turnDock}><View style={{ flex: 1 }}><Text style={s.text}>{turn.turnIndex + 1}{period}째</Text><Text style={s.muted}>{currentTrades ? `이번 ${period} 거래 ${currentTrades}건` : '이번에는 지켜봐도 괜찮아요'}</Text></View><GameButton busy={busyAction === 'next-turn'} tone="next" icon="next-turn" label={period === '주' ? '다음 주로' : '다음 턴으로'} onPress={() => void action('next-turn')} disabled={busy} /></View>}
    {busy && !replay && <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 10 }}><LoadingState message={turn ? '선택한 내용을 반영하고 있어요' : '가상 시장을 준비하고 있어요'} /></View>}
  </View>
}
function GameButton({ label, onPress, disabled, busy, tone, icon, fullWidth = false }: { label: string; onPress: () => void; disabled: boolean; busy?: boolean; tone?: 'primary' | 'next'; icon?: FirewatchIconName; fullWidth?: boolean }) {
  const { colors: c } = useTheme()
  return <ActionButton fullWidth={fullWidth} label={label} onPress={onPress} disabled={disabled} busy={busy} tone={tone} icon={icon && <FirewatchIcon name={icon} size={20} color={disabled && !busy ? c.muted : tone ? c.actionText : c.text} monochrome={!!tone} />} />
}
const createStyles = (c: ThemeColors) => { const accent = c.accent; return StyleSheet.create({
  startDock: { paddingHorizontal: 20, paddingVertical: 12, gap: 8, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }, lobby: { gap: 16 }, heroHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 }, startBalance: { gap: 2 }, steps: { flexDirection: 'row', paddingVertical: 16, gap: 8 }, stepLabel: { color: c.text, fontSize: 12, fontWeight: '600' }, sessionHeader: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, gap: 9, backgroundColor: c.surface }, progressTrack: { height: 4, borderRadius: 2, backgroundColor: c.border, overflow: 'hidden' }, progressFill: { height: 4, backgroundColor: accent }, turnDock: { paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface }, optionsToggle: { minHeight: 48, width: '100%', alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: c.border, marginTop: 4 }, options: { width: '100%', gap: 14 },
  screen: { flex: 1, backgroundColor: c.canvas }, content: { padding: tokens.spacing.screen, gap: tokens.spacing.stack, paddingBottom: 40 }, panel: { padding: tokens.spacing.card, gap: tokens.spacing.stack, borderRadius: tokens.radius, backgroundColor: c.surface },
  eyebrow: { color: accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.4 }, title: { color: c.text, fontSize: 27, lineHeight: 35, fontWeight: '700' }, heading: { color: c.text, fontSize: 20, fontWeight: '700' }, amount: { color: c.text, fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] }, text: { color: c.text, fontSize: tokens.typography.body, lineHeight: 23 }, muted: { color: c.muted, fontSize: 13, lineHeight: 22 }, orange: { color: accent }, warning: { color: accent, lineHeight: 22 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, split: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }, chip: { borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 12 }, selected: { borderColor: accent, backgroundColor: c.accentSoft }, iconRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, disabled: { opacity: .4 }, input: { borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 14, color: c.text, backgroundColor: c.canvas }, preview: { backgroundColor: c.canvas, borderRadius: 12, padding: 16, gap: 12, minHeight: 100 }, receipt: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border, gap: 8 },
})
}
