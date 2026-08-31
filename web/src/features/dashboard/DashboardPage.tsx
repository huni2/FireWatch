import { Alert, Empty, Space, Typography } from 'antd'
import { BriefingSummaryCard } from './components/BriefingSummaryCard'
import { WatchlistSummaryCard } from './components/WatchlistSummaryCard'
import { useLatestBriefing } from './hooks/useLatestBriefing'
import { useBriefingHistory } from '../indices/hooks/useBriefingHistory'
import { useSettings } from '../settings/hooks/useSettings'
import { RelatedNewsCard } from '../news/components/RelatedNewsCard'
import { SlowLoadingHint } from '../../components/SlowLoadingHint'

// Design Ref: §5.4 Dashboard 체크리스트 — FR-04. 2026-08-23 사용자 요청으로 지표 카드·차트·
// 관련 뉴스를 각각 "지수"·"뉴스" 메뉴로 분리 — 대시보드는 시황 요약(날짜 포함) + 관심종목만 남긴다.
export function DashboardPage() {
  const latest = useLatestBriefing()
  const settings = useSettings()
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

      {interestKeywords.length > 0 && (
        <RelatedNewsCard
          news={hotIssues}
          loading={latest.loading || settings.loading}
          title="오늘의 핫이슈"
          emptyDescription="오늘은 관심 키워드와 일치하는 뉴스가 없어요"
        />
      )}

      <WatchlistSummaryCard />
    </Space>
  )
}
