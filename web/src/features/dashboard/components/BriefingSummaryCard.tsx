import { useState } from 'react'
import { App, Button, Card, Skeleton, Space, Tag } from 'antd'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { searchStocks, type Briefing } from '../../../lib/api'
import { renderMarkdownLite } from '../../../lib/markdownLite'
import { qualifiedRecommendations } from '../../../../../shared/discovery'

interface BriefingSummaryCardProps {
  briefing: Briefing | null
  loading: boolean
}

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
      <Card variant="borderless" style={{ background: 'transparent' }} title="오늘의 증시 요약">
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    )
  }

  if (!briefing) {
    return null
  }

  const paragraphs = briefing.marketSummary.split(/\n+/).map(line => line.trim()).filter(Boolean)
  const excerpts = paragraphs.filter(line => !/^(안녕|오늘도|\[|#|[-=*]{3})/.test(line))
  const preview = (excerpts.length ? excerpts : paragraphs).slice(0, 3)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card
        // 신문 1면형 재설계(2026-10-05) — 박스 카드가 아니라 지면 맨 위 메인 기사처럼: 테두리·배경
        // 없이 큰 제목 + 굵은 가로줄(마스트헤드 룰)만으로 구분한다.
        variant="borderless"
        style={{ background: 'transparent' }}
        styles={{
          header: { borderBottomWidth: 2 },
          title: { fontSize: 24, fontWeight: 800, letterSpacing: -0.4, whiteSpace: 'normal' },
        }}
        title={<div className="briefing-title"><strong>증시 요약</strong><small>자료 기준 {briefing.briefingDate}</small></div>}
        extra={
          briefing.dataSourceStatus === 'FALLBACK' ? (
            <Tag color="processing">대체 데이터(FALLBACK)</Tag>
          ) : null
        }
      >
        {!expanded && <div className="briefing-highlights"><small>저장된 원문에서 발췌 · 전체 내용과 위험 안내를 함께 확인하세요.</small><ul>{preview.map((line, index) => <li key={index}>{renderMarkdownLite(line)}</li>)}</ul></div>}
        {expanded && <div className="briefing-full-text">{renderMarkdownLite(briefing.marketSummary)}</div>}
        <Button type="text" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>{expanded ? '접기' : '전체 분석 읽기'}</Button>
        {qualifiedRecommendations(briefing).length > 0 && (
          <Space wrap size={6} style={{ marginTop: 8 }}>
            {qualifiedRecommendations(briefing).map(({ stockName: stock }) => (
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
