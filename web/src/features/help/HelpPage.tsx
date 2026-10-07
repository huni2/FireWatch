import { showFirstVisitGuide } from '../../components/guideEvents'
import { Button, Space, Tabs, Typography } from 'antd'
import { useLocation } from 'react-router-dom'
import { GuidePage } from '../guide/GuidePage'
import { UsagePage } from '../usage/UsagePage'

const { Title } = Typography

// WEB-12(2026-10-04 앱 리뷰) — "가이드"·"사용방법" 둘 다 안내문서 성격인데 주메뉴 8자리 중
// 2자리를 차지한다는 지적(2026-09-28, 그동안 미해결)으로 하나의 메뉴 아래 탭으로 통합. 기존
// /guide, /usage URL은 그대로 유지(StocksPage가 /guide를 직접 참조 중) — 진입 경로로 초기 탭만 결정.
export function HelpPage() {
  const location = useLocation()
  const initialTab = location.pathname === '/usage' ? 'usage' : 'guide'

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Title level={4} style={{ margin: 0 }}>
        도움말
      </Title>
      <Button onClick={showFirstVisitGuide}>처음 사용 안내 다시 보기</Button>
      <Tabs
        defaultActiveKey={initialTab}
        items={[
          { key: 'guide', label: '가이드', children: <GuidePage /> },
          { key: 'usage', label: '사용방법', children: <UsagePage /> },
        ]}
      />
    </Space>
  )
}
