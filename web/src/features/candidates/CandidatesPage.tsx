import { Alert, Button, Card, Space, Table, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { useLatestBriefing } from '../dashboard/hooks/useLatestBriefing'
import { useApi } from '../../lib/useApi'
import { fetchPortfolio } from '../../lib/investingApi'
import { accountLabels, productChecklist, riskLabels } from '../../../../shared/investing'
import { RelatedNewsCard } from '../news/components/RelatedNewsCard'
import { CompanyDiscovery } from './CompanyDiscovery'

export function CandidatesPage({ shortTerm = false }: { shortTerm?: boolean }) {
  const briefing = useLatestBriefing()
  const portfolio = useApi(fetchPortfolio)
  const etfs = portfolio.data?.holdings.filter(h => h.holding.assetClass === 'ETF') ?? []
  return <Space direction="vertical" size={24} style={{ width: '100%' }}>
    <CompanyDiscovery briefing={briefing.data} portfolio={portfolio.data} loading={briefing.loading} shortTerm={shortTerm} />
    <Alert type="info" showIcon message={shortTerm ? '실시간 진입·청산 신호는 제공하지 않습니다.' : '후보 확인 → 상품 비교 → 내 포트폴리오에 등록'} description={shortTerm ? '장전 자료로 선정된 관찰 후보입니다. 장중 뉴스와 가격 변화는 별도로 확인하세요.' : '브리핑 후보는 개별 매수 지시가 아닙니다. 보유 비중과 상품 설명을 함께 확인하세요.'} />
    {portfolio.error && <Alert type="warning" message="내 포트폴리오를 불러오지 못했습니다." action={<Button onClick={portfolio.reload}>재시도</Button>} />}
    {portfolio.data && <Card title="내 투자 조건"><Space wrap><Tag>{accountLabels[portfolio.data.accountType]}</Tag><Tag>{riskLabels[portfolio.data.riskLevel]}</Tag><Tag>{portfolio.data.horizonMonths}개월</Tag><Link to="/">포트폴리오 수정</Link></Space><ul>{portfolio.data.insights.map(x => <li key={x}>{x}</li>)}</ul></Card>}
    {briefing.error && <Alert type="warning" message="현재 브리핑 후보가 없습니다." description={briefing.error.message} action={<Button onClick={briefing.reload}>재시도</Button>} />}
    {!shortTerm && <Card title="S&P 500은 투자 대상, ETF는 실제 상품">
      <Typography.Paragraph>같은 지수를 추종하더라도 상품 구조와 비용, 환율 영향이 다릅니다. 상품의 최신 투자설명서로 아래 항목을 확인하세요.</Typography.Paragraph>
      <ul>{productChecklist.map(x => <li key={x}>{x}</li>)}</ul>
      <Typography.Title level={5}>내가 등록한 ETF 비교</Typography.Title>
      <Table pagination={false} scroll={{ x: 550 }} rowKey={r => r.holding.symbol} dataSource={etfs} columns={[{ title: '상품', render: (_, r) => r.holding.name }, { title: '티커', render: (_, r) => r.holding.symbol }, { title: '추종 지수', render: (_, r) => r.holding.underlyingIndex || '미입력' }, { title: '거래 통화', render: (_, r) => r.holding.currency }, { title: '지역', render: (_, r) => r.holding.region }]} locale={{ emptyText: '포트폴리오에 ETF와 추종 지수를 등록하면 비교할 수 있습니다.' }} />
    </Card>}
    <RelatedNewsCard title="선정 당시 브리핑 뉴스" news={briefing.data?.news ?? []} loading={briefing.loading} />
    <Link to="/news">브리핑 이후 추가 뉴스 확인</Link>
  </Space>
}
