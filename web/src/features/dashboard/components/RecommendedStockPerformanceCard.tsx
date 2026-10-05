import { Card, Empty, Skeleton, Space, Typography } from 'antd'
import type { RecommendedStockPerformance } from '../../../lib/api'
import { SECTION_CARD_PROPS, TREND_DOWN_COLOR, TREND_UP_COLOR } from '../../../lib/theme'

const { Text } = Typography

const MAX_ROWS = 10

interface RecommendedStockPerformanceCardProps {
  data: RecommendedStockPerformance[] | null
  loading: boolean
}

function formatReturn(returnPercent: number | null): { text: string; color?: string } {
  if (returnPercent === null) return { text: '현재가 조회 실패' }
  const sign = returnPercent > 0 ? '+' : ''
  return {
    text: `${sign}${returnPercent.toFixed(2)}%`,
    color: returnPercent > 0 ? TREND_UP_COLOR : returnPercent < 0 ? TREND_DOWN_COLOR : undefined,
  }
}

// Design Ref: BE-13/WEB-10(2026-10-04 앱 리뷰) — "AI 추천을 왜 믿어야 하나"에 답을 주는 카드.
// 그날 추천 시점 가격으로 가상매수했다고 가정했을 때 지금 수익률이 얼마인지 보여준다.
// 2026-10-05 재설계 — 박스 카드가 아니라 지면의 한 섹션처럼(변수 없이 제목 밑줄로만 구분).
export function RecommendedStockPerformanceCard({ data, loading }: RecommendedStockPerformanceCardProps) {
  if (loading) {
    return (
      <Card {...SECTION_CARD_PROPS} title="AI 추천 성과">
        <Skeleton active paragraph={{ rows: 2 }} />
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card {...SECTION_CARD_PROPS} title="AI 추천 성과">
        <Empty description="아직 쌓인 추천 기록이 없어요 — 내일부터 하나씩 쌓입니다" />
      </Card>
    )
  }

  return (
    <Card
      {...SECTION_CARD_PROPS}
      title="AI 추천 성과"
      extra={
        <Text type="secondary" style={{ fontSize: 12 }}>
          추천 시점 가격으로 가상매수했다면
        </Text>
      }
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        {data.slice(0, MAX_ROWS).map((item, index) => {
          const { text, color } = formatReturn(item.returnPercent)
          return (
            <div
              key={`${item.briefingDate}-${item.stockName}-${index}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
            >
              <Space size={8}>
                <Text strong>{item.stockName}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.briefingDate} 추천
                </Text>
              </Space>
              <Text strong style={{ color }}>
                {text}
              </Text>
            </div>
          )
        })}
      </Space>
    </Card>
  )
}
