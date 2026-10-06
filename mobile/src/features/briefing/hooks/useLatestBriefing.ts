// 오늘의 브리핑 조회 + 오프라인 캐시 폴백. Design Ref: mobile-app.design.md §2.2 Data Flow.
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'

import { fetchLatestBriefing, type Briefing } from '@/lib/api'
import { loadCachedBriefing, saveCachedBriefing } from '@/lib/offlineCache'

interface LatestBriefingState {
  briefing: Briefing | null
  cachedAt: string | null // null이면 방금 받은 실시간 데이터, 값이 있으면 그 시각의 캐시를 보여주는 중
  loading: boolean
  error: string | null
}

export function useLatestBriefing() {
  const [state, setState] = useState<LatestBriefingState>({
    briefing: null,
    cachedAt: null,
    loading: true,
    error: null,
  })

  const generation = useRef(0)
  const reload = useCallback(async () => {
    const id = ++generation.current
    setState(s => ({ ...s, loading: !s.briefing, error: null }))
    try {
      const briefing = await fetchLatestBriefing()
      if (id === generation.current) setState({ briefing, cachedAt: null, loading: false, error: null })
      void saveCachedBriefing(briefing).catch(() => {})
    } catch (e) {
      if (id === generation.current) setState(s => ({ ...s, loading: false, error: e instanceof Error ? e.message : '브리핑을 불러오지 못했습니다.' }))
    }
  }, [])
  useEffect(() => {
    let active = true
    const requestGeneration = generation
    void loadCachedBriefing().catch(() => null).then(cached => {
      if (!active) return
      if (cached) setState({ briefing: cached, cachedAt: cached.cachedAt, loading: false, error: null })
      void reload()
    })
    const listener = AppState.addEventListener('change', status => { if (status === 'active') void reload() })
    return () => { active = false; requestGeneration.current++; listener.remove() }
  }, [reload])
  return { ...state, reload }
}
