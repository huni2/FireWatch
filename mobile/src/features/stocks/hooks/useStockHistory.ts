// web/src/features/stocks/hooks/useStockHistory.ts와 동일 역할 — 선택 종목의 시세 이력 조회.
// range='1d'일 때는 POLL_INTERVAL_MS마다 다시 불러와 실시간처럼 보이게 한다(웹과 동일 절충).
import { useEffect, useState } from 'react'

import { fetchStockHistory, type StockChartRange, type StockHistory } from '@/lib/api'

const POLL_INTERVAL_MS = 30_000

interface StockHistoryState {
  data: StockHistory | null
  loading: boolean
  error: Error | null
}

export function useStockHistory(symbol: string | null, range: StockChartRange) {
  const [state, setState] = useState<StockHistoryState>({ data: null, loading: true, error: null })

  useEffect(() => {
    if (!symbol) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ data: null, loading: false, error: null })
      return
    }
    const activeSymbol = symbol

    let cancelled = false

    async function load() {
      setState((prev) => ({ ...prev, loading: true }))
      try {
        const data = await fetchStockHistory(activeSymbol, range)
        if (!cancelled) setState({ data, loading: false, error: null })
      } catch (error) {
        if (!cancelled) setState({ data: null, loading: false, error: error as Error })
      }
    }

    load()
    const timer = range === '1d' ? setInterval(load, POLL_INTERVAL_MS) : null
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [symbol, range])

  return state
}
