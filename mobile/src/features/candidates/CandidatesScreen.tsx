import { useState } from 'react'
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { fetchPortfolio, fetchRecommendations } from '@/lib/investingApi'
import { useResource } from '@/lib/useResource'
import { accountLabels, productChecklist, riskLabels } from '../../../../shared/investing'
import { CompanyDiscovery } from './CompanyDiscovery'
import { RecommendationHistory } from './RecommendationHistory'
import { InvestmentNotice } from '@/components/InvestmentNotice'
import { briefingText } from '../../../../shared/briefing-text'

export function CandidatesScreen({ shortTerm = false, ...navigation }: { shortTerm?: boolean; onOpenStock?: (symbol: string) => void; onOpenNews?: (query: string) => void; onOpenPortfolio?: () => void; onSearchStock?: (name: string) => void }) {
  const [more, setMore] = useState(false)
  const briefing = useResource(fetchRecommendations)
  const portfolio = useResource(fetchPortfolio)
  return <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-4 p-5" refreshControl={<RefreshControl refreshing={briefing.refreshing} onRefresh={() => { void briefing.refresh(); void portfolio.reload() }} />}>
    {shortTerm && <Text accessibilityRole="header" className="text-2xl font-bold text-ink">단기 관찰</Text>}
    <CompanyDiscovery shortTerm={shortTerm} briefing={briefing.data} portfolio={portfolio.data} loading={briefing.loading} {...navigation} />
    <InvestmentNotice />
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: more }} onPress={() => setMore(!more)} className="min-h-12 justify-center"><Text className="text-primary">분석 이력·투자 조건 {more ? "접기" : "더 보기"}</Text></Pressable>
    {more && <><RecommendationHistory />
    {briefing.data?.analyzedAt && <Text className="text-sm text-muted">분석 {new Date(briefing.data.analyzedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 한국 시간 · 지표 기준 {briefing.data.sourceBriefingDate}. 추가 소식은 뉴스 메뉴에서 확인하세요.</Text>}
    {portfolio.error && <Text className="text-danger">포트폴리오: {portfolio.error}</Text>}
    {portfolio.data && <View className="gap-2 rounded-xl bg-surface border border-line p-4"><Text className="text-ink">{accountLabels[portfolio.data.accountType]} · {riskLabels[portfolio.data.riskLevel]} · {portfolio.data.horizonMonths}개월</Text>{portfolio.data.insights.map(x => <Text key={x} className="text-sm text-ink">• {x}</Text>)}</View>}
    {briefing.error && <Text className="text-danger">브리핑: {briefing.error}</Text>}
    {!briefing.loading && !briefing.data && !briefing.error && <View className="rounded-xl border border-line bg-surface p-5"><Text className="text-muted">아직 저장된 브리핑이 없습니다. 수집 후 투자 후보를 확인할 수 있습니다.</Text></View>}
    {briefing.data && <>
      <Text className="font-semibold text-ink">브리핑 기준 {briefing.data.briefingDate}</Text>
      {!!briefing.data.excludedCount && <Text className="text-sm text-muted">기업명과 근거 기사 연결이 확인되지 않은 후보 {briefing.data.excludedCount}개는 제외했습니다. 분석 원본은 보존합니다.</Text>}
      {!!briefing.data.marketSummary && <><Text className="font-semibold text-ink">선정 당시 시장 맥락</Text><Text className="text-sm leading-6 text-ink">{briefingText(briefing.data.marketSummary)}</Text></>}
      {briefing.data.news.slice(0, 5).map(n => <Pressable key={n.link} onPress={() => Linking.openURL(n.link)}><Text className="text-primary">{n.title} ↗</Text></Pressable>)}
    </>}
    {!shortTerm && <View className="gap-3 rounded-xl border border-line bg-surface p-4"><Text className="font-bold text-ink">계좌 → 투자 대상 → 실제 상품</Text><Text className="text-sm text-ink">ISA는 계좌, S&P 500은 투자 대상입니다. 실제 매수할 ETF의 구조와 비용을 비교하세요.</Text>{productChecklist.map(x => <Text key={x} className="text-sm text-ink">• {x}</Text>)}{portfolio.data?.holdings.filter(h => h.holding.assetClass === 'ETF').map(h => <Text key={h.holding.symbol} className="text-ink">{h.holding.name} · {h.holding.underlyingIndex || '지수 미입력'} · {h.holding.currency}</Text>)}</View>}
    </>}
  </ScrollView>
}
