import { useEffect, useState } from 'react'
import { Alert, App, Button, Card, Empty, Input, Select, Skeleton, Space, Tabs, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { request } from '../../lib/api'
import { getLoginSession, useLoginSession } from '../../lib/loginSession'
import { useIsOperator, getOperatorKey } from '../../lib/operatorAccess'
import { type Feedback, type Notice, feedbackTypes, feedbackStates } from '../../../../shared/community'
import '../support-pages.css'
const targetLabels = { ALL: '전체', WEB: '웹', ANDROID: 'Android 앱' }
const dateInputStyle = { display: 'block', width: '100%', minHeight: 44, borderRadius: 8, padding: 8, border: '1px solid var(--ant-color-border)', background: 'var(--ant-color-bg-container)', color: 'var(--ant-color-text)' }

export function CommunityPage() {
  const { message } = App.useApp()
  const session = useLoginSession()
  const operator = useIsOperator()
  const [notices, setNotices] = useState<Notice[]>([])
  const [noticeLoading, setNoticeLoading] = useState(true)
  const [noticeError, setNoticeError] = useState('')
  const [noticeRetry, setNoticeRetry] = useState(0)
  const [mine, setMine] = useState<Feedback[]>([])
  const [mineToken, setMineToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [category, setCategory] = useState('BUG')
  const [content, setContent] = useState('')
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  const [tab, setTab] = useState('notices')
  const visibleMine = mineToken === session?.token ? mine : []
  async function refreshMine() {
    const token = session?.token
    try { const rows = await request<Feedback[]>('/api/community/feedback'); if (token === getLoginSession()?.token) { setMine(rows); setMineToken(token ?? '') } } catch (e) { setError((e as Error).message) }
  }
  useEffect(() => {
    let active = true
    request<Notice[]>('/api/community/notices?platform=WEB').then(data => { if (active) setNotices(data) }).catch(() => { if (active) setNoticeError('공지를 불러오지 못했어요.') }).finally(() => { if (active) setNoticeLoading(false) })
    return () => { active = false }
  }, [noticeRetry])
  useEffect(() => {
    let active = true
    if (session) request<Feedback[]>('/api/community/feedback').then(data => { if (active) { setMine(data); setMineToken(session.token) } }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [session])
  async function submit() {
    setBusy(true); setError('')
    try {
      const ticket = await request<Feedback>('/api/community/feedback', { method: 'POST', body: JSON.stringify({ requestId, category, content, platform: 'WEB', version: import.meta.env.VITE_APP_VERSION ?? '2026.10.07', screen: '/community' }) })
      setMine(rows => [ticket, ...rows.filter(r => r.id !== ticket.id)]); setMineToken(session?.token ?? ''); setContent(''); setRequestId(crypto.randomUUID()); message.success('접수했습니다. 내 문의에서 답변을 확인해주세요.')
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return <Space className="support-page community-page" direction="vertical" size={16}>
    <header className="compact-intro"><Typography.Title level={2}>공지·문의</Typography.Title><p>새 소식을 확인하거나 불편했던 점을 알려주세요.</p></header>
    {error && <Alert type="error" message={error} />}
    <Tabs activeKey={tab} onChange={setTab} items={[
      { key: 'notices', label: '공지사항', children: <Space direction="vertical" size={16} style={{ width: '100%' }}>{noticeLoading ? <Card><p role="status">새 소식을 확인하고 있어요.</p><Skeleton active /></Card> : noticeError ? <Alert type="warning" showIcon message={noticeError} action={<Button onClick={() => { setNoticeLoading(true); setNoticeError(''); setNoticeRetry(v => v + 1) }}>공지 다시 불러오기</Button>} /> : notices.length ? notices.map(n => <Card key={n.id} title={<span style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{n.title}</span>}><div className="support-notice-meta"><Tag>{targetLabels[n.target]}</Tag><time dateTime={n.startsAt}>{new Date(n.startsAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST</time></div><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{n.content}</p></Card>) : <Card><div className="support-empty"><div><h3>새 공지가 없어요</h3><p>불편했던 점이나 바라는 기능이 있나요?</p><Link to="/guide">사용 방법 살펴보기 →</Link></div><Button onClick={() => setTab('feedback')}>의견 보내기</Button></div></Card>}</Space> },
      { key: 'feedback', label: '문제 신고·의견', children: session ? <Card title="문제 신고·의견 보내기"><Space direction="vertical" style={{ width: '100%' }}><Select aria-label="문의 유형" value={category} onChange={v => { setCategory(v); setRequestId(crypto.randomUUID()) }} options={Object.entries(feedbackTypes).map(([value, label]) => ({ value, label }))} /><Input.TextArea aria-label="문의 내용" placeholder="어떤 화면에서 무슨 일이 있었나요? 비밀번호·토큰·계좌번호는 입력하지 마세요." value={content} disabled={busy} onChange={e => { setContent(e.target.value); setRequestId(crypto.randomUUID()) }} maxLength={3000} showCount rows={6} /><p>운영자만 내용을 확인합니다. 접수 화면 경로와 웹 버전을 함께 저장하며, 개인 포트폴리오와 로그인 토큰은 첨부하지 않습니다.</p><Button type="primary" loading={busy} disabled={content.trim().length < 5} onClick={submit}>접수하기</Button></Space></Card> : <Alert type="info" message="내 문의와 답변을 여러 기기에서 확인하려면 로그인해주세요." action={<Link to="/account">Google 로그인</Link>} /> },
      { key: 'mine', label: '내 문의', children: session ? <Space direction="vertical" style={{ width: '100%' }}><Button onClick={refreshMine}>답변 새로고침</Button>{visibleMine.length ? visibleMine.map(f => <Card key={f.id} title={feedbackTypes[f.category]}><Tag>{feedbackStates[f.status]}</Tag><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{f.content}</p><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{f.reply ? `운영자 답변 · ${f.reply}` : '아직 답변이 없습니다.'}</p></Card>) : <Empty description="접수한 문의가 없습니다." />}</Space> : <Link to="/account">로그인 후 내 문의 확인</Link> },
      ...(operator ? [{ key: 'operator', label: '운영자 관리', children: <CommunityAdmin /> }] : []),
    ]} />
  </Space>
}

function CommunityAdmin() {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [page, setPage] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({ title: '', content: '', target: 'ALL', popup: false, startsAt: '', endsAt: '', published: false })
  const [editing, setEditing] = useState<string | null>(null)
  const headers = () => ({ 'X-API-Key': getOperatorKey() })
  const reload = () => { request<Feedback[]>(`/api/community/operator/feedback?page=${page}`, { headers: headers() }).then(setFeedback).catch(e => setError(e.message)); request<Notice[]>('/api/community/operator/notices', { headers: headers() }).then(setNotices).catch(e => setError(e.message)) }
  useEffect(() => { let active = true; request<Feedback[]>(`/api/community/operator/feedback?page=${page}`, { headers: { 'X-API-Key': getOperatorKey() } }).then(d => { if (active) setFeedback(d) }).catch(e => { if (active) setError(e.message) }); request<Notice[]>('/api/community/operator/notices', { headers: { 'X-API-Key': getOperatorKey() } }).then(d => { if (active) setNotices(d) }).catch(e => { if (active) setError(e.message) }); return () => { active = false } }, [page])
  async function saveNotice() {
    setBusy(true); setError('')
    try { await request(`/api/community/operator/notices${editing ? '/' + editing : ''}`, { method: editing ? 'PUT' : 'POST', headers: headers(), body: JSON.stringify({ ...draft, startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : new Date().toISOString(), endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null }) }); setEditing(null); setDraft({ title: '', content: '', target: 'ALL', popup: false, startsAt: '', endsAt: '', published: false }); reload() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const localDate = (iso: string) => { const date = new Date(iso); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
  return <Space direction="vertical" size="large" style={{ width: '100%' }}>{error && <Alert type="error" message={error} />}
    <Card title="사용자 피드백"><Button onClick={reload}>새로고침</Button>{feedback.length === 0 && <Empty description="접수 내역이 없습니다." />}{feedback.map(f => <Card key={f.id} size="small" title={`${feedbackTypes[f.category]} · ${f.platform}`} style={{ marginBlock: 12 }}><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{f.content}</p><small>{f.screen} · {f.version}</small><Select aria-label="처리 상태" value={f.status} onChange={status => setFeedback(rows => rows.map(r => r.id === f.id ? { ...r, status } : r))} options={Object.entries(feedbackStates).map(([value, label]) => ({ value, label }))} /><Input.TextArea aria-label="운영자 답변" value={f.reply} maxLength={3000} onChange={e => setFeedback(rows => rows.map(r => r.id === f.id ? { ...r, reply: e.target.value } : r))} /><Button onClick={() => { setBusy(true); request(`/api/community/operator/feedback/${encodeURIComponent(f.id)}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ status: f.status, reply: f.reply }) }).then(reload).catch(e => setError(e.message)).finally(() => setBusy(false)) }} loading={busy}>답변·상태 저장</Button></Card>)}<Space><Button disabled={page === 0} onClick={() => setPage(v => v - 1)}>이전</Button><span>{page + 1}페이지</span><Button disabled={feedback.length < 50} onClick={() => setPage(v => v + 1)}>다음</Button></Space></Card>
    <Card title={editing ? '공지 수정' : '공지 작성'}><Space direction="vertical" style={{ width: '100%' }}><Input aria-label="공지 제목" placeholder="공지 제목" value={draft.title} maxLength={100} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} /><Input.TextArea aria-label="공지 본문" rows={5} maxLength={5000} value={draft.content} onChange={e => setDraft(d => ({ ...d, content: e.target.value }))} /><Select aria-label="공지 대상" value={draft.target} onChange={target => setDraft(d => ({ ...d, target }))} options={Object.entries(targetLabels).map(([value, label]) => ({ value, label }))} /><label><input type="checkbox" checked={draft.popup} onChange={e => setDraft(d => ({ ...d, popup: e.target.checked }))} /> 첫 진입 모달 표시</label><label><input type="checkbox" checked={draft.published} onChange={e => setDraft(d => ({ ...d, published: e.target.checked }))} /> 공개 게시</label><label>게시 시작 (현재 기기 시간, 비우면 즉시)<input type="datetime-local" style={dateInputStyle} value={draft.startsAt} onChange={e => setDraft(d => ({ ...d, startsAt: e.target.value }))} /></label><label>게시 종료 (선택)<input type="datetime-local" style={dateInputStyle} value={draft.endsAt} onChange={e => setDraft(d => ({ ...d, endsAt: e.target.value }))} /></label><Button type="primary" loading={busy} disabled={!draft.title.trim() || !draft.content.trim()} onClick={saveNotice}>공지 저장</Button></Space></Card>
    {notices.map(n => <Card key={n.id} title={n.title}><Tag>{n.published ? '게시' : '초안'}</Tag><Tag>{targetLabels[n.target]}</Tag><Button onClick={() => { setEditing(n.id); setDraft({ ...n, startsAt: localDate(n.startsAt), endsAt: n.endsAt ? localDate(n.endsAt) : '' }) }}>수정·게시 중지</Button></Card>)}
  </Space>
}
