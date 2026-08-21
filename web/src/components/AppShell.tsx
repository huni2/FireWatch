import { useState } from 'react'
import { Button, Layout, Menu, Switch } from 'antd'
import {
  AuditOutlined,
  DashboardOutlined,
  LineChartOutlined,
  MenuOutlined,
  MoonOutlined,
  SettingOutlined,
  SunOutlined,
} from '@ant-design/icons'
import { Link, Outlet, useLocation } from 'react-router-dom'

const { Sider, Header, Content } = Layout

interface AppShellProps {
  darkMode: boolean
  onToggleDarkMode: (value: boolean) => void
}

// Design Ref: §5.1 Screen Layout — 왼쪽 사이드바(로고+메뉴) + 상단 헤더(다크토글) + 콘텐츠.
// lg(992px) 아래에서는 사이드바가 자동으로 접혀 화면 밖으로 사라지고, 헤더의 햄버거 버튼으로 다시 연다.
export function AppShell({ darkMode, onToggleDarkMode }: AppShellProps) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: <Link to="/">대시보드</Link> },
    { key: '/stocks', icon: <LineChartOutlined />, label: <Link to="/stocks">종목</Link> },
    { key: '/audit-log', icon: <AuditOutlined />, label: <Link to="/audit-log">감사로그</Link> },
    { key: '/settings', icon: <SettingOutlined />, label: <Link to="/settings">설정</Link> },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme={darkMode ? 'dark' : 'light'}
        width={220}
        collapsedWidth={0}
        collapsed={collapsed}
        onBreakpoint={setCollapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        trigger={null}
        style={{
          borderInlineEnd: '1px solid var(--ant-color-border-secondary)',
          position: 'sticky',
          insetInlineStart: 0,
          top: 0,
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 24px' }}>
          <span style={{ fontSize: 22 }}>🔥</span>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3, color: 'var(--ant-color-text)' }}>
            FireWatch
          </span>
        </div>
        <Menu
          theme={darkMode ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={() => setCollapsed(true)}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingInline: 24,
            borderBottom: '1px solid var(--ant-color-border-secondary)',
          }}
        >
          <Button type="text" icon={<MenuOutlined />} onClick={() => setCollapsed((v) => !v)} />
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
    </Layout>
  )
}
