import { fetchBriefingHistory } from '../../../lib/api'
import { useApi } from '../../../lib/useApi'

export function useBriefingHistory(days: number) {
  return useApi(() => fetchBriefingHistory(days), [days])
}
