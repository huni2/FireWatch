import { useRef, useState } from 'react'
import { Alert, Button, Card, Drawer, Empty, Grid, Input, Modal, Segmented, Space, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { catalogVerifiedAt, companies, companySector, findCompany, isRecommended, qualifiedRecommendations, searchCompanies, sectors, type RecommendationReport } from '../../../../shared/discovery'
import type { Portfolio } from '../../../../shared/investing'
import { searchStocks, type StockSearchResult } from '../../lib/api'
import { StockSearchInput } from '../stocks/components/StockSearchInput'
import { CompanyDetail } from './CompanyDetail'
import './discovery.css'

export function CompanyDiscovery({ briefing, portfolio, loading = false, shortTerm = false }: { briefing?: RecommendationReport | null; portfolio?: Portfolio | null; loading?: boolean; shortTerm?: boolean }) {
  const screens = Grid.useBreakpoint()
  const [view, setView] = useState('picks')
  const [sectorId, setSectorId] = useState('all')
  const [region, setRegion] = useState('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<StockSearchResult | null>(null)
  const [choices, setChoices] = useState<StockSearchResult[] | null>(null)
  const [lookup, setLookup] = useState('')
  const [lookupError, setLookupError] = useState('')
  const generation = useRef(0)
  const picks = qualifiedRecommendations(briefing)
  const visible = searchCompanies(query, sectorId, region, false, briefing)
  const sector = sectors.find(item => item.id === sectorId)
  function select(target: StockSearchResult) { generation.current++; setSelected(target); setChoices(null); setLookup('') }
  async function open(name: string) {
    const company = findCompany(name)
    if (company) { select({ symbol: company.symbol, name: company.name, exchange: company.region }); return }
    const id = ++generation.current
    setLookup(name); setLookupError('')
    try {
      const results = await searchStocks(name)
      if (id !== generation.current) return
      if (results.length === 1) select(results[0]); else setChoices(results)
    } catch (e) { if (id === generation.current) setLookupError(e instanceof Error ? e.message : '회사를 찾지 못했습니다.') }
    finally { if (id === generation.current) setLookup('') }
  }
  const detail = selected && <CompanyDetail key={selected.symbol} target={selected} briefing={briefing} portfolio={portfolio} />
  return <div className="discovery-page">
    <header className="compact-intro discovery-intro"><Typography.Title level={2}>{shortTerm ? '단기 관찰 후보' : '기업과 투자 근거를 탐색하세요.'}</Typography.Title><p>{shortTerm ? '일반 후보 분석을 바탕으로 가격·뉴스·위험을 관찰합니다. 실시간 진입·청산 신호는 제공하지 않아요.' : '회사 가격·차트·뉴스를 확인하고 내 보유와 비교하세요.'}</p></header>
    <div className="discovery-search"><label>회사 이름으로 찾기<StockSearchInput onSelect={(symbol, name) => select({ symbol, name: name || '회사', exchange: null })} /></label><Segmented aria-label="기업 탐색 보기" value={view} onChange={v => setView(String(v))} options={[{ value: 'picks', label: '추천 후보' }, { value: 'companies', label: '분야별 기업' }]} /></div>
    {briefing && <div className="data-status-line"><div><strong>분석 자료 기준 · {briefing.sourceBriefingDate ?? briefing.briefingDate}</strong><span>{briefing.analyzedAt ? '분석 ' + new Date(briefing.analyzedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) + ' KST' : '분석 시각 확인 필요'}</span></div><Link to="/news">이후 뉴스 확인 →</Link></div>}
    {lookupError && <Alert type="error" message={lookupError} />}
    <div className={`discovery-layout ${selected ? 'has-detail' : ''}`}><div className="discovery-results">
      {view === 'picks' ? <section aria-label="개별 종목 추천" data-tour="candidate-recommendations"><Typography.Title level={4}>{shortTerm ? '관찰할 후보' : '근거가 확인된 후보'} · {picks.length}개</Typography.Title>
        {loading && !picks.length ? <p>추천 자료를 확인 중입니다. 회사 검색과 분야 탐색은 이용할 수 있어요.</p> : picks.length ? <div className={`company-grid ${picks.length === 1 ? 'single-pick' : ''}`}>{picks.map(pick => <Card key={pick.stockName} className="company-card"><Tag color="orange">AI 해석 · {briefing?.briefingDate}</Tag><Typography.Title level={4}>{pick.stockName}</Typography.Title><p>{pick.reason}</p><div className="recommendation-risk"><strong>확인할 위험</strong><p>{pick.risk}</p></div><details className="recommendation-evidence"><summary>근거 기사 확인</summary><ul>{pick.sourceNewsLinks.filter(link => /^https?:\/\//i.test(link)).map(link => briefing?.news.find(n => n.link === link)).filter(n => n != null).map(n => <li key={n.link}><a href={n.link} target="_blank" rel="noopener noreferrer">{n.title}</a></li>)}</ul></details><Button type="primary" loading={lookup === pick.stockName} onClick={() => void open(pick.stockName)}>가격·차트·근거 보기</Button></Card>)}</div> : <Alert type="info" message="근거가 확인된 추천을 기다리고 있어요." description="분야별 기업 또는 회사 이름 검색으로 탐색을 계속할 수 있습니다." />}
      </section> : <section aria-label="분야별 기업 목록"><div className="sector-chips" aria-label="투자 분야 탐색"><Button aria-pressed={sectorId === 'all'} type={sectorId === 'all' ? 'primary' : 'default'} onClick={() => setSectorId('all')}>전체 분야</Button>{sectors.map(s => <Button key={s.id} aria-pressed={sectorId === s.id} type={sectorId === s.id ? 'primary' : 'default'} onClick={() => setSectorId(s.id)}>{s.name}</Button>)}</div><div className="discovery-toolbar"><Input aria-label="기업과 분야 검색" placeholder="시작 목록에서 기업·분야 찾기" allowClear value={query} onChange={e => setQuery(e.target.value)} /><Segmented aria-label="기업 국가" value={region} onChange={v => setRegion(String(v))} options={[{ label: '전체', value: 'all' }, { label: '한국', value: 'KR' }, { label: '미국', value: 'US' }]} /><Button onClick={() => { setSectorId('all'); setQuery(''); setRegion('all') }}>필터 초기화</Button></div>
        {sector && <details className="sector-notes"><summary>{sector.name} · 확인할 것</summary><p>{sector.description}</p><ul>{sector.checks.map(c => <li key={c}>{c}</li>)}</ul><Link to={`/news?q=${encodeURIComponent(sector.keywords[0])}`}>분야 뉴스 보기 →</Link></details>}
        <Typography.Title level={4}>분야별 기업 · {visible.length}개</Typography.Title>{visible.length ? <div className="company-list">{visible.map(company => <button type="button" className="company-row" key={company.symbol} aria-label={`${company.name} 기업 살펴보기`} aria-pressed={selected?.symbol === company.symbol} onClick={() => void open(company.name)}><span><strong>{company.name}</strong><small>{companySector(company).name} · {company.region === 'KR' ? '한국' : '미국'}{isRecommended(company, briefing) ? ' · 추천 근거 있음' : ''}{portfolio?.holdings.some(h => h.holding.symbol === company.symbol) ? ' · 보유 중' : ''}</small></span><span aria-hidden="true">상세 →</span></button>)}</div> : <Empty description="시작 목록에 해당 기업이 없습니다. 위 회사 검색에서 전체 종목을 찾아보세요." />}
        <p className="catalog-note">분야별 {companies.length}개 기업의 시작 목록입니다. 전체 상장기업이나 추천 순위가 아닙니다. 정보 확인 {catalogVerifiedAt}.</p>
      </section>}
    </div>{screens.lg && selected && <aside className="company-detail-pane" aria-label={`${selected.name} 기업 상세`}><div className="discovery-toolbar"><strong>{selected.name}</strong><Button onClick={() => setSelected(null)}>상세 닫기</Button></div>{detail}</aside>}</div>
    <Drawer title={selected?.name ?? '기업 상세'} open={!!selected && !screens.lg} onClose={() => setSelected(null)} width={screens.sm ? 'min(720px, 100vw)' : '100%'}>{!screens.lg && detail}</Drawer>
    <Modal title="동일 이름의 기업을 확인하세요" open={choices != null} onCancel={() => { generation.current++; setChoices(null) }} footer={<Button onClick={() => { generation.current++; setChoices(null) }}>닫기</Button>}>{choices?.length ? <Space direction="vertical" style={{ width: '100%' }}>{choices.map(c => <Button key={c.symbol} block onClick={() => select(c)}>{c.name} · {c.exchange}</Button>)}</Space> : <p>검색 결과가 없습니다. 위 검색에서 다른 이름으로 찾아보세요.</p>}</Modal>
  </div>
}
