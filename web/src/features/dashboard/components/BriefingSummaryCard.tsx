import { useState } from 'react'
import { App, Card, Skeleton, Space, Tag, Typography } from 'antd'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { searchStocks, type Briefing } from '../../../lib/api'
import { renderMarkdownLite } from '../../../lib/markdownLite'

interface BriefingSummaryCardProps {
  briefing: Briefing | null
  loading: boolean
}

const COLLAPSED_HEIGHT = 160

// Design Ref: §5.4 Dashboard 체크리스트 — 증시 요약 + 추천 종목 + FALLBACK 배지 + 로딩 스켈레톤
export function BriefingSummaryCard({ briefing, loading }: BriefingSummaryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const { message } = App.useApp()

  // 추천종목 태그가 그냥 텍스트라 눌러도 아무 일이 없다는 지적(2026-10-04 리뷰) — 이름으로 티커를
  // 찾아 종목 화면에서 바로 관심종목에 추가되게 한다. 기존 검색(StockSearchInput)과 동일한 API 재사용.
  const handleStockClick = async (stockName: string) => {
    try {
      const results = await searchStocks(stockName)
      if (results.length === 0) {
        message.warning(`"${stockName}" 종목을 찾지 못했습니다.`)
        return
      }
      navigate(`/stocks?add=${encodeURIComponent(results[0].symbol)}`)
    } catch {
      message.error('종목 검색에 실패했습니다.')
    }
  }

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
        title={`오늘의 증시 요약 · ${briefing.briefingDate}`}
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
              <Tag
                key={stock}
                color="blue"
                style={{ borderRadius: 999, paddingInline: 10, cursor: 'pointer' }}
                onClick={() => handleStockClick(stock)}
              >
                {stock}
              </Tag>
            ))}
          </Space>
        )}
      </Card>
    </motion.div>
  )
}
