// 현재 설정 조회. Design Ref: mobile-app.design.md §5.4.
import { useEffect, useState } from 'react'

import { fetchSettings, type Settings } from '@/lib/api'

interface SettingsState {
  settings: Settings | null
  loading: boolean
}

export function useSettings() {
  const [state, setState] = useState<SettingsState>({ settings: null, loading: true })

  useEffect(() => {
    let cancelled = false
    fetchSettings()
      .then((settings) => {
        if (!cancelled) setState({ settings, loading: false })
      })
      .catch(() => {
        if (!cancelled) setState({ settings: null, loading: false })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
