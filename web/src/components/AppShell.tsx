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
import { SIDER_BG_DARK, SIDER_BG_LIGHT } from '../lib/theme'

const { Sider, Header, Content } = Layout

interface AppShellProps {
  darkMode: boolean
  onToggleDarkMode: (value: boolean) => void
}

// Design Ref: §5.1 Screen Layout — 왼쪽 사이드바(메뉴) + 상단 헤더(로고+햄버거+다크토글) + 콘텐츠.
// 로고는 헤더에 둔다 — 사이드바는 lg(992px) 아래에서 폭 0으로 완전히 사라지는데(collapsedWidth=0),
// 로고가 사이드바 안에 있으면 접혔을 때 브랜드 자체가 안 보이는 문제가 있었다(2026-08-23 사용자 지적).
// 사이드바가 접혀도 헤더는 항상 보이므로, 로고를 헤더로 옮겨 접힘 상태와 무관하게 항상 노출되게 한다.
export function AppShell({ darkMode, onToggleDarkMode }: AppShellProps) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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
        onBreakpoint={(broken) => {
          setIsMobile(broken)
          setCollapsed(broken)
        }}
        onCollapse={setCollapsed}
        breakpoint="lg"
        trigger={null}
        style={{
          background: darkMode ? SIDER_BG_DARK : SIDER_BG_LIGHT,
          borderInlineEnd: '1px solid var(--ant-color-border-secondary)',
          position: 'sticky',
          insetInlineStart: 0,
          top: 0,
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <Menu
          theme={darkMode ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={() => {
            if (isMobile) setCollapsed(true)
          }}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: 'auto',
            paddingInline: 24,
            paddingBlock: 10,
            borderBottom: '1px solid var(--ant-color-border-secondary)',
          }}
        >
          {/* 타이틀-햄버거를 한 묶음으로 세로 배치 — 가로로 나란히 두면 서로 무관한 버튼처럼 보인다는 지적(2026-08-23) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🔥</span>
              <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3, color: 'var(--ant-color-text)' }}>
                FireWatch
              </span>
            </div>
            <Button
              type="text"
              size="small"
              icon={<MenuOutlined />}
              onClick={() => setCollapsed((v) => !v)}
              style={{ height: 20, width: 20, minWidth: 20, padding: 0 }}
            />
          </div>
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
