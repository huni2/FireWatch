import { useState } from 'react'
import { Alert, Button, Card, Drawer, Empty, Grid, Input, Segmented, Space, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { catalogVerifiedAt, companies, companyNews, companySector, findCompany, isRecommended, portfolioContext, qualifiedRecommendations, recommendationFor, searchCompanies, sectors, type Company, type DiscoveryBriefing } from '../../../../shared/discovery'
import type { Portfolio } from '../../../../shared/investing'
import './discovery.css'

export function CompanyDiscovery({ briefing, portfolio, loading = false, shortTerm = false }: { briefing?: DiscoveryBriefing | null; portfolio?: Portfolio | null; loading?: boolean; shortTerm?: boolean }) {
  const screens = Grid.useBreakpoint()
  const [sectorId, setSectorId] = useState('all')
  const [region, setRegion] = useState('all')
  const [query, setQuery] = useState('')
  const [onlyRecommended, setOnlyRecommended] = useState(false)
  const [selected, setSelected] = useState<Company | null>(null)
  const picks = qualifiedRecommendations(briefing)
  const visible = searchCompanies(query, sectorId, region, onlyRecommended, briefing)
  const sector = sectors.find(item => item.id === sectorId)
  const detail = selected && recommendationFor(selected, briefing)
  const news = selected ? companyNews(selected, briefing) : []
  return <Space direction="vertical" size={24} style={{ width: '100%' }}>
    <Card className="discovery-intro">
      <span className="eyebrow">{shortTerm ? 'PRE-MARKET WATCH' : 'FIND YOUR NEXT IDEA'}</span>
      <Typography.Title level={2}>분야를 이해하고, 기업을 발견하세요.</Typography.Title>
      <Typography.Paragraph type="secondary">분야 → 기업이 하는 일 → 추천 근거 → 내 보유와 비교</Typography.Paragraph>
      <Space wrap><Tag>{sectors.length}개 분야</Tag><Tag>탐색 기업 {companies.length}개</Tag><Tag color="orange">{loading ? '추천 자료 확인 중' : `근거 있는 브리핑 후보 ${picks.length}개`}</Tag>{briefing && <Tag>자료 기준 {briefing.briefingDate}</Tag>}</Space>
    </Card>
    <section aria-label="개별 종목 추천" data-tour="candidate-recommendations">
      <Typography.Title level={4}>{shortTerm ? '장전 개별 종목 관찰 후보' : '브리핑이 고른 개별 종목'}</Typography.Title>
      {loading && !picks.length ? <Typography.Paragraph type="secondary">브리핑 추천 자료를 불러오는 중이에요. 분야와 기업은 먼저 탐색할 수 있어요.</Typography.Paragraph> : picks.length ? <div className="company-grid">{picks.map(pick => {
        const company = findCompany(pick.stockName)
        return <Card key={pick.stockName} className="company-card"><Tag color="orange">AI 해석 · {briefing?.briefingDate}</Tag><Typography.Title level={4}>{company?.name ?? pick.stockName}</Typography.Title>
          <Typography.Paragraph>{pick.reason}</Typography.Paragraph><Typography.Paragraph type="secondary">확인할 위험 · {pick.risk}</Typography.Paragraph>
          {company ? <Button onClick={() => setSelected(company)}>기업과 근거 살펴보기</Button> : <Link to={`/stocks?q=${encodeURIComponent(pick.stockName)}`}>종목명으로 확인</Link>}
        </Card>
      })}</div> : <Alert type="info" showIcon message="종목별 근거가 확인된 추천을 기다리고 있어요." description="기업 탐색은 아래에서 계속할 수 있어요. 과거 추천 중 근거가 없는 기록은 추천 목록에 포함하지 않습니다." />}
    </section>
    <section aria-label="투자 분야 탐색"><Typography.Title level={4}>어떤 분야가 궁금하세요?</Typography.Title>
      <div className="sector-grid">{sectors.map(item => <button key={item.id} type="button" aria-pressed={sectorId === item.id} className={`sector-choice ${sectorId === item.id ? 'selected' : ''}`} onClick={() => setSectorId(sectorId === item.id ? 'all' : item.id)}>
        <strong>{item.name}</strong><span>{item.description}</span><small>기업 {companies.filter(company => company.sectorId === item.id).length}개 · 근거 있는 후보 {companies.filter(company => company.sectorId === item.id && isRecommended(company, briefing)).length}개</small>
      </button>)}</div>
    </section>
    <section aria-label="분야별 기업 목록">
      <div className="discovery-toolbar"><Typography.Title level={4} style={{ margin: 0 }}>{sector?.name ?? '분야별 기업'} <Typography.Text type="secondary">{visible.length}개</Typography.Text></Typography.Title><Space wrap><Button type={onlyRecommended ? 'primary' : 'default'} aria-pressed={onlyRecommended} onClick={() => setOnlyRecommended(!onlyRecommended)}>근거 있는 추천만</Button><Button onClick={() => { setSectorId('all'); setRegion('all'); setQuery(''); setOnlyRecommended(false) }}>필터 초기화</Button></Space></div>
      <Space wrap style={{ width: '100%', marginBlock: 16 }}><Input allowClear aria-label="기업과 분야 검색" placeholder="기업명·분야로 찾아보세요" value={query} onChange={event => setQuery(event.target.value)} style={{ width: 280, maxWidth: '100%' }} /><Segmented aria-label="기업 국가" value={region} onChange={value => setRegion(String(value))} options={[{ label: '전체', value: 'all' }, { label: '한국', value: 'KR' }, { label: '미국', value: 'US' }]} /></Space>
      {sector && <Card size="small" style={{ marginBottom: 16 }}><Typography.Text strong>이 분야를 볼 때 확인할 것</Typography.Text><ul>{sector.checks.map(check => <li key={check}>{check}</li>)}</ul><Link to={`/news?q=${encodeURIComponent(sector.keywords[0])}`}>이 분야 뉴스 보기</Link></Card>}
      {visible.length ? <div className="company-grid">{visible.map(company => <Card key={company.symbol} className="company-card"><Space wrap><Tag>{company.region === 'KR' ? '한국' : '미국'}</Tag><Tag>{companySector(company).name}</Tag>{isRecommended(company, briefing) && <Tag color="orange">브리핑 추천</Tag>}{portfolio?.holdings.some(row => row.holding.symbol === company.symbol) && <Tag color="blue">보유 중</Tag>}</Space><Typography.Title level={4}>{company.name}</Typography.Title><Typography.Paragraph style={{ marginTop: 12 }}>{company.description}</Typography.Paragraph><Button block onClick={() => setSelected(company)} aria-label={`${company.name} 기업 살펴보기`}>기업 살펴보기 →</Button></Card>)}</div> : <Empty description="조건에 맞는 기업이 없어요. 분야나 국가 필터를 바꿔보세요." />}
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>기업 탐색 목록은 공식 사업 소개를 바탕으로 정리한 시작 목록입니다. 전체 상장기업 목록이나 추천 순위가 아닙니다. 정보 확인 {catalogVerifiedAt}.</Typography.Paragraph>
      <Link to={`/stocks?q=${encodeURIComponent(query)}`}>이 목록 외 기업 검색하기 →</Link>
    </section>
    <Drawer title={selected ? selected.name : '기업 상세'} open={!!selected} onClose={() => setSelected(null)} width={screens.sm ? 560 : '100%'}>
      {selected && <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <section><Tag>{companySector(selected).name}</Tag><Typography.Title level={4}>어떤 일을 하는 기업인가요?</Typography.Title><Typography.Paragraph>{selected.description}</Typography.Paragraph><a href={selected.source} target="_blank" rel="noopener noreferrer">공식 사업 소개 ↗</a></section>
        <section><Typography.Title level={4}>개별 종목 추천 근거</Typography.Title>{isRecommended(selected, briefing) && detail ? <><Tag color="orange">AI 해석 · 자료 기준 {briefing?.briefingDate}</Tag><Typography.Paragraph style={{ marginTop: 12 }}>{detail.reason}</Typography.Paragraph><Typography.Text strong>확인할 위험</Typography.Text><Typography.Paragraph>{detail.risk}</Typography.Paragraph>{!detail.sourceNewsLinks.length && <Typography.Text type="secondary">직접 연결된 근거 기사는 없습니다. 제공된 시장 자료에 대한 AI 해석입니다.</Typography.Text>}</> : <Typography.Paragraph type="secondary">현재 근거가 확인된 추천 후보가 아닙니다. 기업 정보와 뉴스를 탐색할 수 있습니다.</Typography.Paragraph>}</section>
        <section><Typography.Title level={4}>내 포트폴리오와 비교</Typography.Title><Typography.Paragraph>{portfolioContext(selected, portfolio)}</Typography.Paragraph><Link to="/">내 보유 자산 확인</Link></section>
        <section><Typography.Title level={4}>관련 기사와 근거 확인</Typography.Title>{news.length ? <ul>{news.map(article => <li key={article.link}><a href={article.link} target="_blank" rel="noopener noreferrer">{article.title}</a></li>)}</ul> : <Typography.Paragraph type="secondary">저장된 브리핑에서 연결되는 기사가 없습니다.</Typography.Paragraph>}<Link to={`/news?q=${encodeURIComponent(selected.name)}`}>이 기업의 보관 뉴스 검색</Link></section>
        <Space wrap><Link to={`/stocks?symbol=${encodeURIComponent(selected.symbol)}`}><Button>차트 보기</Button></Link><Link to={`/stocks?add=${encodeURIComponent(selected.symbol)}`}><Button type="primary">관심 종목에 담기</Button></Link></Space>
      </Space>}
    </Drawer>
  </Space>
}
