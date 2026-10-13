// web/src/features/stocks/hooks/useStockHistory.ts와 동일 역할 — 선택 종목의 시세 이력 조회.
// range='1d'일 때는 POLL_INTERVAL_MS마다 다시 불러와 실시간처럼 보이게 한다(웹과 동일 절충).
import { useCallback, useContext, useEffect, useState } from 'react'

import { ScreenActivity } from '@/lib/screenActivity'
import { fetchStockHistory, type StockChartRange, type StockHistory } from '@/lib/api'

const POLL_INTERVAL_MS = 30_000

interface StockHistoryState {
  key: string
  data: StockHistory | null
  loading: boolean
  refreshing: boolean
  error: Error | null
}

export function useStockHistory(symbol: string | null, range: StockChartRange) {
  const active = useContext(ScreenActivity)
  const key = `${symbol ?? ''}:${range}`
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision(value => value + 1), [])
  const [state, setState] = useState<StockHistoryState>({ key: '', data: null, loading: true, refreshing: false, error: null })

  useEffect(() => {
    if (!active) return
    if (!symbol) {
      setState({ key, data: null, loading: false, refreshing: false, error: null })
      return
    }
    const activeSymbol = symbol

    let cancelled = false, inFlight = false

    async function load() {
      if (cancelled || inFlight) return
      inFlight = true
      setState(prev => {
        const data = prev.key === key ? prev.data : null
        return { key, data, loading: !data, refreshing: !!data, error: null }
      })
      try {
        const data = await fetchStockHistory(activeSymbol, range)
        if (!cancelled) setState({ key, data, loading: false, refreshing: false, error: null })
      } catch (error) {
        if (!cancelled) setState(prev => ({ key, data: prev.key === key ? prev.data : null, loading: false, refreshing: false, error: error instanceof Error ? error : new Error('시세를 확인하지 못했어요.') }))
      } finally {
        inFlight = false
      }
    }

    const initial = setTimeout(() => { void load() }, 0)
    const timer = range === '1d' ? setInterval(load, POLL_INTERVAL_MS) : null
    return () => {
      cancelled = true
      clearTimeout(initial)
      if (timer) clearInterval(timer)
    }
  }, [symbol, range, key, active, revision])

  // Never show the previous symbol/range while the next effect is starting.
  return { ...state, data: state.key === key ? state.data : null, error: state.key === key ? state.error : null, loading: state.key !== key || state.loading, refreshing: state.key === key && state.refreshing, reload }
}
