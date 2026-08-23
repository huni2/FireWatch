import { useCallback, useEffect, useState } from 'react'

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  reload: () => void
}

// Plan §7.2 결정 — 전역 상태 라이브러리(TanStack Query 등) 없이 로컬 상태만으로 API 호출을 다룬다.

// Render 무료 티어 콜드스타트가 최대 90초+ 걸릴 수 있어(2026-08-23 실측) — 첫 요청이 그 사이에
// 실패하면 바로 에러를 보여주는 게 "그냥 깨어나는 중"인데 마치 고장난 것처럼 보이는 문제가 있었다
// (2026-08-23 사용자 지적). 실패해도 곧바로 에러로 넘기지 않고 이 간격만큼 재시도하면서 loading을
// 유지하고, 전부 실패했을 때만 최종 에러를 보여준다. 누적 약 89초 — 실측된 최악의 콜드스타트를 커버.
const RETRY_DELAYS_MS = [2000, 4000, 8000, 15000, 25000, 35000]

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const attempt = (retryIndex: number) => {
      fetcher()
        .then((result) => {
          if (cancelled) return
          setData(result)
          setLoading(false)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          const delay = RETRY_DELAYS_MS[retryIndex]
          if (delay != null) {
            setTimeout(() => {
              if (!cancelled) attempt(retryIndex + 1)
            }, delay)
            return
          }
          setError(err instanceof Error ? err : new Error(String(err)))
          setLoading(false)
        })
    }
    attempt(0)

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey])

  return { data, loading, error, reload }
}
