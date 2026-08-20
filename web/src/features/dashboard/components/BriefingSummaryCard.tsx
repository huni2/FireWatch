import { Card, Skeleton, Space, Tag, Typography } from 'antd'
import { motion } from 'framer-motion'
import type { Briefing } from '../../../lib/api'

interface BriefingSummaryCardProps {
  briefing: Briefing | null
  loading: boolean
}

// Design Ref: §5.4 Dashboard 체크리스트 — 증시 요약 + 추천 종목 + FALLBACK 배지 + 로딩 스켈레톤
export function BriefingSummaryCard({ briefing, loading }: BriefingSummaryCardProps) {
  if (loading) {
    return (
      <Card title="오늘의 증시 요약">
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    )
  }

  if (!briefing) {
    return null
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <Card
        title="오늘의 증시 요약"
        extra={
          briefing.dataSourceStatus === 'FALLBACK' ? (
            <Tag color="processing">대체 데이터(FALLBACK)</Tag>
          ) : null
        }
      >
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.7 }}>
          {briefing.marketSummary}
        </Typography.Paragraph>
        {briefing.recommendedStocks.length > 0 && (
          <Space wrap size={6}>
            {briefing.recommendedStocks.map((stock) => (
              <Tag key={stock} color="blue" style={{ borderRadius: 999, paddingInline: 10 }}>
                {stock}
              </Tag>
            ))}
          </Space>
        )}
      </Card>
    </motion.div>
  )
}
