import { Alert, Empty, Space, Typography } from 'antd'
import { BriefingSummaryCard } from './components/BriefingSummaryCard'
import { WatchlistSummaryCard } from './components/WatchlistSummaryCard'
import { useLatestBriefing } from './hooks/useLatestBriefing'
import { useBriefingHistory } from '../indices/hooks/useBriefingHistory'
import { SlowLoadingHint } from '../../components/SlowLoadingHint'

// Design Ref: §5.4 Dashboard 체크리스트 — FR-04. 2026-08-23 사용자 요청으로 지표 카드·차트·
// 관련 뉴스를 각각 "지수"·"뉴스" 메뉴로 분리 — 대시보드는 시황 요약(날짜 포함) + 관심종목만 남긴다.
export function DashboardPage() {
  const latest = useLatestBriefing()
  // "오늘자 브리핑이 아직 없음" 빈 상태 문구에 마지막 브리핑 날짜를 보여주기 위해서만 이력 조회.
  const history = useBriefingHistory(7)
  const lastAvailableDate = [...(history.data ?? [])].sort((a, b) => b.briefingDate.localeCompare(a.briefingDate))[0]
    ?.briefingDate ?? null

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        대시보드
      </Typography.Title>

      <SlowLoadingHint loading={latest.loading} isSlow={latest.isSlow} />

      {latest.error && (
        <Alert type="error" message="브리핑을 불러오지 못했습니다" description={latest.error.message} showIcon />
      )}

      {!latest.loading && !latest.error && !latest.data && (
        <Empty
          description={
            lastAvailableDate
              ? `오늘자 브리핑이 아직 생성되지 않았습니다. 마지막 브리핑: ${lastAvailableDate}`
              : '아직 생성된 브리핑이 없습니다.'
          }
        />
      )}

      <BriefingSummaryCard briefing={latest.data} loading={latest.loading} />

      <WatchlistSummaryCard />
    </Space>
  )
}
