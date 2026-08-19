import { useState } from 'react'
import { ConfigProvider } from 'antd'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { AuditLogPage } from './features/audit-log/AuditLogPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { darkThemeConfig, lightThemeConfig } from './lib/theme'

// OpenQuestions.md — 다크 모드 기본값 미정이라 라이트를 기본으로, 토글로 전환 가능하게 구현.
export default function App() {
  const [darkMode, setDarkMode] = useState(false)

  return (
    <ConfigProvider theme={darkMode ? darkThemeConfig : lightThemeConfig}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell darkMode={darkMode} onToggleDarkMode={setDarkMode} />}>
            <Route index element={<DashboardPage />} />
            <Route path="audit-log" element={<AuditLogPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}
