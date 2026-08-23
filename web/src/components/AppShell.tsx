import { useState } from 'react'
import { Button, Grid, Layout, Menu, Switch } from 'antd'
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

// Design Ref: §5.1 Screen Layout — lg(992px) 이상은 왼쪽 사이드바(햄버거로 접기/펼치기 가능),
// 그 아래(모바일)는 헤더 아래로 펼쳐지는 드롭다운 메뉴로 완전히 다른 레이아웃을 쓴다.
// 이전엔 모바일에서도 Sider(화면 맨 왼쪽 끝에 도킹된 컬럼)를 그대로 썼는데, 헤더 안 햄버거
// 버튼을 눌러도 메뉴가 버튼 바로 아래가 아니라 화면 반대편 왼쪽 끝에서 나타나 위치가 어긋난다는
// 지적(2026-08-23) — Sider는 구조상 "옆 컬럼"이라 버튼 아래에서 나올 수 없어, 모바일은 Sider를
// 아예 안 쓰고 헤더와 같은 세로 흐름 안에 Menu를 조건부로 넣는 방식으로 바꿨다.
// 로고는 데스크톱·모바일 둘 다 헤더에 둔다 — 사이드바 안에 있으면 접었을 때 브랜드가 같이
// 사라지는 문제가 있었다(2026-08-23 앞서 수정한 버그, 데스크톱 접기를 다시 허용하며 재발 방지).
export function AppShell({ darkMode, onToggleDarkMode }: AppShellProps) {
  const location = useLocation()
  const screens = Grid.useBreakpoint()
  const isDesktop = screens.lg ?? true
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuOpen = isDesktop ? !desktopCollapsed : mobileMenuOpen
  const toggleMenu = () => (isDesktop ? setDesktopCollapsed((v) => !v) : setMobileMenuOpen((v) => !v))

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: <Link to="/">대시보드</Link> },
    { key: '/stocks', icon: <LineChartOutlined />, label: <Link to="/stocks">종목</Link> },
    { key: '/audit-log', icon: <AuditOutlined />, label: <Link to="/audit-log">감사로그</Link> },
    { key: '/settings', icon: <SettingOutlined />, label: <Link to="/settings">설정</Link> },
  ]

  const logo = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 20 }}>🔥</span>
      <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3, color: 'var(--ant-color-text)' }}>
        FireWatch
      </span>
    </div>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isDesktop && (
        <Sider
          theme={darkMode ? 'dark' : 'light'}
          width={220}
          collapsedWidth={0}
          collapsed={desktopCollapsed}
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
            style={{ borderInlineEnd: 'none' }}
          />
        </Sider>
      )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={toggleMenu}
              aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            />
            {logo}
          </div>
          <Switch
            checked={darkMode}
            onChange={onToggleDarkMode}
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
          />
        </Header>
        {/* 모바일 드롭다운 메뉴 — 헤더 바로 아래, 같은 세로 흐름에서 열리고 닫힘 */}
        {!isDesktop && mobileMenuOpen && (
          <Menu
            theme={darkMode ? 'dark' : 'light'}
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={() => setMobileMenuOpen(false)}
            style={{ borderBottom: '1px solid var(--ant-color-border-secondary)' }}
          />
        )}
        <Content style={{ padding: 24, maxWidth: 1400, width: '100%', marginInline: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
