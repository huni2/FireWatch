import { ActionButton } from '@/components/ActionButton'
import { AppSheet, AppSheetScrollView, AppSheetTextInput } from '@/components/AppSheet'
import { LoadingState } from '@/components/LoadingState'
import { useEffect, useRef, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { useTheme } from '@/lib/theme'
import { Link } from 'expo-router'
import { request } from '@/lib/api'
import { getDeviceId } from '@/lib/deviceId'
import { sessionToken } from '@/lib/session'
import { PracticeRankingRules } from './PracticeRankingRules'
import { canPublishGame, rankingDifficulties, rankingGameBoard, rankingLeague, rankingQuery, rankingScore, rankingWeek, type RankingBoard, type RankingDifficulty, type RankingEntry, type RankingGame, type RankingMine, type RankingTab } from '../../../../shared/game-ranking'

async function rankingRequest<T>(path: string, init?: RequestInit) {
  return request<T>(`/api/game/rankings${path}`, { ...init, headers: { 'X-Device-Id': await getDeviceId(), ...init?.headers } })
}
export function PracticeRankings({ turn, initialTab, close }: { turn: RankingGame | null; initialTab: RankingTab; close: () => void }) {
  const [tab, setTab] = useState<RankingTab>(initialTab), [offset, setOffset] = useState(0), [page, setPage] = useState(0)
  const [difficulty, setDifficulty] = useState<RankingDifficulty>('NORMAL'), [shortSelling, setShort] = useState(false)
  const kind = 'FINISHED', selectedTurn = 23
  const [board, setBoard] = useState<RankingBoard | null>(null), [winners, setWinners] = useState<RankingEntry[]>([]), [mine, setMine] = useState<RankingMine | null>(null)
  const [nickname, setNickname] = useState(''), [consent, setConsent] = useState(false), [logged, setLogged] = useState(false)
  const [busy, setBusy] = useState(false), [loadedKey, setLoadedKey] = useState(''), [error, setError] = useState(''), [revision, setRevision] = useState(0), [receipt, setReceipt] = useState('')
  const mutationLock = useRef(false)
  const [busyEntry, setBusyEntry] = useState<string | null>(null)
  const week = rankingWeek(offset)
  const queryKey = `${tab}:${week}:${difficulty}:${shortSelling}:${kind}:${selectedTurn}:${page}:${revision}`
  const loading = loadedKey !== queryKey
  useEffect(() => {
    let active = true; const controller = new AbortController()
    async function load() {
      const token = await sessionToken(); if (active) setLogged(!!token)
      if (tab === 'board') { const data = await rankingRequest<RankingBoard>(`?${rankingQuery(week, difficulty, shortSelling, kind, selectedTurn, page)}`, { signal: controller.signal }); if (active) setBoard(data) }
      else if (tab === 'winners') { const data = await rankingRequest<RankingEntry[]>(`/winners?page=${page}`, { signal: controller.signal }); if (active) setWinners(data) }
      else if (token) { const data = await rankingRequest<RankingMine>(`/mine?page=${page}`, { signal: controller.signal }); if (active) { setMine(data); if (data.nickname) setNickname(data.nickname) } }
    }
    void load().then(() => { if (active) setError('') }).catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoadedKey(queryKey) })
    return () => { active = false; controller.abort() }
  }, [tab, week, difficulty, shortSelling, kind, selectedTurn, page, revision, queryKey])
  const filter = (change: () => void) => { change(); setPage(0) }
  async function publish() {
    if (!turn || !consent || mutationLock.current) return
    mutationLock.current = true
    setBusy(true); setError(''); setReceipt('')
    try {
      const row = await rankingRequest<RankingEntry>('', { method: 'POST', body: JSON.stringify({ sessionId: turn.sessionId, expectedTurnIndex: turn.turnIndex, nickname: nickname.trim() }) })
      if (!row.visible) { setError('철회한 기록은 다시 공개할 수 없습니다. 새 게임으로 참여해주세요.'); return }
      setReceipt('공개했습니다. 조건별 계정 최고 기록 하나만 순위에 표시됩니다.'); setPage(0); setTab('mine'); setRevision(v => v + 1)
    } catch (e) { setError((e as Error).message) } finally { mutationLock.current = false; setBusy(false) }
  }
  async function withdraw(id: string) {
    if (mutationLock.current) return
    mutationLock.current = true; setBusyEntry(id)
    setBusy(true); setError('')
    try { await rankingRequest(`/${id}`, { method: 'DELETE' }); setRevision(v => v + 1); setReceipt('순위와 우승자 목록에서 숨겼습니다.') }
    catch (e) { setError((e as Error).message) } finally { mutationLock.current = false; setBusy(false); setBusyEntry(null) }
  }
  const loadingView = <LoadingState inline message={tab === 'winners' ? '주간 우승자를 불러오고 있어요' : tab === 'mine' || tab === 'publish' ? '내 공개 기록을 확인하고 있어요' : '순위표를 불러오고 있어요'} />
  const eligible = canPublishGame(turn)
  const changeTab = (key: RankingTab) => { setTab(key); setPage(0); setReceipt('') }
  return <AppSheet open title={tab === 'publish' ? '기록 공개' : initialTab === 'publish' ? '내 공개 기록' : '주간 순위'} close={close} disabled={busy} height="90%">
      <AppSheetScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }}>
      {initialTab !== 'publish' && <><Text className="text-muted">게임마다 시장이 달라요. 같은 조건의 수익률을 비교해요.</Text>
      <View className="flex-row flex-wrap gap-2">{([['board', '주간 순위'], ['winners', '주간 우승자'], ['publish', '기록 등록'], ['mine', '내 기록']] as const).map(([key, label]) => <RankButton key={key} label={label} selected={tab === key} disabled={busy} onPress={() => changeTab(key)} />)}</View></>}
      {tab === 'publish' && <PracticeRankingRules />}
      {!!error && !loading && <View className="gap-2"><Text accessibilityRole="alert" className="text-danger">{error}</Text><RankButton label="다시 확인" onPress={() => setRevision(v => v + 1)} disabled={busy} /></View>}
      {!!receipt && <Text accessibilityRole="alert" className="text-ink">{receipt}</Text>}
      {tab === 'board' && <><View className="flex-row flex-wrap gap-2"><RankButton label="이전 주" disabled={offset <= -104} onPress={() => filter(() => setOffset(v => v - 1))} /><Text className="text-ink">{week} 시작 주</Text><RankButton label="다음 주" disabled={offset >= 0} onPress={() => filter(() => setOffset(v => v + 1))} /></View><View className="flex-row flex-wrap gap-2">{Object.entries(rankingDifficulties).map(([key, label]) => <RankButton key={key} label={label} selected={difficulty === key} onPress={() => filter(() => setDifficulty(key as RankingDifficulty))} />)}</View><View className="flex-row flex-wrap gap-2"><RankButton label="공매도 없음" selected={!shortSelling} onPress={() => filter(() => setShort(false))} /><RankButton label="공매도 허용" selected={shortSelling} onPress={() => filter(() => setShort(true))} /></View><Text className="text-muted">24주 완주 기록</Text><Text className="text-muted">{board?.closed ? '마감된 기록' : '한국 시간 월요일 00:00 마감'} · 동률은 먼저 등록한 순서 · 계정별 최고 기록 1개</Text>{loading && loadingView}{!loading && !error && (board?.entries.length ? board.entries.map(({ rank, entry }) => <View key={entry.id} className="flex-row items-center justify-between rounded-xl bg-surface p-4"><Text className="text-ink">{rank}위 · {entry.nickname}</Text><Text className={`font-bold ${entry.returnPercent < 0 ? 'text-negative' : 'text-game'}`}>{rankingScore(entry.returnPercent)}</Text></View>) : <Text className="text-muted">이 조건에 등록된 기록이 없습니다.</Text>)}<View className="flex-row gap-3"><RankButton label="이전 페이지" disabled={loading || page === 0} onPress={() => setPage(v => v - 1)} /><RankButton label="다음 페이지" disabled={loading || !board || (page + 1) * 20 >= board.total} onPress={() => setPage(v => v + 1)} /></View></>}
      {tab === 'winners' && <>{loading && loadingView}{!loading && !error && (winners.length ? winners.map(e => <View key={e.id} className="gap-2 rounded-2xl bg-surface p-4"><Text className="text-game">{e.weekStart} 시작 주 1위</Text><Text className="text-lg font-bold text-ink">{e.nickname} · {rankingScore(e.returnPercent)}</Text><Text className="text-muted">{rankingLeague(e)} · 24주 완주</Text></View>) : <Text className="text-muted">첫 주 마감 후 조건별 우승자가 모입니다.</Text>)}<View className="flex-row gap-3"><RankButton label="이전 페이지" disabled={loading || page === 0} onPress={() => setPage(v => v - 1)} /><RankButton label="다음 페이지" disabled={loading || winners.length < 30} onPress={() => setPage(v => v + 1)} /></View></>}
      {(tab === 'publish' || tab === 'mine') && !loading && !logged && <View className="gap-3"><Text className="text-ink">기록 등록·관리는 Google 로그인이 필요합니다.</Text><Link href="/settings" onPress={close} className="text-game">설정에서 로그인</Link></View>}
      {(tab === 'publish' || tab === 'mine') && loading && loadingView}
      {tab === 'publish' && logged && !loading && <View className="gap-4">{eligible && turn ? <><Text className="text-lg font-bold text-ink">{rankingGameBoard(turn)} · {rankingScore(turn.returnPercent!)}</Text><Text className="text-muted">이메일·보유·거래 상세는 공개하지 않습니다. 닉네임·수익률·게임 조건·등록 시각을 공개하며 내 기록에서 철회할 수 있습니다.</Text><AppSheetTextInput accessibilityLabel="게임 닉네임" value={nickname} onChangeText={setNickname} maxLength={16} editable={!busy && !loading && !mine?.nickname} placeholder="게임 닉네임 2~16자" className="rounded-xl bg-surface p-4 text-ink" /><RankButton label={`${consent ? '선택됨 · ' : ''}위 게임 기록 공개에 동의합니다`} selected={consent} disabled={busy} onPress={() => setConsent(v => !v)} /><RankButton busy={busy && busyEntry === null} label={busy ? '등록 중…' : '이 기록 공개하기'} disabled={busy || loading || !!error || !consent || nickname.trim().length < 2} onPress={() => void publish()} /></> : <Text className="text-muted">24주를 끝까지 진행하고 평가가 확인되면 등록할 수 있어요.</Text>}</View>}
      {tab === 'mine' && logged && !loading && (mine?.entries.length ? mine.entries.map(e => <View key={e.id} className="gap-3 rounded-2xl bg-surface p-4"><Text className="font-bold text-ink">{e.nickname} · {rankingScore(e.returnPercent)}</Text><Text className="text-muted">{e.weekStart} 시작 주 · {rankingLeague(e)} · {e.board === 'FINISHED' ? '완주 기록' : `${e.turnIndex + 1}턴 기록`}</Text>{e.visible ? <RankButton busy={busyEntry === e.id} label={busyEntry === e.id ? "철회 중" : "공개 철회"} disabled={busy} onPress={() => Alert.alert('순위에서 숨길까요?', '철회한 기록은 다시 공개할 수 없습니다.', [{ text: '취소', style: 'cancel' }, { text: '철회', onPress: () => void withdraw(e.id) }])} /> : <Text className="text-muted">공개 철회됨</Text>}</View>) : !error && <Text className="text-muted">공개한 기록이 없습니다.</Text>)}
      {tab === 'mine' && logged && <View className="flex-row gap-3"><RankButton label="이전 페이지" disabled={loading || page === 0} onPress={() => setPage(v => v - 1)} /><RankButton label="다음 페이지" disabled={loading || !mine || (page + 1) * 20 >= mine.total} onPress={() => setPage(v => v + 1)} /></View>}
      {tab !== 'publish' && <PracticeRankingRules />}
    </AppSheetScrollView>
  </AppSheet>
}
function RankButton({ label, selected, disabled, busy, onPress }: { label: string; selected?: boolean; disabled?: boolean; busy?: boolean; onPress: () => void }) {
  const { colors } = useTheme()
  return <View style={{ borderWidth: selected ? 2 : 0, borderRadius: 14, borderColor: colors.game }}><ActionButton selected={selected} label={label} disabled={disabled} busy={busy} onPress={onPress} /></View>
}
