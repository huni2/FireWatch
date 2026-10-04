import { fetchRecommendedStockPerformance } from '../../../lib/api'
import { useApi } from '../../../lib/useApi'

export function useRecommendedStockPerformance() {
  return useApi(fetchRecommendedStockPerformance)
}
