import { useMemo } from 'react'
import { Alert, Empty, Skeleton } from 'antd'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStockHistory } from '../hooks/useStockHistory'

const CHART_COLOR = '#4F46E5'

interface StockChartProps {
  symbol: string
}

// Design Ref: llm-wiki/design.md §4 벤치마크 톤 — RateChart와 동일한 Area+그라디언트 스타일 재사용
export function StockChart({ symbol }: StockChartProps) {
  const { data, loading, error } = useStockHistory(symbol)

  const chartData = useMemo(
    () => (data?.points ?? []).map((point) => ({ date: point.date.slice(5), value: point.close })),
    [data],
  )

  if (loading) {
    return <Skeleton active paragraph={{ rows: 4 }} />
  }

  if (error) {
    return <Alert type="error" message={`${symbol} 시세를 불러오지 못했습니다`} description={error.message} showIcon />
  }

  if (chartData.length === 0) {
    return <Empty description="표시할 데이터가 없습니다" />
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="stockChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLOR} stopOpacity={0.25} />
            <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
        <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={60} />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={CHART_COLOR}
          strokeWidth={2}
          fill="url(#stockChartFill)"
          dot={false}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
