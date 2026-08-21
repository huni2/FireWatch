// 설정에 저장된 관심 종목 각각의 최근 종가/전일 대비 등락을 가져와 대시보드 미니 요약에 쓴다.
import { fetchSettings, fetchStockHistory } from '../../../lib/api'
import { useApi } from '../../../lib/useApi'

export interface WatchlistSummaryItem {
  symbol: string
  latest: number | null
  previous: number | null
}

async function loadWatchlistSummary(): Promise<WatchlistSummaryItem[]> {
  const settings = await fetchSettings()
  return Promise.all(
    settings.watchedStocks.map(async (symbol): Promise<WatchlistSummaryItem> => {
      try {
        const history = await fetchStockHistory(symbol) // 기본 6개월 일봉 — 최신/전일 종가 비교용
        const points = history.points
        return {
          symbol,
          latest: points.at(-1)?.close ?? null,
          previous: points.at(-2)?.close ?? null,
        }
      } catch {
        return { symbol, latest: null, previous: null }
      }
    }),
  )
}

export function useWatchlistSummary() {
  return useApi(loadWatchlistSummary)
}
