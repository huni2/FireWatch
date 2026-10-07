import { useState } from 'react'
import { Alert, Button, Input, Pagination, Space, Typography } from 'antd'
import { RelatedNewsCard } from './components/RelatedNewsCard'
import { useApi } from '../../lib/useApi'
import { fetchNewsFeed } from '../../lib/investingApi'
import { SlowLoadingHint } from '../../components/SlowLoadingHint'
import { fetchSettings } from '../../lib/api'
import type { NewsFilters } from '../../../../shared/investing'
import { useSearchParams } from 'react-router-dom'
import { useStockNames } from '../stocks/hooks/useStockNames'
import { stockLabel } from '../../../../shared/stock-labels'

const kstDay = (daysAgo = 0) => new Date(Date.now() + 9 * 3600000 - daysAgo * 86400000).toISOString().slice(0, 10)

export function NewsPage() {
  const [searchParams] = useSearchParams()
  const initialQuery = (searchParams.get('q') ?? '').slice(0, 100)
  const [draft, setDraft] = useState({ q: initialQuery, from: '', to: '' })
  const [filters, setFilters] = useState<NewsFilters>({ q: initialQuery, page: 0, size: 20 })
  const [filterError, setFilterError] = useState('')
  const latest = useApi(() => fetchNewsFeed(filters), [filters.q, filters.from, filters.to, filters.page])
  const settings = useApi(fetchSettings)
  const { names } = useStockNames()
  const keywords = [...new Set([...(settings.data?.interestKeywords ?? []), ...(settings.data?.watchedStocks ?? []).map(symbol => stockLabel(symbol, names)).filter(name => name !== '회사명 확인 필요')])]
  const apply = () => {
    if (draft.from && draft.to && draft.from > draft.to) { setFilterError('마지막 날짜는 시작 날짜 이후로 선택해주세요.'); return }
    setFilterError(''); setFilters({ ...draft, page: 0, size: 20 })
  }
  const period = (days: number | null) => {
    const range = { ...draft, from: days == null ? '' : kstDay(days - 1), to: days == null ? '' : kstDay() }
    setDraft(range); setFilterError(''); setFilters({ ...range, page: 0, size: 20 })
  }
  const clear = () => { setDraft({ q: '', from: '', to: '' }); setFilterError(''); setFilters({ page: 0, size: 20 }) }

  return <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <header className="compact-intro"><Typography.Title level={2}>뉴스에서 투자 맥락을 찾으세요.</Typography.Title><p>저장된 실제 기사 · 회사명과 날짜로 다시 찾을 수 있어요.</p></header>
    <form className="news-controls" data-tour="news-search" onSubmit={e => { e.preventDefault(); apply() }}>
      <div className="news-search-line"><Input aria-label="뉴스 검색어" value={draft.q} maxLength={100} allowClear placeholder="회사명·키워드로 검색" onChange={e => setDraft(v => ({ ...v, q: e.target.value }))} /><Button type="primary" htmlType="submit" loading={latest.loading}>뉴스 찾기</Button><Button onClick={clear}>전체 보기</Button></div>
      <div className="news-periods" aria-label="뉴스 기간 선택">{[{ label: '최근 저장 뉴스', days: null }, { label: '오늘', days: 1 }, { label: '최근 7일', days: 7 }].map(item => { const selected = item.days == null ? !filters.from && !filters.to : filters.from === kstDay(item.days - 1) && filters.to === kstDay(); return <Button key={item.label} type={selected ? 'primary' : 'default'} aria-pressed={selected} onClick={() => period(item.days)}>{item.label}</Button> })}</div>
      <details><summary>날짜 직접 선택{filters.from || filters.to ? ' · 적용 ' + (filters.from || '처음부터') + ' ~ ' + (filters.to || '최근까지') : ''}</summary><div className="portfolio-fields"><label>시작 날짜<Input aria-label="뉴스 시작 날짜" type="date" value={draft.from} onChange={e => setDraft(v => ({ ...v, from: e.target.value }))} /></label><label>마지막 날짜<Input aria-label="뉴스 마지막 날짜" type="date" value={draft.to} onChange={e => setDraft(v => ({ ...v, to: e.target.value }))} /></label></div><Button style={{ marginTop: 12 }} htmlType="submit">날짜 조건 적용</Button></details>
      {filterError && <Alert type="warning" message={filterError} />}
    </form>
    {!!keywords.length && <Space wrap aria-label="관심 뉴스 키워드">{keywords.map(q => <Button key={q} size="small" aria-pressed={filters.q === q} onClick={() => { setDraft(v => ({ ...v, q })); setFilters(v => ({ ...v, q, page: 0 })) }}>{q}</Button>)}</Space>}
    <div className="data-status-line"><div><strong>{latest.data?.updatedAt ? '마지막 수집 · ' + new Date(latest.data.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) + ' KST' : '수집 시각 확인 중'}</strong><span>{filters.q ? '검색어: ' + filters.q + ' · ' : ''}추가 뉴스 약 {latest.data?.refreshMinutes ?? 30}분 간격 · 저장된 제목·설명 검색</span></div><Button onClick={latest.reload} loading={latest.loading}>새로고침</Button></div>
    <SlowLoadingHint loading={latest.loading} isSlow={latest.isSlow} />
    {latest.error && <Alert type="error" message="뉴스 조회 실패" description={latest.error.message} />}
    {(!latest.error || latest.data) && <RelatedNewsCard title={filters.q || filters.from || filters.to ? '검색한 뉴스' : '최근 저장 뉴스'} news={latest.data?.news ?? []} loading={latest.loading} emptyDescription="조건에 맞는 저장 기사가 없어요. 전체 보기나 다른 날짜·검색어를 선택해보세요." />}
    <Pagination current={(filters.page ?? 0) + 1} pageSize={20} total={latest.data?.total ?? latest.data?.news.length ?? 0} showSizeChanger={false} onChange={p => setFilters(v => ({ ...v, page: p - 1 }))} />
    <Typography.Text type="secondary">한국 시간 날짜 기준 · 원문 전체와 수집 전 기사는 보관하지 않습니다.</Typography.Text>
  </Space>
}
