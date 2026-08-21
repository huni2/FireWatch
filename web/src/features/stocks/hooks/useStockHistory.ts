// 선택된 종목 티커의 시세 이력을 가져오는 훅. range='1d'(오늘, 분봉)일 때는 진짜 실시간 스트리밍이
// 아니라 POLL_INTERVAL_MS마다 다시 불러오는 폴링으로 근사한다 — 가입/키가 필요한 유료 실시간 API 없이도
// "실시간처럼" 보이게 하려는 절충(2026-08-21 사용자 요청).
import { useEffect } from 'react'
import { fetchStockHistory, type StockChartRange } from '../../../lib/api'
import { useApi } from '../../../lib/useApi'

const POLL_INTERVAL_MS = 30_000

export function useStockHistory(symbol: string | null, range: StockChartRange) {
  const result = useApi(() => {
    if (!symbol) return Promise.resolve(null)
    return fetchStockHistory(symbol, range)
  }, [symbol, range])

  useEffect(() => {
    if (range !== '1d' || !symbol) return
    const timer = setInterval(result.reload, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [range, symbol, result.reload])

  return result
}
