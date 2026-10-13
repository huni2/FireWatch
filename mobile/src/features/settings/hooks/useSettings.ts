// 현재 설정 조회. Design Ref: mobile-app.design.md §5.4.
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { ScreenActivity } from '@/lib/screenActivity'

import { fetchSettings, onSettingsChanged, type Settings } from '@/lib/api'

interface SettingsState {
  settings: Settings | null
  loading: boolean
}

export function useSettings(live = false) {
  const active = useContext(ScreenActivity)
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
    if (live && !active) return
    const pending = generation
    // 편집 중인 설정 폼은 다른 화면의 갱신으로 덮어쓰지 않는다.
    const unsubscribe = live ? onSettingsChanged(() => { void reload() }) : () => {}
    // Server responses update state after await; reload never sets it synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
    return () => { pending.current++; unsubscribe() }
  }, [reload, live, active])
  const accept = useCallback((settings: Settings) => {
    generation.current++
    setState({ settings, loading: false })
  }, [])
  return { ...state, reload, accept }
}
