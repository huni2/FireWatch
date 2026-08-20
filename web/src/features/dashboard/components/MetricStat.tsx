import { Card, Statistic } from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { TREND_DOWN_COLOR, TREND_UP_COLOR } from '../../../lib/theme'

interface MetricStatProps {
  title: string
  value: number | null
  previousValue?: number | null
  precision?: number
  suffix?: string
}

// Design Ref: llm-wiki/design.md §3 — 수치 변경 틱 애니메이션(Framer Motion).
// null은 "—"로 표시한다 — 금융 API 부분 실패 시 특정 필드만 비어있을 수 있음(ADR 0006).
export function MetricStat({ title, value, previousValue, precision = 2, suffix }: MetricStatProps) {
  const diff = value != null && previousValue != null ? value - previousValue : null
  const trend: 'up' | 'down' | null = diff == null || diff === 0 ? null : diff > 0 ? 'up' : 'down'
  const trendColor = trend === 'up' ? TREND_UP_COLOR : trend === 'down' ? TREND_DOWN_COLOR : undefined

  return (
    <Card
      size="small"
      style={{
        borderTop: `3px solid ${trendColor ?? 'var(--ant-color-border-secondary)'}`,
        height: '100%',
      }}
      styles={{ body: { padding: '16px 18px' } }}
    >
      <Statistic
        title={<span style={{ fontSize: 13, fontWeight: 500 }}>{title}</span>}
        value={value ?? 0}
        formatter={() => {
          if (value == null) {
            return <span style={{ color: 'var(--ant-color-text-quaternary)' }}>—</span>
          }
          const formatted = new Intl.NumberFormat('ko-KR', {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision,
          }).format(value)
          return (
            <motion.span
              key={value}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 22,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: trendColor,
              }}
            >
              {trend === 'up' && <ArrowUpOutlined style={{ fontSize: 15 }} />}
              {trend === 'down' && <ArrowDownOutlined style={{ fontSize: 15 }} />}
              {formatted}
              {suffix}
            </motion.span>
          )
        }}
      />
    </Card>
  )
}
