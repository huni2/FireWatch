import { Alert, Button, Card, Space, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { focusPortfolioContext, focusRecommendation } from '../../../../../shared/investment-focus'
import { useApi } from '../../../lib/useApi'
import { fetchPortfolio, fetchRecommendations } from '../../../lib/investingApi'

export function InvestmentContext({ symbol, name }: { symbol: string; name: string }) {
  const portfolio = useApi(fetchPortfolio)
  const report = useApi(fetchRecommendations)
  const pick = focusRecommendation(symbol, name, report.data)
  return <Card title="이 기업과 내 투자 연결">
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <section><Typography.Title level={5}>내 보유와 비교</Typography.Title>
        {portfolio.error ? <Alert type="warning" message="보유 기록을 불러오지 못했습니다." action={<Button onClick={portfolio.reload}>다시 시도</Button>} /> : <p>{portfolio.loading ? '내 보유 기록 확인 중' : focusPortfolioContext(symbol, portfolio.data)}</p>}
        <Link to="/">포트폴리오 비중·중복 점검 →</Link>
      </section>
      <section><Typography.Title level={5}>추천 이유와 확인할 위험</Typography.Title>
        {report.error ? <Alert type="warning" message="추천 분석 조회 실패" action={<Button onClick={report.reload}>다시 시도</Button>} /> : report.loading ? <p>추천 근거 확인 중</p> : pick ? <>
          <Tag color="orange">분석 자료 · {report.data?.briefingDate}</Tag><p>{pick.reason}</p><p><strong>확인할 위험</strong> · {pick.risk}</p>
          <ul>{pick.sourceNewsLinks.filter(link => /^https?:\/\//i.test(link)).map(link => report.data?.news.find(article => article.link === link)).filter(article => article != null).map(article => <li key={article.link}><a href={article.link} target="_blank" rel="noopener noreferrer">{article.title}</a></li>)}</ul>
        </> : <p>현재 근거가 확인된 추천은 없습니다. 관련 뉴스를 직접 확인해보세요.</p>}
      </section>
      <Link to="/candidates">다른 기업·분야 탐색 →</Link>
    </Space>
  </Card>
}
