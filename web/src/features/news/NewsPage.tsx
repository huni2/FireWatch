import { useState } from 'react'
import { Alert, Button, Input, Pagination, Space, Tag, Typography } from 'antd'
import { RelatedNewsCard } from './components/RelatedNewsCard'
import { useApi } from '../../lib/useApi'
import { fetchNewsFeed } from '../../lib/investingApi'
import { SlowLoadingHint } from '../../components/SlowLoadingHint'
import { fetchSettings } from '../../lib/api'
import type { NewsFilters } from '../../../../shared/investing'
import { useSearchParams } from 'react-router-dom'
import { useStockNames } from '../stocks/hooks/useStockNames'
import { stockLabel } from '../../../../shared/stock-labels'

// 2026-08-23 사용자 요청 — 대시보드에 있던 관련 뉴스를 별도 메뉴로 분리.
export function NewsPage() {
  const [searchParams] = useSearchParams()
  const initialQuery = (searchParams.get('q') ?? '').slice(0, 100)
  const [draft, setDraft] = useState({ q: initialQuery, from: '', to: '' })
  const [filters, setFilters] = useState<NewsFilters>({ q: initialQuery, page: 0, size: 20 })
  const latest = useApi(() => fetchNewsFeed(filters), [filters.q, filters.from, filters.to, filters.page])
  const settings = useApi(fetchSettings)
  const { names } = useStockNames()
  const keyword = (q: string) => { setDraft(v => ({ ...v, q })); setFilters(v => ({ ...v, q, page: 0 })) }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="page-intro"><span className="eyebrow">FIREWATCH / NEWS ARCHIVE</span><Typography.Title level={2}>쌓아둔 소식에서, 투자 맥락을 찾다.</Typography.Title><Typography.Text type="secondary">저장된 실제 뉴스와 브리핑 기사를 날짜·종목명·키워드로 찾아보세요.</Typography.Text></div>
      <form data-tour="news-search" onSubmit={e => { e.preventDefault(); setFilters({ ...draft, page: 0, size: 20 }) }}>
        <div className="portfolio-fields"><label>종목명·키워드<Input aria-label="뉴스 검색어" value={draft.q} maxLength={100} placeholder="예: 삼성전자, 반도체, 금리" onChange={e => setDraft(v => ({ ...v, q: e.target.value }))} /></label><label>시작 날짜<Input aria-label="뉴스 시작 날짜" type="date" value={draft.from} onChange={e => setDraft(v => ({ ...v, from: e.target.value }))} /></label><label>마지막 날짜<Input aria-label="뉴스 마지막 날짜" type="date" value={draft.to} onChange={e => setDraft(v => ({ ...v, to: e.target.value }))} /></label></div>
        <Space style={{ marginTop: 16 }}><Button type="primary" htmlType="submit" loading={latest.loading}>뉴스 찾기</Button><Button onClick={() => { setDraft({ q: '', from: '', to: '' }); setFilters({ page: 0, size: 20 }) }}>전체 보기</Button></Space>
      </form>
      <Space wrap>{[...(settings.data?.interestKeywords ?? []), ...(settings.data?.watchedStocks ?? []).map(symbol => stockLabel(symbol, names)).filter(name => name !== '회사명 확인 필요')].map(q => <Tag key={q} onClick={() => keyword(q)} style={{ cursor: 'pointer' }}>{q}</Tag>)}</Space>
      <SlowLoadingHint loading={latest.loading} isSlow={latest.isSlow} />
      <Typography.Text type="secondary">아침 브리핑과 별도로 수집하는 추가 소식 · 약 30분 간격{latest.data?.updatedAt ? ` · 수집 ${new Date(latest.data.updatedAt).toLocaleString('ko-KR')}` : ''}</Typography.Text>
      <Button onClick={latest.reload} loading={latest.loading}>새로고침</Button>
      {latest.error && <Alert type="error" message="뉴스 조회 실패" description={latest.error.message} />}
      {(!latest.error || latest.data) && <RelatedNewsCard news={latest.data?.news ?? []} loading={latest.loading} />}
      <Pagination current={(filters.page ?? 0) + 1} pageSize={20} total={latest.data?.total ?? latest.data?.news.length ?? 0} showSizeChanger={false} onChange={p => setFilters(v => ({ ...v, page: p - 1 }))} />
      <Typography.Text type="secondary">한국 시간 날짜 기준 · 검색은 저장된 제목과 설명의 문자열 일치입니다. 원문 전체와 수집 전 기사는 보관하지 않습니다.</Typography.Text>
    </Space>
  )
}
