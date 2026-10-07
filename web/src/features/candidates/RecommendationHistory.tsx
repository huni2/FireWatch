import { useState } from 'react'
import { Alert, Button, Card, Empty, Input, Space, Typography } from 'antd'
import { fetchRecommendationHistory } from '../../lib/investingApi'
import { qualifiedRecommendations, type RecommendationReport } from '../../../../shared/discovery'

export function RecommendationHistory() {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<RecommendationReport[]>([])
  const [selected, setSelected] = useState<RecommendationReport | null>(null)
  const [from, setFrom] = useState(''), [to, setTo] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null)
  const load = async () => {
    setOpen(true); setBusy(true); setError(null)
    try { const reports = await fetchRecommendationHistory(from || undefined, to || undefined); setRows(reports); setSelected(reports[0] ?? null) }
    catch (e) { setError(e instanceof Error ? e.message : '이력 조회 실패') }
    finally { setBusy(false) }
  }
  return <Card title="추천 분석 보관함" extra={<Button onClick={() => open ? setOpen(false) : void load()}>{open ? '접기' : '날짜별 근거 보기'}</Button>}>
    <Typography.Text type="secondary">분석 당시 기록을 보존하고, 기업과 기사 연결을 확인한 후보의 이유·위험을 보여줍니다. 새 분석이 과거 기록을 덮어쓰지 않습니다.</Typography.Text>
    {open && <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
      <Space wrap><Input type="date" aria-label="추천 분석 시작일" value={from} onChange={e => setFrom(e.target.value)} /><Input type="date" aria-label="추천 분석 종료일" value={to} onChange={e => setTo(e.target.value)} /><Button onClick={() => void load()} loading={busy}>이력 조회</Button></Space>
      {error && <Alert type="error" message={error} />}
      {!busy && !rows.length && <Empty description="이 기간에 저장된 추천 분석이 없습니다." />}
      <Space wrap>{rows.map(row => <Button key={row.briefingDate} type={selected?.briefingDate === row.briefingDate ? 'primary' : 'default'} onClick={() => setSelected(row)}>{row.briefingDate} · {row.recommendedStocks.length}개</Button>)}</Space>
      {selected && <><Typography.Text>분석 {selected.analyzedAt ? new Date(selected.analyzedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '시각 미확인'} 한국 시간</Typography.Text>{qualifiedRecommendations(selected).map(pick => <Card size="small" key={pick.stockName} title={pick.stockName}><p>{pick.reason}</p><p>확인할 위험 · {pick.risk}</p>{pick.sourceNewsLinks.map(link => <p key={link}><a href={link} target="_blank" rel="noopener noreferrer">{selected.news.find(article => article.link === link)?.title ?? '분석에 사용한 기사'}</a></p>)}</Card>)}</>}
    </Space>}
  </Card>
}
