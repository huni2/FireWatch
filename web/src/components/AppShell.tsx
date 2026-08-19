import { Layout, Menu, Switch, Typography } from 'antd'
import { AuditOutlined, DashboardOutlined, SettingOutlined } from '@ant-design/icons'
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
    { key: '/settings', icon: <SettingOutlined />, label: <Link to="/settings">설정</Link> },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 24, paddingInline: 24 }}>
        <Typography.Title level={4} style={{ color: 'inherit', margin: 0, whiteSpace: 'nowrap' }}>
          🔥 FireWatch
        </Typography.Title>
        <Menu
          theme={darkMode ? 'dark' : 'light'}
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ flex: 1, minWidth: 0 }}
        />
        <Switch
          checked={darkMode}
          onChange={onToggleDarkMode}
          checkedChildren="다크"
          unCheckedChildren="라이트"
        />
      </Header>
      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
    </Layout>
  )
}
