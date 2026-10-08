import { Alert, Card, Progress, Typography } from 'antd'
import { portfolioCoverageText } from '../../../../shared/holding-registration'
import type { Portfolio } from '../../../../shared/investing'

export function PortfolioExposureCard({ portfolio }: { portfolio: Portfolio }) {
  const exposure = portfolio.exposure
  if (!exposure) return null
  return <Card title="분야·통화·중복 노출 점검">
    <Typography.Paragraph type="secondary">{portfolioCoverageText(portfolio)}</Typography.Paragraph>
    {!exposure.complete && <Alert type="info" message="가격·환율이 확인되지 않은 자산은 아래 비중에서 제외했어요." />}{<>
      <Typography.Title level={5}>가장 큰 보유 자산</Typography.Title>{exposure.largestHoldings.map(row => <p key={row.name}>{row.name} · {row.weightPercent}%</p>)}
      <div className="portfolio-fields"><div><Typography.Title level={5}>분야별 비중</Typography.Title>{Object.entries(exposure.sectorWeights).map(([name, value]) => <div key={name}><span>{name} · {value}%</span><Progress percent={value} showInfo={false} /></div>)}</div><div><Typography.Title level={5}>거래 통화별 비중</Typography.Title>{Object.entries(exposure.tradingCurrencyWeights).map(([name, value]) => <div key={name}><span>{name} · {value}%</span><Progress percent={value} showInfo={false} /></div>)}<p>거래 통화와 실제 환율 노출은 다릅니다. 원화로 거래하는 해외 ETF도 환율 영향을 받을 수 있습니다.</p></div></div>
      {portfolio.holdings.some(row => row.holding.currency === 'USD') && exposure.usdFxDown10ImpactKrw != null && <details><summary>환율이 달라지면? · 단순 계산 보기</summary><p>USD/KRW가 기준 환율보다 10% 낮아지고 달러 표시 매입원금이 같다면, 등록한 USD 자산의 원화 환산 원금은 {exposure.usdFxDown10ImpactKrw.toLocaleString()}원 달라집니다.</p><p>가격 변화·세금·수수료와 원화 ETF의 환노출은 포함하지 않은 가정입니다. 평가손익이나 환율 전망이 아닙니다.</p></details>}
    </>}
    <Typography.Title level={5}>같은 지수의 ETF</Typography.Title>{exposure.indexOverlaps.length ? exposure.indexOverlaps.map(row => <Alert key={row.index} type="warning" showIcon message={row.names.join(' · ')} description="같은 이름의 지수를 입력한 상품입니다. 구성 종목이 겹칠 수 있으니 상품 설명을 확인하세요." style={{ marginBottom: 8 }} />) : <p>입력된 지수명 기준으로 중복된 ETF가 없습니다. 실제 구성 종목이 겹치지 않는다는 뜻은 아닙니다.</p>}
    <Typography.Text type="secondary">ETF 구성 종목과 비중은 아직 분석하지 않습니다. 미분류·미확인 부분을 포함해 점검하세요.</Typography.Text>
  </Card>
}
