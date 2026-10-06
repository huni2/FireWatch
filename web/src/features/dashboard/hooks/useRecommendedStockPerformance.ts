import { useEffect, useState } from 'react'
import { fetchRecommendedStockPerformance, type RecommendedStockPerformance } from '../../../lib/api'
import { useApi } from '../../../lib/useApi'

const CACHE_KEY = 'firewatch-cached-recommended-performance'

function readCache(): RecommendedStockPerformance[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as RecommendedStockPerformance[]) : null
  } catch {
    return null
  }
}

// Render 콜드스타트로 로딩이 길어질 때(SlowLoadingHint) 빈 스켈레톤 대신 보여줄 "마지막으로 성공했을
// 때의 결과"를 localStorage에 들고 있는다 — 지금 로딩 중인 요청과는 별개로, 이전 성공 결과를 그대로
// 재사용(2026-10-06 사용자 제안).
export function useRecommendedStockPerformance() {
  const result = useApi(fetchRecommendedStockPerformance)
  const [cachedData, setCachedData] = useState<RecommendedStockPerformance[] | null>(readCache)

  useEffect(() => {
    if (result.data && result.data.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCachedData(result.data)
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(result.data))
      } catch {
        // localStorage를 못 쓰는 환경(프라이빗 모드 등) — 캐싱만 포기, 기능엔 영향 없음
      }
    }
  }, [result.data])

  return { ...result, cachedData }
}
