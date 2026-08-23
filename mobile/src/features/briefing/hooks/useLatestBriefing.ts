// 오늘의 브리핑 조회 + 오프라인 캐시 폴백. Design Ref: mobile-app.design.md §2.2 Data Flow.
import { useEffect, useState } from 'react'

import { fetchLatestBriefing, type Briefing } from '@/lib/api'
import { loadCachedBriefing, saveCachedBriefing } from '@/lib/offlineCache'

interface LatestBriefingState {
  briefing: Briefing | null
  cachedAt: string | null // null이면 방금 받은 실시간 데이터, 값이 있으면 그 시각의 캐시를 보여주는 중
  loading: boolean
}

export function useLatestBriefing() {
  const [state, setState] = useState<LatestBriefingState>({
    briefing: null,
    cachedAt: null,
    loading: true,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const briefing = await fetchLatestBriefing()
        await saveCachedBriefing(briefing)
        if (!cancelled) setState({ briefing, cachedAt: null, loading: false })
      } catch {
        const cached = await loadCachedBriefing()
        if (!cancelled) {
          setState({ briefing: cached, cachedAt: cached?.cachedAt ?? null, loading: false })
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
