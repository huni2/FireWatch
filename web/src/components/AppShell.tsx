import { useState, type ReactNode } from 'react'
import { GuidedTour } from './GuidedTour'
import { showFirstVisitGuide } from './guideEvents'
import { CollectionNotice } from './CollectionNotice'
import { Button, Drawer, Layout, Switch } from 'antd'
import {
  AuditOutlined,
  FundOutlined,
  LineChartOutlined,
  DashboardOutlined,
  MoonOutlined,
  MenuOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  SettingOutlined,
  SunOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useOperatorKey } from '../lib/operatorAccess'

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

// Keep four daily destinations visible and every other route discoverable in 전체 메뉴.
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
const COMPACT_LABELS: Record<string, string> = { '/': '내 기록', '/candidates': '기업 탐색', '/news': '뉴스', '/game': '게임' }

// Primary routes stay visible; the explicitly labelled menu exposes all destinations.
function TopNavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      to={item.key}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      className={`nav-link ${active ? 'is-active' : ''}`}
    >
      <span className="nav-icon" aria-hidden="true">{item.icon}</span>
      <span className="nav-desktop-label" aria-hidden="true">{item.label}</span>
      <span className="nav-mobile-label" aria-hidden="true">{COMPACT_LABELS[item.key] ?? item.label}</span>
    </Link>
  )
}

// Design Ref: §5.1 Screen Layout. 2026-10-05 재설계 — 왼쪽 사이드바 + 상단 헤더가 같은 5개
// 메뉴를 동시에 보여주던 중복을 없애고 상단 바 하나로 통합(2026-10-04 리뷰 지적 "햄버거 구성").
// 사이드바의 완전 숨김 토글도 더는 필요 없어 헤더가 그 자체로 항상 보이는 메뉴가 된다.
export function AppShell({ darkMode, onToggleDarkMode }: AppShellProps) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const operatorKey = useOperatorKey()
  const active = (item: NavItem) => location.pathname === item.key || (item.key === '/guide' && location.pathname === '/usage')

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
        <Button className="all-menu-button" aria-label="전체 메뉴" icon={<MenuOutlined />} aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} style={{ marginInlineStart: 'auto' }}>전체 메뉴</Button>
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
          {CONTENT_ITEMS.filter(item => ['/', '/candidates', '/news', '/game'].includes(item.key)).map(item => <TopNavLink key={item.key} item={item} active={active(item)} />)}
        </nav>
      </Header>
      <Drawer title="전체 메뉴" open={menuOpen} onClose={() => setMenuOpen(false)} width="min(400px, 100vw)">
        <nav aria-label="전체 메뉴 목록" className="all-menu-list">
          {[{ title: '투자 기록·탐색', paths: ['/', '/candidates', '/stocks', '/short-term'] }, { title: '시장 소식·자료', paths: ['/news', '/briefing', '/indices'] }, { title: '게임·이용 안내', paths: ['/game', '/guide', '/settings'] }, ...(operatorKey ? [{ title: '운영', paths: ['/audit-log'] }] : [])].map(group => <section key={group.title}><h2>{group.title}</h2>{[...CONTENT_ITEMS, ...ADMIN_ITEMS].filter(item => group.paths.includes(item.key)).map(item => <Link key={item.key} to={item.key} aria-current={active(item) ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{item.icon}<span>{item.key === '/short-term' ? '단기 관찰' : item.label}</span></Link>)}</section>)}
        </nav>
      </Drawer>
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
            <button type="button" onClick={showFirstVisitGuide}>처음 사용 안내</button>
            <Link to="/guide">이용안내</Link>
            <Link to="/open-source">오픈소스 고지</Link>
            <Link to="/privacy">개인정보처리방침</Link>
          </nav>
        </div>
        <div className="site-footer-meta"><span>시장 자료 · 포트폴리오 · 가상투자 연습</span><span>가상투자 게임의 뉴스와 가격은 가상 자료입니다.</span></div>
      </Footer>
      <GuidedTour />
    </Layout>
  )
}
