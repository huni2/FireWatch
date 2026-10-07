import type { ReactNode } from 'react'
import { CollectionNotice } from './CollectionNotice'
import { Layout, Switch } from 'antd'
import {
  AuditOutlined,
  FundOutlined,
  LineChartOutlined,
  DashboardOutlined,
  MoonOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  SettingOutlined,
  SunOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { Link, Outlet, useLocation } from 'react-router-dom'

const { Header, Content, Footer } = Layout

interface AppShellProps {
  darkMode: boolean
  onToggleDarkMode: (value: boolean) => void
}

interface NavItem {
  key: string
  icon: ReactNode
  label: string
}

// WEB-12(2026-10-04) — "가이드"·"사용방법"이 각자 자리를 차지해 메뉴 8자리 중 2자리를 썼다는
// 지적(2026-09-28)으로 "도움말" 하나로 통합(HelpPage 내부 탭으로 두 콘텐츠 모두 접근 가능).
const CONTENT_ITEMS: NavItem[] = [
  { key: '/', icon: <DashboardOutlined />, label: '내 포트폴리오' },
  { key: '/candidates', icon: <FundOutlined />, label: '투자 후보' },
  { key: '/briefing', icon: <ReadOutlined />, label: '브리핑' },
  { key: '/stocks', icon: <LineChartOutlined />, label: '종목' },
  { key: '/indices', icon: <FundOutlined />, label: '지수' },
  { key: '/news', icon: <ReadOutlined />, label: '뉴스' },
  { key: '/short-term', icon: <LineChartOutlined />, label: '단기 투자' },
  { key: '/game', icon: <TrophyOutlined />, label: '가상투자 게임' },
  { key: '/guide', icon: <QuestionCircleOutlined />, label: '도움말' },
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
      aria-current={active ? 'page' : undefined}
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

// Design Ref: §5.1 Screen Layout. 2026-10-05 재설계 — 왼쪽 사이드바 + 상단 헤더가 같은 5개
// 메뉴를 동시에 보여주던 중복을 없애고 상단 바 하나로 통합(2026-10-04 리뷰 지적 "햄버거 구성").
// 사이드바의 완전 숨김 토글도 더는 필요 없어 헤더가 그 자체로 항상 보이는 메뉴가 된다.
export function AppShell({ darkMode, onToggleDarkMode }: AppShellProps) {
  const location = useLocation()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="site-header">
        <div className="site-brand-row">
        <Link to="/" aria-label="FireWatch 메인 페이지로 이동" style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, flexShrink: 0, marginInlineEnd: 16 }}>
          <img src="/favicon.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: -0.4, color: 'var(--ant-color-text)' }}>
            FireWatch
          </span>
        </Link>
        <div style={{ display: 'flex', marginInlineStart: 'auto', flexShrink: 0 }}>
          {ADMIN_ITEMS.map((item) => (
            <TopNavLink key={item.key} item={item} active={location.pathname === item.key} />
          ))}
        </div>
        <Switch
          aria-label="다크 모드"
          checked={darkMode}
          onChange={onToggleDarkMode}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
          style={{ flexShrink: 0, marginInlineStart: 16 }}
        />
        </div>
        <nav className="site-navigation" aria-label="주요 메뉴">
          {CONTENT_ITEMS.map((item) => <TopNavLink key={item.key} item={item} active={location.pathname === item.key} />)}
        </nav>
      </Header>
      <Content className="app-content" style={{ maxWidth: 1400, width: '100%', marginInline: 'auto' }}>
        <CollectionNotice />
        <Outlet />
      </Content>
      <Footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-brand">
            <Link to="/" aria-label="푸터 FireWatch 메인 페이지로 이동"><img src="/favicon.png" alt="" width={24} height={24} /><strong>FireWatch</strong></Link>
            <p>시장을 읽고, 내 투자 계획을 점검하세요.</p>
          </div>
          <nav aria-label="서비스 안내" className="site-footer-links">
            <Link to="/guide">이용안내</Link>
            <Link to="/open-source">오픈소스 고지</Link>
            <Link to="/privacy">개인정보처리방침</Link>
          </nav>
        </div>
        <div className="site-footer-meta"><span>시장 자료 · 포트폴리오 · 가상투자 연습</span><span>가상투자 게임의 뉴스와 가격은 가상 자료입니다.</span></div>
      </Footer>
    </Layout>
  )
}
