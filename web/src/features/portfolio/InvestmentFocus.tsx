import { articleText } from '../../../../shared/article-text'
import { Alert, Button, Card, Empty, Skeleton, Space, Tag, Typography } from 'antd'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { investmentFocus, focusRecommendation, focusPortfolioContext, focusNews } from '../../../../shared/investment-focus'
import type { Portfolio } from '../../../../shared/investing'
import { useApi } from '../../lib/useApi'
import { fetchRecommendations } from '../../lib/investingApi'
import { useSettings } from '../settings/hooks/useSettings'
import { useStockNames } from '../stocks/hooks/useStockNames'
import './investment-focus.css'

export function InvestmentFocus({ portfolio }: { portfolio: Portfolio | null }) {
  const settings = useSettings()
  const report = useApi(fetchRecommendations)
  const { names } = useStockNames()
  const rows = investmentFocus(settings.data?.watchedStocks ?? [], portfolio, names)
  const [page, setPage] = useState(0)
  const currentPage = Math.min(page, Math.max(0, Math.ceil(rows.length / 6) - 1))
  return <Card className="investment-focus" title="내 기업 점검" extra={<Link to="/stocks">관심 기업 관리</Link>}>
    <Typography.Paragraph type="secondary">관심 기업과 보유 주식의 뉴스·분석 근거를 확인하고, 내 투자 구성과 비교하세요.</Typography.Paragraph>
    {settings.error && <Alert type="warning" message="관심 기업 목록을 불러오지 못했습니다." action={<Button onClick={settings.reload}>다시 시도</Button>} />}
    {report.error && <Alert type="warning" message="추천 분석을 불러오지 못했습니다. 가격과 뉴스는 계속 확인할 수 있어요." action={<Button onClick={report.reload}>다시 시도</Button>} />}
    {settings.loading && !rows.length ? <Skeleton active paragraph={{ rows: 2 }} /> : !rows.length ? <Empty description={<span>지켜볼 회사부터 골라보세요. <Link to="/candidates">분야별 기업 탐색 →</Link></span>} /> : <div className="investment-focus-grid">
      {rows.slice(currentPage * 6, currentPage * 6 + 6).map(row => {
        const pick = report.error ? null : focusRecommendation(row.symbol, row.name, report.data)
        const news = focusNews(row.symbol, row.name, report.data)
        return <section className="investment-focus-item" key={row.symbol}>
          <Space wrap><Typography.Text strong>{row.name}</Typography.Text>{row.held && <Tag>보유</Tag>}{row.watched && <Tag>관심</Tag>}</Space>
          <p>{focusPortfolioContext(row.symbol, portfolio)}</p>
          {report.loading ? <Typography.Text type="secondary">추천 근거 확인 중</Typography.Text> : pick ? <div className="investment-focus-reason"><Tag color="orange">근거 있는 후보 · {report.data?.briefingDate}</Tag><p>{pick.reason}</p><small>확인할 위험 · {pick.risk}</small></div> : <Typography.Text type="secondary">{report.error ? '추천 분석 확인 필요' : '현재 근거가 확인된 추천은 없습니다.'}</Typography.Text>}
          {!report.loading && !report.error && !!news.length && <div><small>분석 자료에 포함된 관련 기사 · {report.data?.briefingDate}</small><ul>{news.map(article => <li key={article.link}><a href={article.link} target="_blank" rel="noopener noreferrer">{articleText(article.title)}</a></li>)}</ul></div>}
          <Space wrap className="investment-focus-actions"><Link to={`/stocks?symbol=${encodeURIComponent(row.symbol)}`}>가격·차트·근거 →</Link>{row.name !== '회사명 확인 필요' && <Link to={`/news?q=${encodeURIComponent(row.name)}`}>저장된 뉴스 →</Link>}</Space>
        </section>
      })}
    </div>}
    {rows.length > 6 && <Space wrap style={{ marginBottom: 16 }}><Button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>이전 기업</Button><Typography.Text>{currentPage * 6 + 1}–{Math.min(rows.length, currentPage * 6 + 6)} / {rows.length}개</Typography.Text><Button disabled={(currentPage + 1) * 6 >= rows.length} onClick={() => setPage(currentPage + 1)}>다음 기업</Button></Space>}
    <Typography.Text type="secondary">뉴스와 AI 해석은 참고 자료입니다. 가격 변동의 원인이나 수익을 보장하지 않습니다.</Typography.Text>
  </Card>
}
