import { Layout, Menu, Switch } from 'antd'
import { AuditOutlined, DashboardOutlined, LineChartOutlined, MoonOutlined, SettingOutlined, SunOutlined } from '@ant-design/icons'
import { Link, Outlet, useLocation } from 'react-router-dom'

const { Header, Content } = Layout

interface AppShellProps {
  darkMode: boolean
  onToggleDarkMode: (value: boolean) => void
}

// Design Ref: §5.1 Screen Layout — 사이드바·햄버거 토글·드롭다운을 전부 없애고 헤더에 로고 +
// 가로 메뉴(항상 보임) + 다크토글만 둔다. 화면 크기별로 다른 레이아웃을 분기하려던 시도(왼쪽
// 사이드바 vs 드롭다운, 데스크톱 접기 등)가 세 차례 반복해서 사용자 기대와 어긋났다(2026-08-23)
// — 커스텀 분기 로직 자체를 없애고, 좁아졌을 때 처리는 AntD `Menu mode="horizontal"`의 기본
// 오버플로우(자동 "..." 더보기)에 맡긴다.
export function AppShell({ darkMode, onToggleDarkMode }: AppShellProps) {
  const location = useLocation()

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: <Link to="/">대시보드</Link> },
    { key: '/stocks', icon: <LineChartOutlined />, label: <Link to="/stocks">종목</Link> },
    { key: '/audit-log', icon: <AuditOutlined />, label: <Link to="/audit-log">감사로그</Link> },
    { key: '/settings', icon: <SettingOutlined />, label: <Link to="/settings">설정</Link> },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          paddingInline: 24,
          borderBottom: '1px solid var(--ant-color-border-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 20 }}>🔥</span>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3, color: 'var(--ant-color-text)' }}>
            FireWatch
          </span>
        </div>
        <Menu
          theme={darkMode ? 'dark' : 'light'}
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ flex: 1, minWidth: 0, borderBottom: 'none' }}
        />
        <Switch
          checked={darkMode}
          onChange={onToggleDarkMode}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
        />
      </Header>
      <Content style={{ padding: 24, maxWidth: 1400, width: '100%', marginInline: 'auto' }}>
        <Outlet />
      </Content>
    </Layout>
  )
}
