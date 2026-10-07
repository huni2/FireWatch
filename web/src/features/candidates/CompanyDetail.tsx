import { useState } from 'react'
import { Alert, Button, Space, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { companySector, findCompany, portfolioContext, qualifiedRecommendations, type RecommendationReport } from '../../../../shared/discovery'
import type { Portfolio } from '../../../../shared/investing'
import { fetchSettings, updateSettings, type StockSearchResult } from '../../lib/api'
import { StockChart } from '../stocks/components/StockChart'
import { CompanyNews } from '../stocks/components/CompanyNews'

export function CompanyDetail({ target, briefing, portfolio }: { target: StockSearchResult; briefing?: RecommendationReport | null; portfolio?: Portfolio | null }) {
  const company = findCompany(target.symbol)
  const pick = qualifiedRecommendations(briefing).find(p => p.stockName === target.name || findCompany(p.stockName)?.symbol === target.symbol)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  async function watch() {
    setBusy(true); setError('')
    try {
      const settings = await fetchSettings()
      if (!settings.watchedStocks.includes(target.symbol)) await updateSettings({ watchedStocks: [...settings.watchedStocks, target.symbol] })
      setNotice('관심 종목에 저장했습니다.')
    } catch (e) { setError(e instanceof Error ? e.message : '관심 종목을 저장하지 못했습니다.') }
    finally { setBusy(false) }
  }
  return <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <StockChart key={target.symbol} symbol={target.symbol} name={target.name} showNews={false} />
    <Button type="primary" loading={busy} onClick={() => void watch()}>관심 종목에 담기</Button>
    {company && <div><Tag>{companySector(company).name}</Tag><p>{company.description}</p><a href={company.source} target="_blank" rel="noopener noreferrer">공식 사업 소개 ↗</a></div>}
    {notice && <Alert type="success" message={notice} />}{error && <Alert type="error" message={error} />}
    <section><Typography.Title level={4}>추천 이유와 위험</Typography.Title>{pick ? <><Tag>분석 자료 {briefing?.briefingDate}</Tag><p>{pick.reason}</p><div className="recommendation-risk"><strong>확인할 위험</strong><p>{pick.risk}</p></div><ul>{pick.sourceNewsLinks.filter(link => /^https?:\/\//i.test(link)).map(link => briefing?.news.find(n => n.link === link)).filter(n => n != null).map(n => <li key={n.link}><a href={n.link} target="_blank" rel="noopener noreferrer">{n.title}</a></li>)}</ul></> : <p>현재 근거가 확인된 추천 후보는 아닙니다. 가격과 관련 뉴스를 살펴볼 수 있어요.</p>}</section>
    <section><Typography.Title level={4}>내 보유와 비교</Typography.Title><p>{company ? portfolioContext(company, portfolio) : portfolio?.holdings.some(h => h.holding.symbol === target.symbol) ? '내 보유 기록에 있는 회사입니다. 보유 비중과 평가를 확인하세요.' : '현재 내 보유 기록에 등록되지 않은 회사입니다.'}</p><Link to="/">내 투자 기록 확인 →</Link></section>
    <CompanyNews name={target.name} />
  </Space>
}
