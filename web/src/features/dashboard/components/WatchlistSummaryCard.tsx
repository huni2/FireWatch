import { Card, Empty, Skeleton, Typography } from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { TREND_DOWN_COLOR, TREND_UP_COLOR } from '../../../lib/theme'
import { useWatchlistSummary } from '../hooks/useWatchlistSummary'

// 2026-08-21 사용자 요청 — "대시보드는 한눈에 요약되는 게 맞지 않냐" — 종목 화면을 매번 들어가지 않아도
// 관심 종목의 최근 등락을 대시보드에서 바로 보고, 클릭하면 해당 종목 차트로 이동한다.
export function WatchlistSummaryCard() {
  const { data, loading } = useWatchlistSummary()

  if (loading) {
    return (
      <Card title="관심 종목">
        <Skeleton active paragraph={{ rows: 2 }} />
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="hoverable-card" title="관심 종목">
        <Empty description={<Link to="/stocks">종목 화면에서 관심 종목을 등록해보세요</Link>} />
      </Card>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
      <Card className="hoverable-card" title="관심 종목">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {data.map((item) => {
            const diff = item.latest != null && item.previous != null ? item.latest - item.previous : null
            const trend: 'up' | 'down' | null = diff == null || diff === 0 ? null : diff > 0 ? 'up' : 'down'
            const trendColor = trend === 'up' ? TREND_UP_COLOR : trend === 'down' ? TREND_DOWN_COLOR : undefined
            const changePct =
              diff != null && item.previous ? ((diff / item.previous) * 100).toFixed(2) : null

            return (
              <Link
                key={item.symbol}
                to={`/stocks?symbol=${encodeURIComponent(item.symbol)}`}
                style={{
                  display: 'block',
                  minWidth: 140,
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: `1px solid ${trendColor ?? 'var(--ant-color-border-secondary)'}`,
                  color: 'inherit',
                }}
              >
                <Typography.Text strong style={{ display: 'block', fontSize: 13 }}>
                  {item.symbol}
                </Typography.Text>
                {item.latest == null ? (
                  <Typography.Text type="secondary">—</Typography.Text>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 16,
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      color: trendColor,
                    }}
                  >
                    {trend === 'up' && <ArrowUpOutlined style={{ fontSize: 12 }} />}
                    {trend === 'down' && <ArrowDownOutlined style={{ fontSize: 12 }} />}
                    {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(item.latest)}
                    {changePct && <span style={{ fontSize: 12 }}>({changePct}%)</span>}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </Card>
    </motion.div>
  )
}
