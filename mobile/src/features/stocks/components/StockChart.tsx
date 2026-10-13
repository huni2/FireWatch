import { useTheme } from '@/lib/theme'
import { LoadingState } from '@/components/LoadingState'
import { useChartSelection } from '@/lib/chartSelection'
// web/src/features/stocks/components/StockChart.tsx와 동일 역할 — RN엔 recharts가 없어
// react-native-gifted-charts의 LineChart(영역 채움)로 대체.
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import { LineChart } from 'react-native-gifted-charts'

import { type StockChartRange } from '@/lib/api'

import { useStockHistory } from '../hooks/useStockHistory'
import { stockLabel } from '../../../../../shared/stock-labels'
import { formatPriceAxis, formatStockPrice } from '../../../../../shared/stock-price'
import { CompanyNews } from './CompanyNews'


interface StockChartProps {
  symbol: string
  name?: string
  showNews?: boolean
  onNameFound?: (symbol: string, name: string) => void
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

export function StockChart({ symbol, name = stockLabel(symbol), onNameFound, showNews = true }: StockChartProps) {
  const selection = useChartSelection()
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const [range, setRange] = useState<StockChartRange>('6mo')
  const { data, loading, error } = useStockHistory(symbol, range)
  const currentData = data?.symbol === symbol ? data : null
  const companyName = name === '회사명 확인 필요' ? currentData?.companyName ?? name : name
  const latest = currentData?.points.at(-1)
  const price = currentData?.quotePrice ?? latest?.close
  const priceAt = currentData?.quotePrice != null ? currentData.quoteAt : latest?.timestamp
  const currency = currentData?.currency ?? (/\.K[QS]$/.test(symbol) ? 'KRW' : null)
  useEffect(() => {
    if (name === '회사명 확인 필요' && currentData?.companyName) onNameFound?.(symbol, currentData.companyName)
  }, [name, currentData?.companyName, symbol, onNameFound])

  const chartData = useMemo(
    () => (data?.points ?? []).map((point, index, points) => ({ value: point.close, timestamp: point.timestamp, label: formatLabel(point.timestamp, range), spacing: index === points.length - 1 ? 0 : undefined })),
    [data, range],
  )

  return (
    <View className="gap-3">
      <Text className="text-xl font-bold text-ink">{companyName}</Text>
      {price != null && !error && <View className="gap-1">
        <Text className="text-3xl font-bold text-ink">{formatStockPrice(price, currency)}</Text>
        <Text className="text-xs text-muted">{currentData?.quotePrice != null ? '최근 제공 시세' : '마지막 기록 가격'}{priceAt ? ` · ${new Date(priceAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (한국 시간)` : ''}</Text>
      </View>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {RANGE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setRange(option.value)}
              className={`min-h-11 justify-center rounded-xl px-4 py-3 ${range === option.value ? 'bg-selection' : 'bg-canvas'}`}
            >
              <Text className={`text-xs font-medium ${range === option.value ? 'text-onselection' : 'text-muted'}`}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {loading && <LoadingState inline message="가격 흐름을 불러오고 있어요" />}
      {!loading && error && <Text className="text-xs text-danger">{companyName} 시세를 불러오지 못했습니다.</Text>}
      {!loading && !error && chartData.length === 0 && (
        <Text className="text-xs text-muted">표시할 데이터가 없습니다.</Text>
      )}
      {!loading && !error && chartData.length > 0 && (
        <><Text className="text-xs text-muted">차트를 누르면 가격이 보여요. 바깥을 누르면 표시가 닫혀요.</Text><View onTouchStart={selection.onTouchStart}><LineChart
          key={`${symbol}:${range}:${selection.version}`}
          data={chartData}
          pointerConfig={{ activatePointersInstantlyOnTouch: true, activatePointersOnLongPress: false, persistPointer: true, autoAdjustPointerLabelPosition: true, pointerColor: colors.accent, pointerStripColor: colors.muted, pointerLabelWidth: 150, pointerLabelHeight: 90, pointerLabelComponent: (items: { value: number; timestamp: string }[]) => items[0] ? <View style={{ width: 150, padding: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}><Text style={{ color: colors.text, fontWeight: '700' }}>{formatStockPrice(items[0].value, currency)}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{new Date(items[0].timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST</Text></View> : null }}
          height={220}
          width={Math.max(220, width - 96)}
          adjustToWidth
          spacing={(Math.max(220, width - 96) - 32) / Math.max(chartData.length - 1, 1)}
          endSpacing={24}
          color={colors.accent}
          thickness={2}
          areaChart
          startFillColor={colors.accent}
          startOpacity={0.25}
          endFillColor={colors.accent}
          endOpacity={0}
          curved
          hideDataPoints
          formatYLabel={value => formatPriceAxis(Number(value))}
          yAxisTextStyle={{ fontSize: 10, color: colors.muted }}
          xAxisLabelTextStyle={{ fontSize: 10, color: colors.muted }}
          noOfSections={4}
          rulesType="dashed"
          rulesColor={colors.border}
          yAxisColor="transparent"
          xAxisColor={colors.border}
          initialSpacing={8}
        /></View></>
      )}
      {showNews && companyName !== '회사명 확인 필요' && <CompanyNews key={companyName} name={companyName} />}
    </View>
  )
}
