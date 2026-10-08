import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { GuidedTour } from './GuidedTour'
import { AnnouncementPopup } from './AnnouncementPopup'
import { showFirstVisitGuide } from './guideEvents'
import { Button, Drawer, Layout, Switch, Tooltip } from 'antd'
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
  UserOutlined,
} from '@ant-design/icons'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { setAccountOperator, useIsOperator } from '../lib/operatorAccess'
import { useLoginSession, watchLoginSession } from '../lib/loginSession'
import { request } from '../lib/api'

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
const COMPACT_LABELS: Record<string, string> = { '/': '내 기록', '/candidates': '기업 탐색', '/news': '시장 소식', '/game': '게임' }

// Primary routes stay visible; the explicitly labelled menu exposes all destinations.
function TopNavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      to={item.key}
      aria-label={COMPACT_LABELS[item.key] ?? item.label}
      aria-current={active ? 'page' : undefined}
      className={`nav-link ${active ? 'is-active' : ''}`}
    >
      <span className="nav-icon" aria-hidden="true">{item.icon}</span>
      <span className="nav-desktop-label" aria-hidden="true">{COMPACT_LABELS[item.key] ?? item.label}</span>
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
  const [entryFinished, setEntryFinished] = useState(false)
  const finishEntry = useCallback(() => setEntryFinished(true), [])
  const isOperator = useIsOperator()
  const session = useLoginSession()
  useEffect(watchLoginSession, [])
  useEffect(() => {
    let active = true
    if (session) request<{ operator: boolean }>('/api/operations/access').then(result => { if (active) setAccountOperator(result.operator ? session.token : '') }).catch(() => { if (active) setAccountOperator('') })
    return () => { active = false }
  }, [session])
  const active = (item: NavItem) => location.pathname === item.key || (item.key === '/guide' && location.pathname === '/usage')
  const exploration = ['/candidates', '/stocks', '/short-term'].includes(location.pathname)
  const market = ['/news', '/briefing', '/indices'].includes(location.pathname)

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
        <nav className="header-tools" aria-label="계정과 이용 도구">
          {[{ to: '/account', label: '내 계정', description: 'Google 연결과 로그인 기기 관리', icon: <UserOutlined /> }, { to: '/settings', label: '설정', description: '관심 키워드와 알림 수신 설정', icon: <SettingOutlined /> }, { to: '/guide', label: '도움말', description: '서비스와 투자 연습 이용 방법', icon: <QuestionCircleOutlined /> }].map(item => <Tooltip key={item.to} title={item.description} trigger={['hover', 'focus']}><Link to={item.to} aria-label={item.label} aria-current={location.pathname === item.to ? 'page' : undefined}><span aria-hidden="true">{item.icon}</span><span className="header-tool-label">{item.label}</span></Link></Tooltip>)}
          <Button className="all-menu-button" aria-label="더보기 메뉴" icon={<MenuOutlined />} aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><span className="header-tool-label">더보기</span></Button>
        </nav>
        <Switch
          className="header-theme-switch"
          aria-label="다크 모드"
          checked={darkMode}
          onChange={onToggleDarkMode}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
          style={{ flexShrink: 0, marginInlineStart: 16 }}
        />
        </div>
        <nav className="site-navigation" aria-label="주요 메뉴">
          {CONTENT_ITEMS.filter(item => ['/', '/candidates', '/news', '/game'].includes(item.key)).map(item => <TopNavLink key={item.key} item={item} active={active(item) || (item.key === '/candidates' && exploration) || (item.key === '/news' && market)} />)}
        </nav>
      </Header>
      <Drawer title="더보기" open={menuOpen} onClose={() => setMenuOpen(false)} width="min(360px, 100vw)">
        <p className="account-note">{session ? 'Google 연결 세션으로 이용 중입니다. 내 계정에서 연결 상태와 기기를 확인하세요.' : '현재 브라우저의 익명 기록으로 이용 중입니다. Google 연결 상태는 내 계정에서 확인하세요.'}</p>
        <nav aria-label="계정 메뉴" className="all-menu-list">
          <Link to="/account" aria-current={location.pathname === '/account' ? 'page' : undefined} onClick={() => setMenuOpen(false)}><UserOutlined /><span>내 계정<small>Google 연결 · 기기 관리</small></span></Link>
          <Link to="/community" aria-current={location.pathname === '/community' ? 'page' : undefined} onClick={() => setMenuOpen(false)}><ReadOutlined /><span>공지사항 · 의견 보내기<small>업데이트 확인 · 문제 신고 · 내 문의</small></span></Link>
          {[...CONTENT_ITEMS, ...ADMIN_ITEMS].filter(item => ['/settings', '/guide', ...(isOperator ? ['/audit-log'] : [])].includes(item.key)).map(item => <Link key={item.key} to={item.key} aria-current={active(item) ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{item.icon}<span>{item.label}</span></Link>)}
        </nav>
        <div className="drawer-appearance"><span>다크 모드<small>밝은 화면과 어두운 화면 선택</small></span><Switch aria-label="메뉴 다크 모드" checked={darkMode} onChange={onToggleDarkMode} /></div>
      </Drawer>
      <Content className="app-content" style={{ maxWidth: 1400, width: '100%', marginInline: 'auto' }}>
        {(exploration || market) && <nav className="context-navigation" aria-label={exploration ? '기업 탐색 화면' : '시장 소식 화면'}>{(exploration ? [{ to: '/candidates', label: '추천·분야 탐색' }, { to: '/stocks', label: '회사 검색·시세' }, { to: '/short-term', label: '단기 관찰' }] : [{ to: '/news', label: '뉴스' }, { to: '/briefing', label: '브리핑' }, { to: '/indices', label: '시장 지표' }]).map(item => <Link key={item.to} to={item.to} aria-current={location.pathname === item.to ? 'page' : undefined}>{item.label}</Link>)}</nav>}
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
            <Link to="/community">공지사항 · 의견 보내기</Link>
            <Link to="/investment-info">투자 정보 이용안내</Link>
            <Link to="/open-source">오픈소스 고지</Link>
            <Link to="/privacy">개인정보처리방침</Link>
          </nav>
        </div>
        <div className="site-footer-meta"><span>시장 자료 · 포트폴리오 · 가상투자 연습</span><span>가상투자 게임의 뉴스와 가격은 가상 자료입니다.</span></div>
      </Footer>
      {entryFinished && <GuidedTour />}
      <AnnouncementPopup onComplete={finishEntry} />
    </Layout>
  )
}
