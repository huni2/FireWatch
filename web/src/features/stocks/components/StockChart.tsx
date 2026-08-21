import { useMemo, useState } from 'react'
import { Alert, Empty, Segmented, Skeleton, Typography } from 'antd'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStockHistory } from '../hooks/useStockHistory'

const CHART_COLOR = '#4F46E5'

interface StockChartProps {
  symbol: string
}

function formatLabel(timestamp: string, interval: '1d' | '1m'): string {
  const d = new Date(timestamp)
  return interval === '1m'
    ? d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Design Ref: llm-wiki/design.md §4 벤치마크 톤 — RateChart와 동일한 Area+그라디언트 스타일 재사용
export function StockChart({ symbol }: StockChartProps) {
  const [interval, setInterval] = useState<'1d' | '1m'>('1d')
  const { data, loading, error } = useStockHistory(symbol, interval)

  const chartData = useMemo(
    () => (data?.points ?? []).map((point) => ({ label: formatLabel(point.timestamp, interval), value: point.close })),
    [data, interval],
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Segmented
          size="small"
          value={interval}
          onChange={(value) => setInterval(value as '1d' | '1m')}
          options={[
            { label: '6개월', value: '1d' },
            { label: '오늘(실시간)', value: '1m' },
          ]}
        />
        {interval === '1m' && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            30초마다 자동 갱신 — 완전한 실시간 스트리밍은 아니고 짧은 지연이 있습니다.
          </Typography.Text>
        )}
      </div>

      {loading && <Skeleton active paragraph={{ rows: 4 }} />}
      {!loading && error && (
        <Alert type="error" message={`${symbol} 시세를 불러오지 못했습니다`} description={error.message} showIcon />
      )}
      {!loading && !error && chartData.length === 0 && <Empty description="표시할 데이터가 없습니다" />}
      {!loading && !error && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="stockChartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLOR} stopOpacity={0.25} />
                <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
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
      )}
    </div>
  )
}
