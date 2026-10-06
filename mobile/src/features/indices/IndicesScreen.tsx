import { ScreenIntro } from '@/components/ScreenIntro'
// web/src/features/indices/IndicesPage.tsx에 대응하는 모바일 지수 화면(APP-9) — 금/은/환율 +
// 국내외 지수·채권 현재값을 보여준다. 웹의 시계열 RateChart는 완료 기준("확인 가능")을 넘어서는
// 범위라 이번엔 뺀다 — 필요해지면 /api/briefings?from=&to= 히스토리 조회를 추가하면 됨.
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'

import { useLatestBriefing } from '../briefing/hooks/useLatestBriefing'
import { MetricCard } from './components/MetricCard'

export function IndicesScreen() {
  const { briefing, loading, error, reload } = useLatestBriefing()

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator />
      </View>
    )
  }

  if (!briefing) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas p-6">
        <Text className="text-center text-base text-muted">{error ?? '저장된 지수 데이터가 아직 없습니다.'}</Text>
        <Pressable accessibilityRole="button" onPress={reload} className="mt-4 min-h-11 justify-center rounded-xl bg-brand px-5"><Text className="text-white">다시 확인</Text></Pressable>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-5 p-5 pb-10">
      <ScreenIntro eyebrow="MARKET SNAPSHOT" title="시장 지표" description="장후에 저장한 지수·원자재·환율을 비교하세요." />
      <Text className="text-xs text-muted">자료 기준 {briefing.briefingDate} · 실시간 시세가 아닙니다.</Text>
      <View className="gap-2">
        <Text className="text-sm font-semibold text-muted">금 · 은 · 환율</Text>
        <View className="flex-row flex-wrap gap-2">
          <MetricCard title="금(USD/oz)" value={briefing.goldPrice} />
          <MetricCard title="은(USD/oz)" value={briefing.silverPrice} />
          <MetricCard title="USD/KRW" value={briefing.usdKrw} />
          <MetricCard title="JPY(100)/KRW" value={briefing.jpy100Krw} />
          <MetricCard title="CNY/KRW" value={briefing.cnyKrw} />
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold text-muted">국내외 지수 · 채권</Text>
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
