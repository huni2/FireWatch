import { fetchLatestBriefing } from '../../../lib/api'
import { ApiRequestError } from '../../../lib/api'
import { useApi } from '../../../lib/useApi'

// 404(오늘자 브리핑 없음)는 에러가 아니라 정상적인 "아직 없음" 상태로 다룬다 — Design §5.4 Empty state.
export function useLatestBriefing() {
  const result = useApi(async () => {
    try {
      return await fetchLatestBriefing()
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        return null
      }
      throw err
    }
  })
  return result
}
