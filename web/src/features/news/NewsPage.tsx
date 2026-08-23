import { Space, Typography } from 'antd'
import { RelatedNewsCard } from './components/RelatedNewsCard'
import { useLatestBriefing } from '../dashboard/hooks/useLatestBriefing'

// 2026-08-23 사용자 요청 — 대시보드에 있던 관련 뉴스를 별도 메뉴로 분리.
export function NewsPage() {
  const latest = useLatestBriefing()

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        뉴스
      </Typography.Title>
      <RelatedNewsCard news={latest.data?.news ?? []} loading={latest.loading} />
    </Space>
  )
}
