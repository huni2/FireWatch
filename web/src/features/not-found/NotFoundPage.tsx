import { Button, Empty, Space, Typography } from 'antd'
import { Link } from 'react-router-dom'

// 정의되지 않은 경로로 들어오면 AppShell(헤더+사이드바)은 유지한 채 안내만 보여준다 — 이전엔 매칭되는
// 라우트가 없으면 AppShell조차 렌더되지 않아 화면 전체가 완전한 백지였다(2026-08-23 발견).
export function NotFoundPage() {
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        페이지를 찾을 수 없음
      </Typography.Title>
      <Empty description="요청한 페이지가 존재하지 않습니다.">
        <Link to="/">
          <Button type="primary">대시보드로 이동</Button>
        </Link>
      </Empty>
    </Space>
  )
}
