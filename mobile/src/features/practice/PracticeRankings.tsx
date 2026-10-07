import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link } from 'expo-router'
import { request } from '@/lib/api'
import { getDeviceId } from '@/lib/deviceId'
import { sessionToken } from '@/lib/session'
import { rankingDifficulties, rankingGameBoard, rankingLeague, rankingQuery, rankingScore, rankingWeek, type RankingBoard, type RankingDifficulty, type RankingEntry, type RankingGame, type RankingMine, type RankingTab } from '../../../../shared/game-ranking'

async function rankingRequest<T>(path: string, init?: RequestInit) {
  return request<T>(`/api/game/rankings${path}`, { ...init, headers: { 'X-Device-Id': await getDeviceId(), ...init?.headers } })
}
export function PracticeRankings({ turn, initialTab, close }: { turn: RankingGame | null; initialTab: RankingTab; close: () => void }) {
  const [tab, setTab] = useState<RankingTab>(initialTab), [offset, setOffset] = useState(0), [page, setPage] = useState(0)
  const [difficulty, setDifficulty] = useState<RankingDifficulty>('NORMAL'), [shortSelling, setShort] = useState(false), [kind, setKind] = useState('FINISHED'), [selectedTurn, setTurn] = useState(23)
  const [board, setBoard] = useState<RankingBoard | null>(null), [winners, setWinners] = useState<RankingEntry[]>([]), [mine, setMine] = useState<RankingMine | null>(null)
  const [nickname, setNickname] = useState(''), [consent, setConsent] = useState(false), [logged, setLogged] = useState(false)
  const [busy, setBusy] = useState(false), [loadedKey, setLoadedKey] = useState(''), [error, setError] = useState(''), [revision, setRevision] = useState(0), [receipt, setReceipt] = useState('')
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
    if (!turn || !consent || busy) return
    setBusy(true); setError(''); setReceipt('')
    try {
      const row = await rankingRequest<RankingEntry>('', { method: 'POST', body: JSON.stringify({ sessionId: turn.sessionId, expectedTurnIndex: turn.turnIndex, nickname: nickname.trim() }) })
      if (!row.visible) { setError('철회한 기록은 다시 공개할 수 없습니다. 새 게임으로 참여해주세요.'); return }
      setReceipt('공개했습니다. 조건별 계정 최고 기록 하나만 순위에 표시됩니다.'); setPage(0); setTab('mine'); setRevision(v => v + 1)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function withdraw(id: string) {
    setBusy(true); setError('')
    try { await rankingRequest(`/${id}`, { method: 'DELETE' }); setRevision(v => v + 1); setReceipt('순위와 우승자 목록에서 숨겼습니다.') }
    catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const eligible = turn?.simulation && turn.turnIndex > 0 && turn.returnPercent != null
  const changeTab = (key: RankingTab) => { setTab(key); setPage(0); setReceipt('') }
  return <Modal visible animationType="slide" onRequestClose={() => { if (!busy) close() }}>
    <SafeAreaView className="flex-1 bg-canvas"><ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text className="text-2xl font-bold text-ink">{initialTab === 'publish' ? '게임 기록을 공개할까요?' : 'FireWatch 주간 순위'}</Text>
      <Text className="text-muted">자유 플레이 · 게임마다 시장이 달라요. 수익률을 난이도·공매도별로 비교하며 완주와 턴 기록은 구분합니다.</Text>
      <View className="flex-row flex-wrap gap-2">{([['board', '주간 순위'], ['winners', '주간 우승자'], ['publish', '기록 등록'], ['mine', '내 기록']] as const).map(([key, label]) => <RankButton key={key} label={label} selected={tab === key} disabled={busy} onPress={() => changeTab(key)} />)}</View>
      {!!error && !loading && <View className="gap-2"><Text accessibilityRole="alert" className="text-red-700">{error}</Text><RankButton label="다시 확인" onPress={() => setRevision(v => v + 1)} disabled={busy} /></View>}
      {!!receipt && <Text accessibilityRole="alert" className="text-ink">{receipt}</Text>}
      {tab === 'board' && <><View className="flex-row flex-wrap gap-2"><RankButton label="이전 주" disabled={offset <= -104} onPress={() => filter(() => setOffset(v => v - 1))} /><Text className="text-ink">{week} 시작 주</Text><RankButton label="다음 주" disabled={offset >= 0} onPress={() => filter(() => setOffset(v => v + 1))} /></View><View className="flex-row flex-wrap gap-2">{Object.entries(rankingDifficulties).map(([key, label]) => <RankButton key={key} label={label} selected={difficulty === key} onPress={() => filter(() => setDifficulty(key as RankingDifficulty))} />)}</View><View className="flex-row flex-wrap gap-2"><RankButton label="공매도 없음" selected={!shortSelling} onPress={() => filter(() => setShort(false))} /><RankButton label="공매도 허용" selected={shortSelling} onPress={() => filter(() => setShort(true))} /></View><View className="flex-row flex-wrap gap-2"><RankButton label="24턴 완주" selected={kind === 'FINISHED'} onPress={() => filter(() => setKind('FINISHED'))} /><RankButton label="턴 기록" selected={kind === 'PROGRESS'} onPress={() => filter(() => setKind('PROGRESS'))} /></View>{kind === 'PROGRESS' && <View className="flex-row gap-3"><RankButton label="이전 턴" disabled={selectedTurn <= 1} onPress={() => filter(() => setTurn(v => v - 1))} /><Text className="text-ink">{selectedTurn + 1}턴</Text><RankButton label="다음 턴" disabled={selectedTurn >= 23} onPress={() => filter(() => setTurn(v => v + 1))} /></View>}<Text className="text-muted">{board?.closed ? '마감된 기록' : '한국 시간 월요일 00:00 마감'} · 동률은 먼저 등록한 순서 · 계정별 최고 기록 1개</Text>{!loading && !error && (board?.entries.length ? board.entries.map(({ rank, entry }) => <View key={entry.id} className="flex-row items-center justify-between rounded-xl bg-surface p-4"><Text className="text-ink">{rank}위 · {entry.nickname}</Text><Text className={`font-bold ${entry.returnPercent < 0 ? 'text-blue-600' : 'text-brand'}`}>{rankingScore(entry.returnPercent)}</Text></View>) : <Text className="text-muted">이 조건에 등록된 기록이 없습니다.</Text>)}<View className="flex-row gap-3"><RankButton label="이전 페이지" disabled={loading || page === 0} onPress={() => setPage(v => v - 1)} /><RankButton label="다음 페이지" disabled={loading || !board || (page + 1) * 20 >= board.total} onPress={() => setPage(v => v + 1)} /></View></>}
      {tab === 'winners' && <>{!loading && !error && (winners.length ? winners.map(e => <View key={e.id} className="gap-2 rounded-2xl bg-surface p-4"><Text className="text-brand">{e.weekStart} 시작 주 1위</Text><Text className="text-lg font-bold text-ink">{e.nickname} · {rankingScore(e.returnPercent)}</Text><Text className="text-muted">{rankingLeague(e)} · 24턴 완주</Text></View>) : <Text className="text-muted">첫 주 마감 후 조건별 우승자가 모입니다.</Text>)}<View className="flex-row gap-3"><RankButton label="이전 페이지" disabled={loading || page === 0} onPress={() => setPage(v => v - 1)} /><RankButton label="다음 페이지" disabled={loading || winners.length < 30} onPress={() => setPage(v => v + 1)} /></View></>}
      {(tab === 'publish' || tab === 'mine') && !loading && !logged && <View className="gap-3"><Text className="text-ink">기록 등록·관리는 Google 로그인이 필요합니다.</Text><Link href="/settings" onPress={close} className="text-brand">설정에서 로그인</Link></View>}
      {tab === 'publish' && logged && <View className="gap-4">{eligible && turn ? <><Text className="text-lg font-bold text-ink">{rankingGameBoard(turn)} · {rankingScore(turn.returnPercent!)}</Text><Text className="text-muted">이메일·보유·거래 상세는 공개하지 않습니다. 닉네임·수익률·게임 조건·등록 시각을 공개하며 내 기록에서 철회할 수 있습니다.</Text><TextInput accessibilityLabel="게임 닉네임" value={nickname} onChangeText={setNickname} maxLength={16} editable={!busy && !loading && !mine?.nickname} placeholder="게임 닉네임 2~16자" className="rounded-xl bg-surface p-4 text-ink" /><RankButton label={`${consent ? '선택됨 · ' : ''}위 게임 기록 공개에 동의합니다`} selected={consent} disabled={busy} onPress={() => setConsent(v => !v)} /><RankButton label={busy ? '등록 중…' : '이 기록 공개하기'} disabled={busy || loading || !!error || !consent || nickname.trim().length < 2} onPress={() => void publish()} /></> : <Text className="text-muted">평가가 확정된 가상 게임의 2턴 이후부터 등록할 수 있습니다.</Text>}</View>}
      {tab === 'mine' && logged && !loading && (mine?.entries.length ? mine.entries.map(e => <View key={e.id} className="gap-3 rounded-2xl bg-surface p-4"><Text className="font-bold text-ink">{e.nickname} · {rankingScore(e.returnPercent)}</Text><Text className="text-muted">{e.weekStart} 시작 주 · {rankingLeague(e)} · {e.board === 'FINISHED' ? '24턴 완주' : `${e.turnIndex + 1}턴 기록`}</Text>{e.visible ? <RankButton label="공개 철회" disabled={busy} onPress={() => Alert.alert('순위에서 숨길까요?', '철회한 기록은 다시 공개할 수 없습니다.', [{ text: '취소', style: 'cancel' }, { text: '철회', onPress: () => void withdraw(e.id) }])} /> : <Text className="text-muted">공개 철회됨</Text>}</View>) : !error && <Text className="text-muted">공개한 기록이 없습니다.</Text>)}
      {tab === 'mine' && logged && <View className="flex-row gap-3"><RankButton label="이전 페이지" disabled={loading || page === 0} onPress={() => setPage(v => v - 1)} /><RankButton label="다음 페이지" disabled={loading || !mine || (page + 1) * 20 >= mine.total} onPress={() => setPage(v => v + 1)} /></View>}
      {loading && <ActivityIndicator accessibilityLabel="순위 조회 중" />}
      <RankButton label={tab === 'publish' ? '공개하지 않고 닫기' : '닫기'} onPress={close} disabled={busy} />
    </ScrollView></SafeAreaView>
  </Modal>
}
function RankButton({ label, selected, disabled, onPress }: { label: string; selected?: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} className={`rounded-xl border p-3 ${selected ? 'border-brand bg-surface' : 'border-transparent bg-surface'} ${disabled ? 'opacity-40' : ''}`} style={{ minHeight: 44 }}><Text className="text-ink">{label}</Text></Pressable>
}
