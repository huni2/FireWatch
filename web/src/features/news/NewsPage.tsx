import { useState } from 'react'
import { Alert, Button, Input, Pagination, Space, Typography } from 'antd'
import { Link, useSearchParams } from 'react-router-dom'
import { RelatedNewsCard } from './components/RelatedNewsCard'
import { useApi } from '../../lib/useApi'
import { fetchNewsFeed } from '../../lib/investingApi'
import { SlowLoadingHint } from '../../components/SlowLoadingHint'
import { fetchSettings } from '../../lib/api'
import { newsQuery, type NewsFilters } from '../../../../shared/investing'
import { useStockNames } from '../stocks/hooks/useStockNames'
import { stockLabel } from '../../../../shared/stock-labels'

const kstDay = (daysAgo = 0) => new Date(Date.now() + 9 * 3600000 - daysAgo * 86400000).toISOString().slice(0, 10)

export function NewsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = (searchParams.get('q') ?? '').slice(0, 100)
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const pageParam = Number(searchParams.get('page') ?? 0)
  const page = Number.isSafeInteger(pageParam) && pageParam >= 0 ? Math.min(pageParam, 100000) : 0
  const filters: NewsFilters = { q, from, to, page, size: 20 }
  const requestKey = newsQuery(filters)
  const editKey = JSON.stringify([q, from, to])
  const [edit, setEdit] = useState({ key: editKey, q, from, to })
  const draft = edit.key === editKey ? { q: edit.q, from: edit.from, to: edit.to } : { q, from, to }
  const setDraft = (next: typeof draft | ((value: typeof draft) => typeof draft)) => setEdit({ key: editKey, ...(typeof next === 'function' ? next(draft) : next) })
  const [validation, setValidation] = useState({ key: editKey, message: '' })
  const filterError = validation.key === editKey ? validation.message : ''
  const setFilterError = (message: string) => setValidation({ key: editKey, message })
  // Match the response to its request, including while a changed filter is loading or fails.
  const latest = useApi(async () => ({ key: requestKey, feed: await fetchNewsFeed(filters) }), [requestKey])
  const data = latest.data?.key === requestKey ? latest.data.feed : null
  const pending = latest.loading || (!data && !latest.error)
  const settings = useApi(fetchSettings)
  const { names } = useStockNames()
  const keywords = [...new Set([...(settings.data?.interestKeywords ?? []), ...(settings.data?.watchedStocks ?? []).map(symbol => stockLabel(symbol, names)).filter(name => name !== '회사명 확인 필요')])]
  const update = (next: NewsFilters) => {
    const value = { q: next.q ?? '', from: next.from ?? '', to: next.to ?? '' }
    const key = JSON.stringify([value.q, value.from, value.to])
    setEdit({ key, ...value }); setValidation({ key, message: '' })
    setSearchParams(newsQuery({ ...value, page: next.page || undefined }))
  }
  const apply = () => {
    if (draft.from && draft.to && draft.from > draft.to) { setFilterError('마지막 날짜는 시작 날짜 이후로 선택해주세요.'); return }
    setFilterError(''); update({ ...draft, q: draft.q.trim(), page: 0 })
  }
  const period = (days: number | null) => update({ q, from: days == null ? '' : kstDay(days - 1), to: days == null ? '' : kstDay(), page: 0 })
  const clear = () => { setDraft({ q: '', from: '', to: '' }); setFilterError(''); update({}) }

  return <div className="news-page">
    <header className="compact-intro"><span className="page-eyebrow">시장 소식</span><Typography.Title level={2}>뉴스 보관함</Typography.Title><p>관심 회사의 소식을 날짜와 키워드로 다시 찾아보세요.</p></header>
    <div className="news-layout"><aside className="news-filter-panel"><form className="news-controls" data-tour="news-search" onSubmit={e => { e.preventDefault(); apply() }}>
      <label className="news-search-label" htmlFor="news-query">회사·키워드</label>
      <div className="news-search-line"><Input id="news-query" aria-label="뉴스 검색어" value={draft.q} maxLength={100} allowClear placeholder="예: 삼성전자, 반도체" onChange={e => setDraft(v => ({ ...v, q: e.target.value }))} /><Button type="primary" htmlType="submit">뉴스 찾기</Button><Button onClick={clear}>전체 보기</Button></div>
      <div className="news-periods" aria-label="뉴스 기간 선택">{[{ label: '최근 저장 뉴스', days: null }, { label: '오늘', days: 1 }, { label: '최근 7일', days: 7 }].map(item => { const selected = item.days == null ? !from && !to : from === kstDay(item.days - 1) && to === kstDay(); return <Button key={item.label} type={selected ? 'primary' : 'default'} aria-pressed={selected} onClick={() => period(item.days)}>{item.label}</Button> })}</div>
      <details><summary>날짜 직접 선택{from || to ? ' · 적용 ' + (from || '처음부터') + ' ~ ' + (to || '최근까지') : ''}</summary><div className="portfolio-fields"><label>시작 날짜<Input aria-label="뉴스 시작 날짜" type="date" value={draft.from} onChange={e => setDraft(v => ({ ...v, from: e.target.value }))} /></label><label>마지막 날짜<Input aria-label="뉴스 마지막 날짜" type="date" value={draft.to} onChange={e => setDraft(v => ({ ...v, to: e.target.value }))} /></label></div><Button style={{ marginTop: 12 }} htmlType="submit">날짜 조건 적용</Button></details>
      {filterError && <Alert type="warning" message={filterError} />}
    </form>
    <details className="news-keywords"><summary>내 관심 회사·키워드 · {keywords.length}개</summary>{keywords.length ? <Space wrap aria-label="관심 뉴스 키워드">{keywords.map(keyword => <Button key={keyword} aria-pressed={q === keyword} type={q === keyword ? 'primary' : 'default'} onClick={() => update({ ...filters, q: keyword, page: 0 })}>{keyword}</Button>)}</Space> : <p><Link to="/stocks">관심 회사 등록</Link> 후 한 번에 검색할 수 있어요.</p>}</details></aside><section className="news-results" aria-label="저장 뉴스 검색 결과" aria-busy={pending}>
    <div className="news-result-heading"><div><strong>{q ? `“${q}” 관련 뉴스` : '최근 저장 뉴스'}</strong><span>{data ? `${data.total ?? data.news.length}건` : pending ? '조회 중' : '조회 실패'}{from || to ? ` · ${from || '처음부터'} ~ ${to || '최근까지'}` : ''}</span></div><Button onClick={latest.reload} loading={latest.loading}>새로고침</Button></div>
    <SlowLoadingHint loading={pending} isSlow={latest.isSlow} />
    {latest.error && <Alert type="error" message={data ? '새로고침 실패 · 같은 조건의 이전 조회 결과입니다.' : '뉴스 조회 실패'} description={latest.error.message} action={<Button onClick={latest.reload}>다시 시도</Button>} />}
    {(!latest.error || data) && <RelatedNewsCard title={null} news={data?.news ?? []} loading={pending} emptyDescription="조건에 맞는 저장 기사가 없어요. 전체 보기나 다른 날짜·검색어를 선택해보세요." />}
    {data && <Pagination current={page + 1} pageSize={20} total={data.total ?? data.news.length} showSizeChanger={false} disabled={pending} onChange={p => update({ ...filters, page: p - 1 })} />}
    <Typography.Text className="news-collection-meta" type="secondary">{data?.updatedAt ? '마지막 수집 · ' + new Date(data.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) + ' KST · ' : ''}한국 시간 날짜 기준 · 제목·설명 검색. 수집 예정 간격은 약 {data?.refreshMinutes ?? 30}분이며 지연될 수 있습니다.</Typography.Text>
    </section></div>
  </div>
}
