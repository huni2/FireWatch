import { FirewatchIcon } from '../../components/FirewatchIcon'
import { useEffect, useState } from 'react'
import { Alert, App, Button, Checkbox, Empty, Input, Modal, Popconfirm, Select, Space, Spin, Tabs, Tag } from 'antd'
import { Link } from 'react-router-dom'
import { request } from '../../lib/api'
import { useLoginSession } from '../../lib/loginSession'
import { GameRankingRules } from './GameRankingRules'
import { canPublishGame, rankingDifficulties, rankingGameBoard, rankingLeague, rankingQuery, rankingScore, rankingWeek, type RankingBoard, type RankingDifficulty, type RankingEntry, type RankingGame, type RankingMine, type RankingTab } from '../../../../shared/game-ranking'

export function GameRankings({ turn, initialTab, close }: { turn: RankingGame | null; initialTab: RankingTab; close: () => void }) {
  const { message } = App.useApp()
  const session = useLoginSession()
  const [tab, setTab] = useState<RankingTab>(initialTab)
  const [weekOffset, setWeekOffset] = useState(0), [page, setPage] = useState(0)
  const [difficulty, setDifficulty] = useState<RankingDifficulty>('NORMAL'), [shortSelling, setShort] = useState(false)
  const boardKind = 'FINISHED', selectedTurn = 23
  const [board, setBoard] = useState<RankingBoard | null>(null), [winners, setWinners] = useState<RankingEntry[]>([])
  const [mine, setMine] = useState<RankingMine | null>(null), [nickname, setNickname] = useState(''), [consent, setConsent] = useState(false)
  const [loadedKey, setLoadedKey] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [revision, setRevision] = useState(0)
  const week = rankingWeek(weekOffset)
  const sessionToken = session?.token
  const queryKey = `${tab}:${week}:${difficulty}:${shortSelling}:${boardKind}:${selectedTurn}:${page}:${sessionToken}:${revision}`
  const loading = loadedKey !== queryKey
  useEffect(() => {
    const controller = new AbortController(); let active = true
    async function load() {
      if (tab === 'board') { const data = await request<RankingBoard>(`/api/game/rankings?${rankingQuery(week, difficulty, shortSelling, boardKind, selectedTurn, page)}`, { signal: controller.signal }); if (active) setBoard(data) }
      else if (tab === 'winners') { const data = await request<RankingEntry[]>(`/api/game/rankings/winners?page=${page}`, { signal: controller.signal }); if (active) setWinners(data) }
      else if (sessionToken) { const data = await request<RankingMine>(`/api/game/rankings/mine?page=${page}`, { signal: controller.signal }); if (active) { setMine(data); if (data.nickname) setNickname(data.nickname) } }
    }
    void load().then(() => { if (active) setError('') }).catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoadedKey(queryKey) })
    return () => { active = false; controller.abort() }
  }, [tab, week, difficulty, shortSelling, boardKind, selectedTurn, page, sessionToken, revision, queryKey])
  async function publish() {
    if (!turn || !consent || busy) return
    setBusy(true); setError('')
    try {
      const row = await request<RankingEntry>('/api/game/rankings', { method: 'POST', body: JSON.stringify({ sessionId: turn.sessionId, expectedTurnIndex: turn.turnIndex, nickname: nickname.trim() }) })
      if (!row.visible) { setError('철회한 기록은 다시 공개할 수 없습니다. 새 게임 기록으로 참여해주세요.'); return }
      message.success({ content: '게임 기록을 공개했습니다. 이번 주 해당 조건의 최고 기록만 순위에 표시됩니다.', icon: <FirewatchIcon name="publish" size={20} /> }); setTab('mine'); setPage(0); setRevision(v => v + 1)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function withdraw(id: string) {
    setBusy(true); setError('')
    try { await request(`/api/game/rankings/${id}`, { method: 'DELETE' }); setRevision(v => v + 1); message.success({ content: '공개 순위와 우승자 목록에서 숨겼습니다.', icon: <FirewatchIcon name="selected" size={20} /> }) }
    catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const filter = (change: () => void) => { change(); setPage(0) }
  const isEligible = canPublishGame(turn)
  const loadingView = <div className="ranking-loading" role="status" aria-label="순위 조회 중"><Spin aria-hidden="true" /><span>{tab === 'winners' ? '주간 우승자를 불러오고 있어요.' : tab === 'mine' || tab === 'publish' ? '내 공개 기록을 확인하고 있어요.' : '순위표를 불러오고 있어요.'}</span></div>
  return <Modal open centered styles={{ body: { maxHeight: 'calc(100dvh - 220px)', overflowY: 'auto' } }} title={tab === 'publish' ? '이 기록을 순위에 공개할까요?' : initialTab === 'publish' ? '내 공개 기록' : 'FireWatch 주간 순위'} onCancel={() => { if (!busy) close() }} width={initialTab === 'publish' ? 560 : 900} footer={<Button disabled={busy} onClick={close}>{tab === 'publish' ? '공개하지 않고 돌아가기' : '닫기'}</Button>}>
    {initialTab !== 'publish' && <><p>게임마다 시장이 달라요. 같은 조건의 수익률을 비교해요.</p>
    <Tabs tabBarGutter={16} activeKey={tab} onChange={v => { setTab(v as RankingTab); setPage(0) }} items={[{ key: 'board', label: '주간 순위' }, { key: 'winners', label: '주간 우승자' }, { key: 'publish', label: '기록 등록' }, { key: 'mine', label: '내 기록' }]} /></>}
    {tab === 'publish' && <GameRankingRules />}
    {error && !loading && <Alert type="error" showIcon icon={<FirewatchIcon name="warning" monochrome />} message={error} action={<Button onClick={() => setRevision(v => v + 1)}>다시 확인</Button>} />}
    {tab === 'board' && <><Space wrap className="ranking-filters"><Button disabled={weekOffset <= -104} onClick={() => filter(() => setWeekOffset(v => v - 1))}>이전 주</Button><strong>{week} 시작 주</strong><Button disabled={weekOffset >= 0} onClick={() => filter(() => setWeekOffset(v => v + 1))}>다음 주</Button><Select aria-label="순위 난이도" value={difficulty} options={Object.entries(rankingDifficulties).map(([value, label]) => ({ value, label }))} onChange={v => filter(() => setDifficulty(v))} /><Select aria-label="순위 공매도 조건" value={shortSelling ? 'yes' : 'no'} options={[{ value: 'no', label: '공매도 없음' }, { value: 'yes', label: '공매도 허용' }]} onChange={v => filter(() => setShort(v === 'yes'))} /><Tag>24주 완주 기록</Tag></Space><p>{board?.closed ? '마감된 주간 기록' : '한국 시간 월요일 00:00 마감'}</p>{loading && loadingView}{!loading && board?.entries.length ? <ol className="ranking-list" start={page * 20 + 1}>{board.entries.map(({ rank, entry }) => <li key={entry.id}><span className="ranking-place">{rank}</span><strong>{entry.nickname}</strong><strong className={entry.returnPercent < 0 ? 'negative' : 'positive'}>{rankingScore(entry.returnPercent)}</strong></li>)}</ol> : !loading && !error && <Empty image={<FirewatchIcon name="rankings" size={40} />} description="이 조건에 등록된 기록이 없습니다. 첫 기록으로 참여해보세요." />}<Space><Button disabled={loading || page === 0} onClick={() => setPage(v => v - 1)}>이전 페이지</Button><Button disabled={loading || !board || (page + 1) * 20 >= board.total} onClick={() => setPage(v => v + 1)}>다음 페이지</Button></Space></>}
    {tab === 'winners' && <>{loading && loadingView}{!loading && winners.length ? <div className="ranking-winners">{winners.map(e => <article key={e.id}><Tag color="orange">{e.weekStart} 시작 주 1위</Tag><h3>{e.nickname}</h3><strong className={e.returnPercent < 0 ? 'negative' : 'positive'}>{rankingScore(e.returnPercent)}</strong><p>{rankingLeague(e)} · 24주 완주</p></article>)}</div> : !loading && !error && <Empty image={<FirewatchIcon name="rankings" size={40} />} description="첫 주간 마감 후 조건별 우승자가 여기에 모입니다." />}<Space><Button disabled={loading || page === 0} onClick={() => setPage(v => v - 1)}>이전 페이지</Button><Button disabled={loading || winners.length < 30} onClick={() => setPage(v => v + 1)}>다음 페이지</Button></Space></>}
    {(tab === 'publish' || tab === 'mine') && !session && <Alert type="info" message="공개 기록 등록·관리는 Google 로그인이 필요합니다." description={<Link to="/account" onClick={close}>내 계정에서 로그인</Link>} />}
    {tab === 'publish' && session && loading && loadingView}
    {tab === 'publish' && session && !loading && <div className="ranking-publish">{isEligible && turn ? <><h3>{rankingGameBoard(turn)} · 수익률 {rankingScore(turn.returnPercent!)}</h3><p>이메일과 보유·거래 상세는 공개하지 않습니다. 게임 닉네임·수익률·게임 조건·등록 시각을 공개하며 내 기록에서 철회할 수 있습니다.</p><label>게임 닉네임<Input aria-label="게임 닉네임" maxLength={16} disabled={busy || loading || !!mine?.nickname} value={nickname} onChange={e => setNickname(e.target.value)} placeholder="한글·영문·숫자 등 2~16자" /></label><Checkbox checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)}>위 게임 기록을 공개하는 데 동의합니다.</Checkbox><Button type="primary" loading={busy} disabled={loading || !!error || !consent || nickname.trim().length < 2} onClick={publish}>이 기록 공개하기</Button></> : <Empty image={<FirewatchIcon name="rankings" size={40} />} description="24주를 끝까지 진행하고 평가가 확인되면 등록할 수 있어요." />}</div>}
    {tab === 'mine' && session && loading && loadingView}
    {tab === 'mine' && session && !loading && <>{mine?.entries.length ? mine.entries.map(e => <article className="ranking-own" key={e.id}><div><strong>{e.nickname} · {rankingScore(e.returnPercent)}</strong><p>{e.weekStart} 시작 주 · {rankingLeague(e)} · {e.board === 'FINISHED' ? '완주 기록' : `${e.turnIndex + 1}턴 기록`}</p></div>{e.visible ? <Popconfirm icon={<FirewatchIcon name="warning" size={20} />} okText="공개 철회" cancelText="취소" title="순위와 우승자 목록에서 숨길까요?" description="철회한 기록은 다시 공개할 수 없습니다." onConfirm={() => withdraw(e.id)}><Button disabled={busy}>공개 철회</Button></Popconfirm> : <Tag>공개 철회됨</Tag>}</article>) : !error && <Empty image={<FirewatchIcon name="rankings" size={40} />} description="공개한 게임 기록이 없습니다." />}<Space><Button disabled={loading || page === 0} onClick={() => setPage(v => v - 1)}>이전 페이지</Button><Button disabled={loading || !mine || (page + 1) * 20 >= mine.total} onClick={() => setPage(v => v + 1)}>다음 페이지</Button></Space></>}
    {tab !== 'publish' && <GameRankingRules />}
  </Modal>
}
