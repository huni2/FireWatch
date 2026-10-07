import { Alert, Button, Card, Space, Table, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { useApi } from '../../lib/useApi'
import { fetchPortfolio, fetchRecommendations } from '../../lib/investingApi'
import { accountLabels, productChecklist, riskLabels } from '../../../../shared/investing'
import { RelatedNewsCard } from '../news/components/RelatedNewsCard'
import { CompanyDiscovery } from './CompanyDiscovery'
import { RecommendationHistory } from './RecommendationHistory'

export function CandidatesPage({ shortTerm = false }: { shortTerm?: boolean }) {
  const briefing = useApi(fetchRecommendations)
  const portfolio = useApi(fetchPortfolio)
  const etfs = portfolio.data?.holdings.filter(h => h.holding.assetClass === 'ETF') ?? []
  return <Space direction="vertical" size={24} style={{ width: '100%' }}>
    <CompanyDiscovery briefing={briefing.data} portfolio={portfolio.data} loading={briefing.loading} shortTerm={shortTerm} />
    {!!briefing.data?.excludedCount && <Alert type="info" message={`기업명과 근거 기사 연결을 확인하지 못한 후보 ${briefing.data.excludedCount}개는 제외했습니다.`} description="분석 원본은 보존하며 확인되지 않은 계열사 관계를 추천 근거로 사용하지 않습니다." />}
    <Alert type="info" showIcon message={shortTerm ? '실시간 진입·청산 신호는 제공하지 않습니다.' : '후보 근거 확인 → 내 보유와 비교'} description={shortTerm ? '장전 자료로 선정된 관찰 후보입니다. 장중 뉴스와 가격 변화는 별도로 확인하세요.' : '브리핑 후보는 개별 매수 지시가 아닙니다. 보유 비중과 상품 설명을 함께 확인하세요.'} />
    {portfolio.error && <Alert type="warning" message="내 포트폴리오를 불러오지 못했습니다." action={<Button onClick={portfolio.reload}>재시도</Button>} />}
    {portfolio.data && <Card title="내 투자 조건"><Space wrap><Tag>{accountLabels[portfolio.data.accountType]}</Tag><Tag>{riskLabels[portfolio.data.riskLevel]}</Tag><Tag>{portfolio.data.horizonMonths}개월</Tag><Link to="/">포트폴리오 수정</Link></Space><ul>{portfolio.data.insights.map(x => <li key={x}>{x}</li>)}</ul></Card>}
    {briefing.error && <Alert type="warning" message="현재 브리핑 후보가 없습니다." description={briefing.error.message} action={<Button onClick={briefing.reload}>재시도</Button>} />}
    {!shortTerm && <Card title="내가 등록한 ETF 정보 비교">
      <Typography.Paragraph>직접 등록한 ETF의 추종 지수·통화·지역을 비교합니다. 전체 ETF 상품 검색이나 최신 보수 자동 비교는 제공하지 않습니다.</Typography.Paragraph><details><summary>실제 상품에서 추가로 확인할 것</summary><ul>{productChecklist.map(x => <li key={x}>{x}</li>)}</ul></details>
      <Typography.Title level={5}>내가 등록한 ETF 비교</Typography.Title>
      <Table pagination={false} scroll={{ x: 550 }} rowKey={r => r.holding.symbol} dataSource={etfs} columns={[{ title: '상품', render: (_, r) => r.holding.name }, { title: '추종 지수', render: (_, r) => r.holding.underlyingIndex || '미입력' }, { title: '거래 통화', render: (_, r) => r.holding.currency }, { title: '지역', render: (_, r) => r.holding.region }]} locale={{ emptyText: '포트폴리오에 ETF와 추종 지수를 등록하면 비교할 수 있습니다.' }} />
    </Card>}
    <RecommendationHistory />
    <RelatedNewsCard title="추천 분석에 사용한 뉴스" news={briefing.data?.news ?? []} loading={briefing.loading} />
    <Link to="/news">브리핑 이후 추가 뉴스 확인</Link>
  </Space>
}
