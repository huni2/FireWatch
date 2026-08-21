import { lazy, Suspense, useState } from 'react'
import { ConfigProvider, Skeleton } from 'antd'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { darkThemeConfig, lightThemeConfig } from './lib/theme'

// 첫 화면(대시보드)만 즉시 로드하고 나머지 페이지는 방문 시점에 필요한 JS만 내려받는다
// — 번들 하나(1.6MB)에 다 뭉쳐 있어 초기 로딩이 느리다는 지적(2026-08-21)에 따른 라우트별 코드 스플리팅.
const AuditLogPage = lazy(() => import('./features/audit-log/AuditLogPage').then((m) => ({ default: m.AuditLogPage })))
const StocksPage = lazy(() => import('./features/stocks/StocksPage').then((m) => ({ default: m.StocksPage })))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))

// OpenQuestions.md — 다크 모드 기본값 미정이라 라이트를 기본으로, 토글로 전환 가능하게 구현.
export default function App() {
  const [darkMode, setDarkMode] = useState(false)

  return (
    <ConfigProvider theme={darkMode ? darkThemeConfig : lightThemeConfig}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell darkMode={darkMode} onToggleDarkMode={setDarkMode} />}>
            <Route index element={<DashboardPage />} />
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
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}
