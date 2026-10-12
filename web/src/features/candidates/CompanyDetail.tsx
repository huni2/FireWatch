import { articleText } from '../../../../shared/article-text'
import { useState } from 'react'
import { Alert, Button, Space, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { companyDefaultVerifiedAt, companySector, findCompany, portfolioContext, qualifiedRecommendations, type RecommendationReport } from '../../../../shared/discovery'
import type { Portfolio } from '../../../../shared/investing'
import { fetchSettings, updateSettings, type StockSearchResult } from '../../lib/api'
import { StockChart } from '../stocks/components/StockChart'
import { CompanyNews } from '../stocks/components/CompanyNews'
import { useSettings } from '../settings/hooks/useSettings'

export function CompanyDetail({ target, briefing, portfolio }: { target: StockSearchResult; briefing?: RecommendationReport | null; portfolio?: Portfolio | null }) {
  const { data: settings, replaceData } = useSettings()
  const company = findCompany(target.symbol)
  const pick = qualifiedRecommendations(briefing).find(p => p.stockName === target.name || findCompany(p.stockName)?.symbol === target.symbol)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  async function watch() {
    setBusy(true); setError('')
    try {
      const current = await fetchSettings()
      const removing = current.watchedStocks.includes(target.symbol)
      const saved = await updateSettings({ watchedStocks: removing ? current.watchedStocks.filter(s => s !== target.symbol) : [...current.watchedStocks, target.symbol] })
      replaceData(saved)
      setNotice(removing ? '관심 기업에서 해제했어요.' : '관심 기업에 담았어요.')
    } catch (e) { setError(e instanceof Error ? e.message : '관심 종목을 저장하지 못했습니다.') }
    finally { setBusy(false) }
  }
  return <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <StockChart key={target.symbol} symbol={target.symbol} name={target.name} showNews={false} />
    <Space wrap><Link className="ant-btn ant-btn-primary" to={`/?add=${encodeURIComponent(target.symbol)}&name=${encodeURIComponent(target.name)}`}>보유 기록 등록</Link><Button disabled={!settings} aria-pressed={settings?.watchedStocks.includes(target.symbol)} loading={busy} onClick={() => void watch()}>{settings?.watchedStocks.includes(target.symbol) ? '관심 기업 해제' : '관심 기업에 담기'}</Button></Space>
    {company && <div><Tag>{companySector(company).name}</Tag><p>{company.description}</p><a href={company.source} target="_blank" rel="noopener noreferrer">공식 기업 자료 ↗</a><p className="catalog-note">기업 정보 확인 {company.verifiedAt ?? companyDefaultVerifiedAt} · 가격 기준 시각과 달라요.</p></div>}
    {notice && <Alert type="success" message={notice} />}{error && <Alert type="error" message={error} />}
    <section><Typography.Title level={4}>추천 이유와 위험</Typography.Title>{pick ? <><Tag>분석 자료 {briefing?.briefingDate}</Tag><p>{pick.reason}</p><div className="recommendation-risk"><strong>확인할 위험</strong><p>{pick.risk}</p></div><ul>{pick.sourceNewsLinks.filter(link => /^https?:\/\//i.test(link)).map(link => briefing?.news.find(n => n.link === link)).filter(n => n != null).map(n => <li key={n.link}><a href={n.link} target="_blank" rel="noopener noreferrer">{articleText(n.title)}</a></li>)}</ul></> : <p>현재 근거가 확인된 추천 후보는 아닙니다. 가격과 관련 뉴스를 살펴볼 수 있어요.</p>}</section>
    <section><Typography.Title level={4}>내 보유와 비교</Typography.Title><p>{company ? portfolioContext(company, portfolio) : portfolio?.holdings.some(h => h.holding.symbol === target.symbol) ? '내 보유 기록에 있는 회사입니다. 보유 비중과 평가를 확인하세요.' : '현재 내 보유 기록에 등록되지 않은 회사입니다.'}</p><Link to="/">내 투자 기록 확인 →</Link></section>
    <CompanyNews name={target.name} />
  </Space>
}
