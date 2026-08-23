import { useState, type ReactNode } from 'react'
import { Button, Layout, Switch } from 'antd'
import {
  AuditOutlined,
  BookOutlined,
  DashboardOutlined,
  FundOutlined,
  LineChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  SettingOutlined,
  SunOutlined,
} from '@ant-design/icons'
import { Link, Outlet, useLocation } from 'react-router-dom'

const { Sider, Header, Content } = Layout

interface AppShellProps {
  darkMode: boolean
  onToggleDarkMode: (value: boolean) => void
}

interface NavItem {
  key: string
  icon: ReactNode
  label: string
}

const CONTENT_ITEMS: NavItem[] = [
  { key: '/', icon: <DashboardOutlined />, label: '대시보드' },
  { key: '/stocks', icon: <LineChartOutlined />, label: '종목' },
  { key: '/indices', icon: <FundOutlined />, label: '지수' },
  { key: '/news', icon: <ReadOutlined />, label: '뉴스' },
  { key: '/guide', icon: <QuestionCircleOutlined />, label: '가이드' },
  { key: '/usage', icon: <BookOutlined />, label: '사용방법' },
]

const ADMIN_ITEMS: NavItem[] = [
  { key: '/audit-log', icon: <AuditOutlined />, label: '감사로그' },
  { key: '/settings', icon: <SettingOutlined />, label: '설정' },
]

// 상단 헤더 메뉴 — AntD `Menu mode="horizontal"`을 쓰면 폭이 좁을 때 항목이 자동으로 "..."
// 더보기 안에 숨는데, 그게 오히려 "일부 메뉴가 안 보인다"는 지적으로 이어졌다(2026-08-23) —
// 항목을 절대 숨기지 않는 직접 만든 링크 목록으로 대체, 안 들어가면 가로 스크롤로 처리한다.
function TopNavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      to={item.key}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 46,
        padding: '0 12px',
        whiteSpace: 'nowrap',
        fontSize: 14,
        color: active ? 'var(--ant-color-primary)' : 'var(--ant-color-text)',
        fontWeight: active ? 600 : 400,
        borderBottom: active ? '2px solid var(--ant-color-primary)' : '2px solid transparent',
      }}
    >
      {item.icon}
      {item.label}
    </Link>
  )
}

// Design Ref: §5.1 Screen Layout — 왼쪽 사이드바(콘텐츠 메뉴) + 상단 헤더(전체 메뉴, 절대 숨기지
// 않음) 두 곳에 모두 메뉴를 노출한다. 사이드바는 완전히 숨길 수 있어야 한다는 요청(2026-08-23)에
// 따라 `collapsedWidth=0`으로 폭 0까지 접힌다 — 이 경우 Sider 내장 트리거(하단 화살표)도 같이
// 사라져 다시 못 펼치게 되므로, 토글 버튼은 항상 보이는 헤더에 따로 둔다. 로고도 헤더에 둬서
// 사이드바가 완전히 숨어도 브랜드가 사라지지 않는다(전에 겪은 "로고 사라짐" 버그 재발 방지).
export function AppShell({ darkMode, onToggleDarkMode }: AppShellProps) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme={darkMode ? 'dark' : 'light'}
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={200}
        collapsedWidth={0}
        style={{
          position: 'sticky',
          insetInlineStart: 0,
          top: 0,
          height: '100vh',
          overflow: 'auto',
          borderInlineEnd: collapsed ? 'none' : '1px solid var(--ant-color-border-secondary)',
        }}
      >
        <nav style={{ display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
          {CONTENT_ITEMS.map((item) => (
            <Link
              key={item.key}
              to={item.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 24px',
                fontSize: 14,
                whiteSpace: 'nowrap',
                color: location.pathname === item.key ? 'var(--ant-color-primary)' : 'var(--ant-color-text)',
                fontWeight: location.pathname === item.key ? 600 : 400,
                background: location.pathname === item.key ? 'var(--ant-color-primary-bg)' : 'transparent',
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </Sider>
      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            paddingInline: 24,
            overflowX: 'auto',
            borderBottom: '1px solid var(--ant-color-border-secondary)',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? '사이드바 펼치기' : '사이드바 숨기기'}
            style={{ flexShrink: 0 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginInlineEnd: 12 }}>
            <span style={{ fontSize: 20 }}>🔥</span>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3, color: 'var(--ant-color-text)' }}>
              FireWatch
            </span>
          </div>
          {CONTENT_ITEMS.map((item) => (
            <TopNavLink key={item.key} item={item} active={location.pathname === item.key} />
          ))}
          <div style={{ display: 'flex', marginInlineStart: 'auto', flexShrink: 0 }}>
            {ADMIN_ITEMS.map((item) => (
              <TopNavLink key={item.key} item={item} active={location.pathname === item.key} />
            ))}
          </div>
          <Switch
            checked={darkMode}
            onChange={onToggleDarkMode}
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
            style={{ flexShrink: 0, marginInlineStart: 16 }}
          />
        </Header>
        <Content style={{ padding: 24, maxWidth: 1400, width: '100%', marginInline: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
