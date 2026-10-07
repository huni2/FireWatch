// 현재 설정 조회. Design Ref: mobile-app.design.md §5.4.
import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchSettings, type Settings } from '@/lib/api'

interface SettingsState {
  settings: Settings | null
  loading: boolean
}

export function useSettings() {
  const [state, setState] = useState<SettingsState>({ settings: null, loading: true })
  const generation = useRef(0)
  const reload = useCallback(async () => {
    const current = ++generation.current
    try {
      const settings = await fetchSettings()
      if (current === generation.current) setState({ settings, loading: false })
    } catch {
      if (current === generation.current) setState({ settings: null, loading: false })
    }
  }, [])
  useEffect(() => {
    const pending = generation
    // Server responses update state after await; reload never sets it synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
    return () => { pending.current++ }
  }, [reload])
  return { ...state, reload }
}
