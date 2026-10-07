import { Text, View } from 'react-native'
import type { Portfolio } from '../../../../shared/investing'

export function PortfolioExposureCard({ portfolio }: { portfolio: Portfolio }) {
  const exposure = portfolio.exposure
  if (!exposure) return null
  return <View className="gap-3 rounded-xl border border-line bg-surface p-4">
    <Text className="text-lg font-bold text-ink">분야·통화·중복 노출 점검</Text><Text className="text-xs text-muted">현금 포함 매입원금 기준 · 외화 원금은 기준 환율로 환산하며 과거 환전 원가와 다를 수 있습니다.</Text>
    {!exposure.complete ? <Text className="text-muted">환율 자료가 없어 전체 비중을 계산하지 않았습니다.</Text> : <>
      <Text className="font-bold text-ink">가장 큰 보유 자산</Text>{exposure.largestHoldings.map(row => <Text key={row.name} className="text-muted">{row.name} · {row.weightPercent}%</Text>)}
      <Text className="font-bold text-ink">분야별 비중</Text>{Object.entries(exposure.sectorWeights).map(([name, weight]) => <Text key={name} className="text-muted">{name} · {weight}%</Text>)}
      <Text className="font-bold text-ink">거래 통화별 비중</Text>{Object.entries(exposure.tradingCurrencyWeights).map(([name, weight]) => <Text key={name} className="text-muted">{name} · {weight}%</Text>)}
      <Text className="text-xs text-muted">거래 통화와 실제 환율 노출은 다릅니다. 원화 해외 ETF도 환율 영향을 받을 수 있습니다.</Text>
      {portfolio.holdings.some(row => row.holding.currency === 'USD') && exposure.usdFxDown10ImpactKrw != null && <Text className="text-xs text-muted">단순 가정: USD/KRW가 10% 낮아지고 달러 표시 원금이 같으면 USD 자산의 원화 환산 원금은 {exposure.usdFxDown10ImpactKrw.toLocaleString()}원 달라집니다. 가격 변화·세금·수수료·원화 ETF 환노출은 미포함이며 평가손익·환율 전망이 아닙니다.</Text>}
    </>}
    <Text className="font-bold text-ink">같은 지수의 ETF</Text>{exposure.indexOverlaps.length ? exposure.indexOverlaps.map(row => <Text key={row.index} className="text-muted">{row.names.join(' · ')}: 같은 이름의 지수를 입력했습니다. 구성 종목이 겹칠 수 있으니 상품 설명을 확인하세요.</Text>) : <Text className="text-muted">입력 지수명 기준 중복 ETF 없음 · 실제 구성 종목 중복은 별도 확인</Text>}
    <Text className="text-xs text-muted">ETF 구성 종목과 비중은 아직 분석하지 않습니다. 미분류·미확인 부분도 점검하세요.</Text>
  </View>
}
