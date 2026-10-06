import { fetchLatestBriefing } from '../../../lib/api'
import { ApiRequestError } from '../../../lib/api'
import { useApi } from '../../../lib/useApi'

// latest returns the last stored briefing on/before today. A 404 now means no stored briefing.
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
