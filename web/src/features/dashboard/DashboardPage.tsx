import { Alert, Empty, Space, Typography } from 'antd'
import { BriefingSummaryCard } from './components/BriefingSummaryCard'
import { RecommendedStockPerformanceCard } from './components/RecommendedStockPerformanceCard'
import { WatchlistSummaryCard } from './components/WatchlistSummaryCard'
import { useLatestBriefing } from './hooks/useLatestBriefing'
import { useRecommendedStockPerformance } from './hooks/useRecommendedStockPerformance'
import { useBriefingHistory } from '../indices/hooks/useBriefingHistory'
import { useSettings } from '../settings/hooks/useSettings'
import { RelatedNewsCard } from '../news/components/RelatedNewsCard'
import { SlowLoadingHint } from '../../components/SlowLoadingHint'

// Design Ref: §5.4 Dashboard 체크리스트 — FR-04. 2026-08-23 사용자 요청으로 지표 카드·차트·
// 관련 뉴스를 각각 "지수"·"뉴스" 메뉴로 분리 — 대시보드는 시황 요약(날짜 포함) + 관심종목만 남긴다.
export function DashboardPage() {
  const latest = useLatestBriefing()
  const settings = useSettings()
  const recommendedPerformance = useRecommendedStockPerformance()
  // "오늘자 브리핑이 아직 없음" 빈 상태 문구에 마지막 브리핑 날짜를 보여주기 위해서만 이력 조회.
  const history = useBriefingHistory(7)
  const lastAvailableDate = [...(history.data ?? [])].sort((a, b) => b.briefingDate.localeCompare(a.briefingDate))[0]
    ?.briefingDate ?? null

  // 2026-09-01(WEB-7) — RSS가 키워드 검색을 지원하지 않아([[Decisions/0010]]) 새로 검색하는 게 아니라
  // 오늘 이미 받은 뉴스 중 관심 키워드와 겹치는 것만 클라이언트에서 골라 보여준다. 관심 키워드가 없으면
  // 섹션 자체를 숨긴다(설정 안 한 사람에게 빈 섹션을 보여줘봤자 소음).
  const interestKeywords = settings.data?.interestKeywords ?? []
  const hotIssues = (latest.data?.news ?? []).filter((article) =>
    interestKeywords.some(
      (keyword) =>
        article.title.toLowerCase().includes(keyword.toLowerCase()) ||
        (article.description?.toLowerCase().includes(keyword.toLowerCase()) ?? false),
    ),
  )

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

      {/* 신문 1면형 재설계(2026-10-05, 2026-10-04 리뷰 "박스가 세로로 나열된 느낌" 지적 후속) —
          메인 기사(브리핑) 아래로 나머지 섹션이 지면처럼 2단으로 흐른다. 핫이슈 섹션은 관심
          키워드가 없으면 아예 없으므로, 이땐 성과·관심종목을 나란히 둬 그리드가 비지 않게 한다. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
          gap: 32,
          paddingTop: 24,
          borderTop: '1px solid var(--ant-color-border-secondary)',
        }}
      >
        {interestKeywords.length > 0 ? (
          <>
            <Space direction="vertical" size={32} style={{ width: '100%' }}>
              <RecommendedStockPerformanceCard
                data={recommendedPerformance.data}
                loading={recommendedPerformance.loading}
                cachedData={recommendedPerformance.cachedData}
              />
              <WatchlistSummaryCard />
            </Space>
            <RelatedNewsCard
              news={hotIssues}
              loading={latest.loading || settings.loading}
              title="오늘의 핫이슈"
              emptyDescription="오늘은 관심 키워드와 일치하는 뉴스가 없어요"
              boxed={false}
            />
          </>
        ) : (
          <>
            <RecommendedStockPerformanceCard
              data={recommendedPerformance.data}
              loading={recommendedPerformance.loading}
              cachedData={recommendedPerformance.cachedData}
            />
            <WatchlistSummaryCard />
          </>
        )}
      </div>
    </Space>
  )
}
