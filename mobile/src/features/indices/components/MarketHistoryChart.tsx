import { useEffect, useState } from 'react'
import { Text, View, useWindowDimensions } from 'react-native'
import { LineChart } from 'react-native-gifted-charts'
import { ActionButton } from '@/components/ActionButton'
import { useChartSelection } from '@/lib/chartSelection'
import { LoadingState } from '@/components/LoadingState'
import { fetchBriefingHistory, type Briefing } from '@/lib/api'
import { useTheme } from '@/lib/theme'
import { marketHistoryWindow, marketMetrics, marketPoints, type MarketMetricKey } from '../../../../../shared/market-history'
import { formatPriceAxis } from '../../../../../shared/stock-price'

export function MarketHistoryChart({ metricKey }: { metricKey: MarketMetricKey }) {
  const selection = useChartSelection()
  const { colors } = useTheme(), { width } = useWindowDimensions()
  const [history, setHistory] = useState<Briefing[]>([])
  const [loading, setLoading] = useState(true), [error, setError] = useState(false), [revision, setRevision] = useState(0)
  const [days, setDays] = useState<7 | 30>(30)
  const [window] = useState(() => marketHistoryWindow(30))
  useEffect(() => {
    let active = true
    fetchBriefingHistory(window.from, window.to).then(rows => { if (active) { setHistory(rows); setError(false) } })
      .catch(() => { if (active) setError(true) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [window, revision])
  const metric = marketMetrics.find(item => item.key === metricKey)!
  const range = marketHistoryWindow(days, Date.parse(`${window.to}T00:00:00Z`))
  const points = marketPoints(history, metricKey, range.from, range.to)
  const format = (value: number) => `${value.toLocaleString('ko-KR', { maximumFractionDigits: metric.unit === '%' ? 3 : 2 })} ${metric.unit}`
  const minimum = points.length ? Math.min(...points.map(point => point.value)) : 0
  const maximum = points.length ? Math.max(...points.map(point => point.value)) : 0
  const padding = Math.max((maximum - minimum) * .15, Math.abs(maximum) * .001, .01)
  const offset = minimum - padding
  const data = points.map((point, index) => ({ value: point.value, observedValue: point.value, date: point.date, label: index === 0 || index === Math.floor(points.length / 2) || index === points.length - 1 ? point.date.slice(5).replace('-', '/') : '' }))
  return <View style={{ gap: 12 }}>
    <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{metric.label} 흐름</Text>
    <View style={{ flexDirection: 'row', gap: 8 }}>{([7,30] as const).map(value => <ActionButton key={value} label={`${value}일`} tone={days === value ? 'primary' : 'secondary'} onPress={() => setDays(value)} />)}</View>
    {loading ? <LoadingState inline message="저장된 지표를 확인하고 있어요" /> : error ? <View style={{ gap: 8 }}><Text style={{ color: colors.muted }}>이전 기록을 불러오지 못했어요.</Text><ActionButton label="다시 확인" onPress={() => { setLoading(true); setRevision(value => value + 1) }} /></View> : points.length === 0 ? <Text style={{ color: colors.muted }}>최근 {days}일에 저장된 값이 없어요.</Text> : <>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>{format(points.at(-1)!.value)}</Text>
      <Text style={{ color: colors.muted }}>{points.at(-1)!.date} 기록 · 실시간 값이 아니에요</Text>
      {points.length < 2 ? <Text style={{ color: colors.muted }}>기록이 1개예요. 더 모이면 흐름을 볼 수 있어요.</Text> : <>
        <Text style={{ color: colors.muted }}>차트를 누르면 날짜와 값이 보여요. 바깥을 누르면 표시가 닫혀요.</Text>
        <View onTouchStart={selection.onTouchStart}><LineChart key={`${metricKey}:${days}:${selection.version}`} data={data} height={180} width={Math.max(180,width-96)} adjustToWidth yAxisOffset={offset} maxValue={maximum - minimum + padding * 2} showFractionalValues roundToDigits={metric.unit === '%' ? 3 : 2} color={colors.primary} thickness={2} dataPointsColor={colors.primary} dataPointsRadius={3} noOfSections={4} formatYLabel={value=>metric.unit === '%' ? Number(value).toFixed(3) : formatPriceAxis(Number(value))} yAxisTextStyle={{ color: colors.muted, fontSize: 10 }} xAxisLabelTextStyle={{ color: colors.muted, fontSize: 10 }} rulesColor={colors.border} xAxisColor={colors.border} yAxisColor="transparent"
          pointerConfig={{ activatePointersInstantlyOnTouch: true, activatePointersOnLongPress: false, persistPointer: true, autoAdjustPointerLabelPosition: true, pointerLabelWidth: 170, pointerLabelHeight: 68, pointerColor: colors.primary, pointerStripColor: colors.muted, pointerLabelComponent: (items: { observedValue: number; date: string }[]) => items[0] ? <View style={{ padding: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}><Text style={{ color: colors.text, fontWeight: '700' }}>{format(items[0].observedValue)}</Text><Text style={{ color: colors.muted }}>{items[0].date} 기준</Text></View> : null }} /></View>
      </>}
      <Text style={{ color: colors.muted, fontSize: 12 }}>저장된 날짜만 연결해 표시해요. 수집이 없는 날짜와 값은 채우지 않아요.</Text>
      {points.length > 1 && <Text style={{ color: colors.muted, fontSize: 12 }}>세로축은 선택한 기간의 값 범위에 맞춰 보여줘요.</Text>}
    </>}
  </View>
}
