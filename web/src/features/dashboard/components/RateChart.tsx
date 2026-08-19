import { useMemo, useState } from 'react'
import { Card, Empty, Segmented, Select } from 'antd'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Briefing } from '../../../lib/api'

interface RateChartProps {
  history: Briefing[]
  loading: boolean
  period: 7 | 30
  onPeriodChange: (period: 7 | 30) => void
}

const METRICS = [
  { key: 'goldPrice', label: '금(USD/oz)' },
  { key: 'silverPrice', label: '은(USD/oz)' },
  { key: 'usdKrw', label: 'USD/KRW' },
  { key: 'jpy100Krw', label: 'JPY(100)/KRW' },
  { key: 'cnyKrw', label: 'CNY/KRW' },
] as const

type MetricKey = (typeof METRICS)[number]['key']

// Design Ref: §5.4 — 환율·금은 시계열 차트, 기간 선택(7일/30일 토글)
export function RateChart({ history, loading, period, onPeriodChange }: RateChartProps) {
  const [metric, setMetric] = useState<MetricKey>('usdKrw')

  const chartData = useMemo(
    () =>
      [...history]
        .sort((a, b) => a.briefingDate.localeCompare(b.briefingDate))
        .map((briefing) => ({
          date: briefing.briefingDate.slice(5),
          value: briefing[metric],
        })),
    [history, metric],
  )

  const hasData = chartData.some((point) => point.value != null)

  return (
    <Card
      title="시계열 차트"
      extra={
        <div style={{ display: 'flex', gap: 12 }}>
          <Select
            size="small"
            value={metric}
            onChange={setMetric}
            options={METRICS.map((m) => ({ value: m.key, label: m.label }))}
            style={{ width: 150 }}
          />
          <Segmented
            size="small"
            value={period}
            onChange={(value) => onPeriodChange(value as 7 | 30)}
            options={[
              { label: '7일', value: 7 },
              { label: '30일', value: 30 },
            ]}
          />
        </div>
      }
      loading={loading}
    >
      {hasData ? (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#1677ff" dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <Empty description="표시할 데이터가 없습니다" />
      )}
    </Card>
  )
}
