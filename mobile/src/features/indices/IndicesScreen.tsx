// web/src/features/indices/IndicesPage.tsx에 대응하는 모바일 지수 화면(APP-9) — 금/은/환율 +
// 국내외 지수·채권 현재값을 보여준다. 웹의 시계열 RateChart는 완료 기준("확인 가능")을 넘어서는
// 범위라 이번엔 뺀다 — 필요해지면 /api/briefings?from=&to= 히스토리 조회를 추가하면 됨.
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'

import { useLatestBriefing } from '../briefing/hooks/useLatestBriefing'
import { MetricCard } from './components/MetricCard'

export function IndicesScreen() {
  const { briefing, loading } = useLatestBriefing()

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    )
  }

  if (!briefing) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-center text-base text-neutral-500">오늘자 지수 데이터가 아직 없습니다</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-6 p-6">
      <View className="gap-2">
        <Text className="text-sm font-semibold text-neutral-500">금 · 은 · 환율</Text>
        <View className="flex-row flex-wrap gap-2">
          <MetricCard title="금(USD/oz)" value={briefing.goldPrice} />
          <MetricCard title="은(USD/oz)" value={briefing.silverPrice} />
          <MetricCard title="USD/KRW" value={briefing.usdKrw} />
          <MetricCard title="JPY(100)/KRW" value={briefing.jpy100Krw} />
          <MetricCard title="CNY/KRW" value={briefing.cnyKrw} />
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold text-neutral-500">국내외 지수 · 채권</Text>
        <View className="flex-row flex-wrap gap-2">
          <MetricCard title="코스피" value={briefing.kospi} />
          <MetricCard title="코스닥" value={briefing.kosdaq} />
          <MetricCard title="S&P500" value={briefing.sp500} />
          <MetricCard title="나스닥" value={briefing.nasdaq} />
          <MetricCard title="다우존스" value={briefing.dow} />
          <MetricCard title="미국채 10년물(%)" value={briefing.usBondYield10y} precision={3} />
          <MetricCard title="한국국채 10년물(%)" value={briefing.krBondYield10y} precision={3} />
        </View>
      </View>
    </ScrollView>
  )
}
