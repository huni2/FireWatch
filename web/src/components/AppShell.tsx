import { Layout, Menu, Switch } from 'antd'
import {
  AuditOutlined,
  DashboardOutlined,
  LineChartOutlined,
  MoonOutlined,
  SettingOutlined,
  SunOutlined,
} from '@ant-design/icons'
import { Link, Outlet, useLocation } from 'react-router-dom'

const { Header, Content } = Layout

interface AppShellProps {
  darkMode: boolean
  onToggleDarkMode: (value: boolean) => void
}

// Design Ref: §5.1 Screen Layout — Header(로고+다크모드 토글) + Nav(대시보드|감사로그|설정)
export function AppShell({ darkMode, onToggleDarkMode }: AppShellProps) {
  const location = useLocation()

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: <Link to="/">대시보드</Link> },
    { key: '/audit-log', icon: <AuditOutlined />, label: <Link to="/audit-log">감사로그</Link> },
    { key: '/stocks', icon: <LineChartOutlined />, label: <Link to="/stocks">종목</Link> },
    { key: '/settings', icon: <SettingOutlined />, label: <Link to="/settings">설정</Link> },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          paddingInline: 24,
          borderBottom: '1px solid var(--ant-color-border-secondary)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 22 }}>🔥</span>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3, color: 'var(--ant-color-text)' }}>
            FireWatch
          </span>
        </span>
        <Menu
          theme={darkMode ? 'dark' : 'light'}
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ flex: 1, minWidth: 0, borderBottom: 'none', background: 'transparent' }}
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
