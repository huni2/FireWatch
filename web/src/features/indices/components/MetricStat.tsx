import { Card, Statistic } from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { BRAND_GREEN, TREND_DOWN_COLOR, TREND_UP_COLOR } from '../../../lib/theme'

interface MetricStatProps {
  title: string
  value: number | null
  previousValue?: number | null
  precision?: number
  suffix?: string
  index?: number
  note?: string
}

// Design Ref: llm-wiki/design.md §3 — 수치 변경 틱 애니메이션(Framer Motion), 카드 hover.
// null은 "—"로 표시한다 — 금융 API 부분 실패 시 특정 필드만 비어있을 수 있음(ADR 0006).
export function MetricStat({ title, value, previousValue, precision = 2, suffix, index = 0, note }: MetricStatProps) {
  const diff = value != null && previousValue != null ? value - previousValue : null
  const trend: 'up' | 'down' | null = diff == null || diff === 0 ? null : diff > 0 ? 'up' : 'down'
  const trendColor = trend === 'up' ? TREND_UP_COLOR : trend === 'down' ? TREND_DOWN_COLOR : undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      style={{ height: '100%' }}
    >
      <Card
        size="small"
        className="hoverable-card"
        style={{
          // 비교값이 없어 trend가 없는 카드는 border-secondary(거의 안 보임)라 색 있는 카드 옆에서
          // "테두리가 없다"처럼 보이던 비일관성(2026-10-05 지적) — border(더 또렷한 중립색)로 교체.
          borderTop: `3px solid ${trendColor ?? 'var(--ant-color-border)'}`,
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: '16px 18px' } }}
      >
        {/* 값이 바뀔 때 카드 배경이 한 번 옅게 반짝이는 플래시 — 테마 색과 무관하게 opacity만 사용 */}
        <motion.div
          key={value}
          initial={{ opacity: 0.16 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: trendColor ?? BRAND_GREEN,
            pointerEvents: 'none',
          }}
        />
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
                  fontSize: 26,
                  fontWeight: 600,
                  letterSpacing: -0.3,
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
        {note && <small className="metric-record-note">{note}</small>}
      </Card>
    </motion.div>
  )
}
