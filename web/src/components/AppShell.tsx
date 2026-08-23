import type { ReactNode } from 'react'
import { Layout, Switch } from 'antd'
import {
  AuditOutlined,
  DashboardOutlined,
  FundOutlined,
  LineChartOutlined,
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

// Design Ref: §5.1 Screen Layout — 왼쪽 사이드바(콘텐츠 메뉴, 항상 열림) + 상단 헤더(전체 메뉴,
// 절대 숨기지 않음) 두 곳에 모두 메뉴를 노출한다 — 상단은 폭이 좁아지면 일부가 "..." 더보기 뒤로
// 숨는 게 문제였고("메뉴가 왜 저기밖에 없냐"는 지적, 2026-08-23), 사이드바도 다시 보이길 원해서
// 이번엔 화면 크기 분기·자동 접힘 없이 그대로 둘 다 항상 켜둔다.
export function AppShell({ darkMode, onToggleDarkMode }: AppShellProps) {
  const location = useLocation()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme={darkMode ? 'dark' : 'light'}
        width={200}
        style={{
          position: 'sticky',
          insetInlineStart: 0,
          top: 0,
          height: '100vh',
          overflow: 'auto',
          borderInlineEnd: '1px solid var(--ant-color-border-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 24px' }}>
          <span style={{ fontSize: 20 }}>🔥</span>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3, color: 'var(--ant-color-text)' }}>
            FireWatch
          </span>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column' }}>
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
