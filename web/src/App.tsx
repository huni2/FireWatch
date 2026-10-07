import { lazy, Suspense, useEffect, useState } from 'react'
import { App as AntApp, ConfigProvider, Skeleton } from 'antd'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { NotFoundPage } from './features/not-found/NotFoundPage'
import { darkThemeConfig, lightThemeConfig } from './lib/theme'
import designTokens from '../../shared/design-tokens.json'

// 첫 화면(대시보드)만 즉시 로드하고 나머지 페이지는 방문 시점에 필요한 JS만 내려받는다
// — 번들 하나(1.6MB)에 다 뭉쳐 있어 초기 로딩이 느리다는 지적(2026-08-21)에 따른 라우트별 코드 스플리팅.
const AuditLogPage = lazy(() => import('./features/audit-log/AuditLogPage').then((m) => ({ default: m.AuditLogPage })))
const StocksPage = lazy(() => import('./features/stocks/StocksPage').then((m) => ({ default: m.StocksPage })))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const IndicesPage = lazy(() => import('./features/indices/IndicesPage').then((m) => ({ default: m.IndicesPage })))
const NewsPage = lazy(() => import('./features/news/NewsPage').then((m) => ({ default: m.NewsPage })))
const GamePage = lazy(() => import('./features/game/GamePage').then((m) => ({ default: m.GamePage })))
const HelpPage = lazy(() => import('./features/help/HelpPage').then((m) => ({ default: m.HelpPage })))
const PrivacyPage = lazy(() => import('./features/privacy/PrivacyPage').then((m) => ({ default: m.PrivacyPage })))
const OpenSourcePage = lazy(() => import('./features/opensource/OpenSourcePage').then(m => ({ default: m.OpenSourcePage })))
const PortfolioPage = lazy(() => import('./features/portfolio/PortfolioPage').then(m => ({ default: m.PortfolioPage })))
const CandidatesPage = lazy(() => import('./features/candidates/CandidatesPage').then(m => ({ default: m.CandidatesPage })))

// 2026-10-07: 기본은 라이트, 사용자가 저장한 다크 선택은 유지한다.
export default function App() {
  const [darkMode, setDarkMode] = useState(() => { try { return localStorage.getItem('firewatch-theme') === 'dark' } catch { return false } })
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    const palette = darkMode ? designTokens.dark : designTokens.light
    const cssColors = { primary: darkMode ? designTokens.accent : designTokens.light.accent, 'bg-layout': palette.canvas, 'bg-container': palette.surface, 'bg-elevated': palette.elevated, text: palette.text, 'text-secondary': palette.muted, border: palette.border, 'border-secondary': palette.border, 'fill-tertiary': darkMode ? '#ffffff0d' : '#00000008' }
    for (const [key, color] of Object.entries(cssColors)) document.documentElement.style.setProperty(`--ant-color-${key}`, color)
    try { localStorage.setItem('firewatch-theme', darkMode ? 'dark' : 'light') } catch { /* Theme works without storage. */ }
  }, [darkMode])

  return (
    <ConfigProvider theme={darkMode ? darkThemeConfig : lightThemeConfig}>
      <AntApp message={{ duration: 5, maxCount: 3 }}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell darkMode={darkMode} onToggleDarkMode={setDarkMode} />}>
              <Route index element={<Suspense fallback={<Skeleton active />}><PortfolioPage /></Suspense>} />
              <Route path="briefing" element={<DashboardPage />} />
              <Route path="candidates" element={<Suspense fallback={<Skeleton active />}><CandidatesPage /></Suspense>} />
              <Route path="short-term" element={<Suspense fallback={<Skeleton active />}><CandidatesPage shortTerm /></Suspense>} />
              <Route
                path="indices"
                element={
                  <Suspense fallback={<Skeleton active />}>
                    <IndicesPage />
                  </Suspense>
                }
              />
              <Route
                path="news"
                element={
                  <Suspense fallback={<Skeleton active />}>
                    <NewsPage />
                  </Suspense>
                }
              />
              <Route
                path="game"
                element={
                  <Suspense fallback={<Skeleton active />}>
                    <GamePage />
                  </Suspense>
                }
              />
              <Route
                path="audit-log"
                element={
                  <Suspense fallback={<Skeleton active />}>
                    <AuditLogPage />
                  </Suspense>
                }
              />
              <Route
                path="stocks"
                element={
                  <Suspense fallback={<Skeleton active />}>
                    <StocksPage />
                  </Suspense>
                }
              />
              <Route
                path="settings"
                element={
                  <Suspense fallback={<Skeleton active />}>
                    <SettingsPage />
                  </Suspense>
                }
              />
              <Route
                path="guide"
                element={
                  <Suspense fallback={<Skeleton active />}>
                    <HelpPage />
                  </Suspense>
                }
              />
              <Route
                path="usage"
                element={
                  <Suspense fallback={<Skeleton active />}>
                    <HelpPage />
                  </Suspense>
                }
              />
              <Route
                path="privacy"
                element={
                  <Suspense fallback={<Skeleton active />}>
                    <PrivacyPage />
                  </Suspense>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
              <Route path="open-source" element={<Suspense fallback={<Skeleton active />}><OpenSourcePage /></Suspense>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}
