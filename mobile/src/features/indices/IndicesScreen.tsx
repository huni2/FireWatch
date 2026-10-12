import { LoadingState } from '@/components/LoadingState'
import { ScreenIntro } from '@/components/ScreenIntro'
import { useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { ActionButton } from '@/components/ActionButton'

import { useLatestBriefing } from '../briefing/hooks/useLatestBriefing'
import { MetricCard } from './components/MetricCard'
import { MarketHistoryChart } from './components/MarketHistoryChart'
import { marketMetrics, type MarketMetricKey } from '../../../../shared/market-history'

export function IndicesScreen() {
  const { briefing, loading, error, reload } = useLatestBriefing()
  const [metricKey, setMetricKey] = useState<MarketMetricKey>('kospi')
  const [group, setGroup] = useState('주가지수')
  const scroll = useRef<ScrollView>(null)

  if (loading && !briefing) return <LoadingState message="시장 지표를 불러오고 있어요" />


  return (
    <ScrollView ref={scroll} className="flex-1 bg-canvas" contentContainerStyle={{ gap: 20, padding: 20, paddingBottom: 48 }}>
      <ScreenIntro eyebrow="MARKET SNAPSHOT" title="시장 지표" description="지수를 골라 저장된 날짜별 흐름을 살펴보세요." />
      {error && <View style={{ gap: 8 }}><Text className="text-muted">최신 자료를 불러오지 못했어요. 과거 기록은 아래에서 확인할 수 있어요.</Text><ActionButton label="최신 자료 다시 확인" onPress={reload} /></View>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['주가지수','환율','원자재·채권'].map(value => <ActionButton key={value} label={value} tone={group === value ? 'primary' : 'secondary'} onPress={() => { setGroup(value); setMetricKey(marketMetrics.find(item => item.group === value)!.key) }} />)}</View>
      <MarketHistoryChart metricKey={metricKey} />
      <Text className="text-sm text-muted">아래 지표를 누르면 그래프가 바뀌어요.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{marketMetrics.filter(metric => metric.group === group).map(metric => <MetricCard key={metric.key} title={`${metric.label} · ${metric.unit}`} value={briefing?.[metric.key] ?? null} precision={metric.unit === '%' ? 3 : 2} selected={metricKey === metric.key} note={briefing ? `${briefing.briefingDate} 수집 기록` : undefined} onPress={() => { setMetricKey(metric.key); scroll.current?.scrollTo({ y: 0, animated: true }) }} />)}</View>
    </ScrollView>
  )
}
