import { useState } from 'react'
import { Card, Skeleton, Space, Tag, Typography } from 'antd'
import { motion } from 'framer-motion'
import type { Briefing } from '../../../lib/api'
import { renderMarkdownLite } from '../../../lib/markdownLite'

interface BriefingSummaryCardProps {
  briefing: Briefing | null
  loading: boolean
}

const COLLAPSED_HEIGHT = 160

// Design Ref: §5.4 Dashboard 체크리스트 — 증시 요약 + 추천 종목 + FALLBACK 배지 + 로딩 스켈레톤
export function BriefingSummaryCard({ briefing, loading }: BriefingSummaryCardProps) {
  const [expanded, setExpanded] = useState(false)

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
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card
        className="hoverable-card"
        title="오늘의 증시 요약"
        extra={
          briefing.dataSourceStatus === 'FALLBACK' ? (
            <Tag color="processing">대체 데이터(FALLBACK)</Tag>
          ) : null
        }
      >
        <div style={{ position: 'relative', maxHeight: expanded ? undefined : COLLAPSED_HEIGHT, overflow: 'hidden' }}>
          <div style={{ fontSize: 15, lineHeight: 1.7 }}>{renderMarkdownLite(briefing.marketSummary)}</div>
          {!expanded && (
            <div
              style={{
                position: 'absolute',
                insetInline: 0,
                bottom: 0,
                height: 48,
                background: 'linear-gradient(transparent, var(--ant-color-bg-container))',
              }}
            />
          )}
        </div>
        <Typography.Link onClick={() => setExpanded((v) => !v)} style={{ display: 'inline-block', marginBlock: 8 }}>
          {expanded ? '접기' : '더보기'}
        </Typography.Link>
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
