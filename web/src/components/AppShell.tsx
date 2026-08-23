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

const { Header, Content } = Layout

interface AppShellProps {
  darkMode: boolean
  onToggleDarkMode: (value: boolean) => void
}

// Design Ref: §5.1 Screen Layout — 왼쪽에 도킹된 사이드바(Sider)를 아예 쓰지 않는다. 화면 크기와
// 무관하게 헤더의 햄버거 버튼을 누르면 항상 헤더 바로 아래로 메뉴가 펼쳐진다(드롭다운 방식) —
// 데스크톱 폭에서만 왼쪽 사이드바를 쓰는 절충을 두 번 시도했는데(lg 이상 Sider, 미만 드롭다운 /
// 데스크톱 접기 기능 복구) 둘 다 사용자가 실제로 보는 화면(데스크톱 폭)에서 "왼쪽으로 나온다"는
// 같은 지적을 다시 받았다(2026-08-23) — 화면 크기 분기 자체가 잘못된 전제였던 것. 이제는 화면
// 크기 상관없이 항상 같은 방식 하나만 쓴다.
export function AppShell({ darkMode, onToggleDarkMode }: AppShellProps) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

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
            onClick={() => setMenuOpen((v) => !v)}
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
      {/* 헤더 바로 아래로 펼쳐지는 드롭다운 메뉴 — 화면 크기 무관하게 항상 이 방식 하나만 쓴다 */}
      {menuOpen && (
        <Menu
          theme={darkMode ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={() => setMenuOpen(false)}
          style={{ borderBottom: '1px solid var(--ant-color-border-secondary)' }}
        />
      )}
      <Content style={{ padding: 24, maxWidth: 1400, width: '100%', marginInline: 'auto' }}>
        <Outlet />
      </Content>
    </Layout>
  )
}
