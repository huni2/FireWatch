import { useCallback, useRef, useState } from 'react'
import { Alert, Button, Card, Empty, Input, Segmented, Space, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { request } from '../../lib/api'
import { useApi } from '../../lib/useApi'
import { catalogQuery, type CatalogPage } from '../../../../shared/catalog'
import { sectors } from '../../../../shared/discovery'
import { useStockNames } from '../stocks/hooks/useStockNames'

export function CatalogExplorer() {
  const { rememberName } = useStockNames()
  const [text, setText] = useState('')
  const [filters, setFilters] = useState({ q: '', assetClass: 'ETF', region: '', page: 0 })
  const start = useRef<HTMLElement>(null)
  const { q, assetClass, region, page } = filters
  const key = catalogQuery(q, assetClass, region, page)
  const load = useCallback(async () => ({ key, value: await request<CatalogPage>(`/api/catalog?${key}`) }), [key])
  const catalog = useApi(load, [key])
  const data = !catalog.loading && !catalog.error && catalog.data?.key === key ? catalog.data.value : null
  function movePage(next: number) {
    setFilters(current => ({ ...current, page: next }))
    if (start.current) start.current.style.scrollMarginTop = `${(document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0) + 16}px`
    start.current?.scrollIntoView({ block: 'start' })
  }
  function pager(position: string) {
    if (page === 0 && !data?.hasMore) return null
    return <nav aria-label={`상품 목록 페이지 ${position}`} className="catalog-pagination">
      <Button disabled={catalog.loading || page === 0} onClick={() => movePage(page - 1)}>이전</Button>
      <span>{page + 1}페이지</span>
      <Button disabled={!data?.hasMore || page >= 10000} onClick={() => movePage(page + 1)}>다음</Button>
    </nav>
  }
  return <section ref={start} aria-label="기업·ETF 상품 목록" className="catalog-results"><Card title="기업·ETF 상품 찾아보기">
    <Typography.Paragraph>ISA는 계좌, S&P500은 지수입니다. 같은 지수를 추종하는 실제 상품의 거래 통화와 운용사를 비교하세요.</Typography.Paragraph>
    <div className="catalog-filters"><Input.Search aria-label="저장된 기업·ETF 검색" placeholder="예: S&P500, 타이거, 엔비디아" allowClear value={text} onChange={e => setText(e.target.value)} onSearch={value => setFilters(current => ({ ...current, q: value.trim(), page: 0 }))} /><Segmented aria-label="상품 종류" value={assetClass} onChange={v => setFilters(current => ({ ...current, assetClass: String(v), page: 0 }))} options={[{ value: '', label: '전체' }, { value: 'STOCK', label: '기업' }, { value: 'ETF', label: 'ETF' }]} /><Segmented aria-label="상품 상장 국가" value={region} onChange={v => setFilters(current => ({ ...current, region: String(v), page: 0 }))} options={[{ value: '', label: '전체' }, { value: 'KR', label: '한국 상장' }, { value: 'US', label: '미국 상장' }]} /></div>
    {pager('상단')}
    {catalog.error && <Alert type="warning" message="상품 목록을 불러오지 못했습니다." description={catalog.error.message} action={<Button onClick={catalog.reload}>재시도</Button>} />}
    {catalog.loading ? <Card loading /> : data && <><p role="status">{data.total ? `${data.total.toLocaleString()}개 중 ${(page * 50 + 1).toLocaleString()}~${(page * 50 + data.items.length).toLocaleString()}개` : '검색 결과가 없습니다.'}</p><div className="company-grid">{data.items.map(({ instrument: item, price, quoteAt }) => <Card size="small" key={item.symbol} title={item.name}>
      <Space wrap><Tag>{item.region === 'KR' ? '한국 상장' : '미국 상장'}</Tag><Tag>{item.currency} 거래</Tag><Tag>{item.assetClass === 'ETF' ? item.underlyingIndex : sectors.find(s => s.id === item.sectorId)?.name ?? '분야 확인 필요'}</Tag></Space>
      <p>{item.description}</p>{item.issuer && <p>운용사 · {item.issuer}</p>}
      <p>{price != null ? `${price.toLocaleString()} ${item.currency}` : '저장된 시세가 없습니다. 상세 차트에서 확인하세요.'}</p>{quoteAt && <p>시세 기준 · {new Date(quoteAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST</p>}
      <p><a href={item.source} target="_blank" rel="noopener noreferrer">{item.assetClass === 'ETF' ? '공식 상품 설명·비용 확인' : item.sectorId === 'unclassified' ? 'KRX 상장법인 원본 다운로드' : '공식 기업 소개'} ↗</a></p><small>상품 정보 확인 · {item.verifiedAt}</small><p><Link onClick={() => rememberName(item.symbol, item.name)} to={`/stocks?symbol=${encodeURIComponent(item.symbol)}`}>가격·차트 보기 →</Link></p>
    </Card>)}</div>{!data.items.length && <Empty description="저장된 목록에 해당 상품이 없습니다. 회사 검색에서 더 찾아보세요." />}{data.items.length > 0 && pager('하단')}</>}
    <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>공식 출처를 확인한 시작 목록이며 추천 순위가 아닙니다. 최신 총비용·환헤지·분배 방식·ISA 및 연금 매수 가능 여부는 금융회사와 운용사에서 확인하세요. 거래 통화만으로 환율 위험을 판단할 수 없습니다.</Typography.Paragraph>
  </Card></section>
}
