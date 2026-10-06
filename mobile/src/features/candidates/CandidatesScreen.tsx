import { ScreenIntro } from '@/components/ScreenIntro'
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { fetchLatestBriefing } from '@/lib/api'
import { fetchPortfolio } from '@/lib/investingApi'
import { useResource } from '@/lib/useResource'
import { accountLabels, productChecklist, riskLabels } from '../../../../shared/investing'
import { CompanyDiscovery } from './CompanyDiscovery'

export function CandidatesScreen({ shortTerm = false, ...navigation }: { shortTerm?: boolean; onOpenStock?: (symbol: string) => void; onOpenNews?: (query: string) => void; onOpenPortfolio?: () => void; onSearchStock?: (name: string) => void }) {
  const briefing = useResource(fetchLatestBriefing)
  const portfolio = useResource(fetchPortfolio)
  return <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-4 p-5" refreshControl={<RefreshControl refreshing={briefing.loading} onRefresh={() => { void briefing.reload(); void portfolio.reload() }} />}>
    <ScreenIntro eyebrow={shortTerm ? "PRE-MARKET WATCH" : "INVESTMENT CANDIDATES"} title={shortTerm ? "단기 투자 후보" : "투자 발견 · 분야와 기업"} description="분야별 기업을 살펴보고 추천 이유와 내 보유 자산을 함께 비교하세요." />
    <CompanyDiscovery briefing={briefing.data} portfolio={portfolio.data} loading={briefing.loading} {...navigation} />
    {portfolio.error && <Text className="text-red-600">포트폴리오: {portfolio.error}</Text>}
    {portfolio.data && <View className="gap-2 rounded-xl bg-surface border border-line p-4"><Text>{accountLabels[portfolio.data.accountType]} · {riskLabels[portfolio.data.riskLevel]} · {portfolio.data.horizonMonths}개월</Text>{portfolio.data.insights.map(x => <Text key={x} className="text-sm">• {x}</Text>)}</View>}
    {briefing.error && <Text className="text-red-600">브리핑: {briefing.error}</Text>}
    {briefing.loading && <ActivityIndicator accessibilityLabel="후보 불러오는 중" />}
    {!briefing.loading && !briefing.data && !briefing.error && <View className="rounded-xl border border-line bg-surface p-5"><Text className="text-muted">아직 저장된 브리핑이 없습니다. 수집 후 투자 후보를 확인할 수 있습니다.</Text></View>}
    {briefing.data && <>
      <Text className="font-semibold">브리핑 기준 {briefing.data.briefingDate}</Text>
      <Text className="font-semibold">선정 당시 시장 맥락</Text><Text className="text-sm leading-6">{briefing.data.marketSummary}</Text>
      {briefing.data.news.slice(0, 5).map(n => <Pressable key={n.link} onPress={() => Linking.openURL(n.link)}><Text className="text-brand">{n.title} ↗</Text></Pressable>)}
    </>}
    {!shortTerm && <View className="gap-3 rounded-xl border border-line bg-surface p-4"><Text className="font-bold">계좌 → 투자 대상 → 실제 상품</Text><Text className="text-sm">ISA는 계좌, S&P 500은 투자 대상입니다. 실제 매수할 ETF의 구조와 비용을 비교하세요.</Text>{productChecklist.map(x => <Text key={x} className="text-sm">• {x}</Text>)}{portfolio.data?.holdings.filter(h => h.holding.assetClass === 'ETF').map(h => <Text key={h.holding.symbol}>{h.holding.name} · {h.holding.underlyingIndex || '지수 미입력'} · {h.holding.currency}</Text>)}</View>}
  </ScrollView>
}
