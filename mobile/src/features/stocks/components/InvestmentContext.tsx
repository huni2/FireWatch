import { Linking, Pressable, Text, View } from 'react-native'
import { useResource } from '@/lib/useResource'
import { fetchPortfolio, fetchRecommendations } from '@/lib/investingApi'
import { focusPortfolioContext, focusRecommendation } from '../../../../../shared/investment-focus'

export function InvestmentContext({ symbol, name, onOpenPortfolio }: { symbol: string; name: string; onOpenPortfolio?: () => void }) {
  const portfolio = useResource(fetchPortfolio)
  const report = useResource(fetchRecommendations)
  const pick = focusRecommendation(symbol, name, report.data)
  return <View className="gap-3 rounded-xl border border-line bg-surface p-4">
    <Text className="text-lg font-semibold text-ink">이 기업과 내 투자 연결</Text>
    <Text className="font-semibold text-ink">내 보유와 비교</Text>
    {portfolio.error ? <Pressable accessibilityRole="button" onPress={portfolio.reload}><Text className="text-brand">보유 기록 조회 실패 · 다시 시도</Text></Pressable> : <Text className="text-sm text-ink">{portfolio.loading ? '보유 기록 확인 중' : focusPortfolioContext(symbol, portfolio.data)}</Text>}
    {onOpenPortfolio && <Pressable accessibilityRole="button" onPress={onOpenPortfolio} className="min-h-11 justify-center"><Text className="text-brand">포트폴리오 비중·중복 점검 →</Text></Pressable>}
    <Text className="font-semibold text-ink">추천 이유와 확인할 위험</Text>
    {report.error ? <Pressable accessibilityRole="button" onPress={report.reload}><Text className="text-brand">추천 분석 조회 실패 · 다시 시도</Text></Pressable> : report.loading ? <Text className="text-muted">추천 근거 확인 중</Text> : pick ? <>
      <Text className="text-xs text-brand">분석 자료 · {report.data?.briefingDate}</Text><Text className="text-sm text-ink">{pick.reason}</Text><Text className="text-sm text-muted">확인할 위험 · {pick.risk}</Text>
      {pick.sourceNewsLinks.filter(link => /^https?:\/\//i.test(link)).map(link => report.data?.news.find(article => article.link === link)).filter(article => article != null).map(article => <Pressable accessibilityRole="link" key={article.link} onPress={() => Linking.openURL(article.link)} className="min-h-11 justify-center"><Text className="text-brand">{article.title} ↗</Text></Pressable>)}
    </> : <Text className="text-sm text-muted">현재 근거가 확인된 추천은 없습니다. 관련 뉴스를 직접 확인해보세요.</Text>}
  </View>
}
