// 선택된 종목 티커의 시세 이력을 가져오는 훅 — symbol이 바뀌면 재조회한다.
import { fetchStockHistory } from '../../../lib/api'
import { useApi } from '../../../lib/useApi'

export function useStockHistory(symbol: string | null) {
  return useApi(() => {
    if (!symbol) return Promise.resolve(null)
    return fetchStockHistory(symbol)
  }, [symbol])
}
