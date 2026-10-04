// web/src/features/stocks/components/StockChart.tsx와 동일 역할 — RN엔 recharts가 없어
// react-native-gifted-charts의 LineChart(영역 채움)로 대체.
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { LineChart } from 'react-native-gifted-charts'

import { type StockChartRange } from '@/lib/api'

import { useStockHistory } from '../hooks/useStockHistory'

const CHART_COLOR = '#00754A'

interface StockChartProps {
  symbol: string
}

const RANGE_OPTIONS: { label: string; value: StockChartRange }[] = [
  { label: '하루', value: '1d' },
  { label: '일주일', value: '1wk' },
  { label: '1개월', value: '1mo' },
  { label: '3개월', value: '3mo' },
  { label: '6개월', value: '6mo' },
  { label: '5년', value: '5y' },
]

function formatLabel(timestamp: string, range: StockChartRange): string {
  const d = new Date(timestamp)
  if (range === '1d') return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  if (range === '1wk') return `${d.getMonth() + 1}/${d.getDate()}`
  if (range === '5y') return `${d.getFullYear()}`
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function StockChart({ symbol }: StockChartProps) {
  const [range, setRange] = useState<StockChartRange>('6mo')
  const { data, loading, error } = useStockHistory(symbol, range)

  const chartData = useMemo(
    () => (data?.points ?? []).map((point) => ({ value: point.close, label: formatLabel(point.timestamp, range) })),
    [data, range],
  )

  return (
    <View className="gap-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {RANGE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setRange(option.value)}
              className={`rounded-full px-3 py-1 ${range === option.value ? 'bg-brand' : 'bg-neutral-100'}`}
            >
              <Text className={`text-xs font-medium ${range === option.value ? 'text-white' : 'text-neutral-600'}`}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {loading && <ActivityIndicator className="py-8" />}
      {!loading && error && <Text className="text-xs text-red-500">{symbol} 시세를 불러오지 못했습니다.</Text>}
      {!loading && !error && chartData.length === 0 && (
        <Text className="text-xs text-neutral-400">표시할 데이터가 없습니다.</Text>
      )}
      {!loading && !error && chartData.length > 0 && (
        <LineChart
          data={chartData}
          height={220}
          color={CHART_COLOR}
          thickness={2}
          areaChart
          startFillColor={CHART_COLOR}
          startOpacity={0.25}
          endFillColor={CHART_COLOR}
          endOpacity={0}
          curved
          hideDataPoints
          yAxisTextStyle={{ fontSize: 10, color: '#737373' }}
          xAxisLabelTextStyle={{ fontSize: 10, color: '#737373' }}
          noOfSections={4}
          rulesType="dashed"
          rulesColor="#e5e5e5"
          yAxisColor="transparent"
          xAxisColor="#e5e5e5"
          initialSpacing={8}
        />
      )}
    </View>
  )
}
