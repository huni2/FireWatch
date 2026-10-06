import { useState } from 'react'
import { parseStockNames, STOCK_NAMES_KEY, type StockNames } from '../../../../../shared/stock-labels'

export function useStockNames() {
  const [names, setNames] = useState<StockNames>(() => {
    try { return parseStockNames(localStorage.getItem(STOCK_NAMES_KEY)) } catch { return {} }
  })
  const rememberName = (symbol: string, name?: string) => {
    if (!name?.trim() || name === symbol) return
    const next = parseStockNames(JSON.stringify({ ...names, [symbol]: name }))
    setNames(next)
    try { localStorage.setItem(STOCK_NAMES_KEY, JSON.stringify(next)) } catch { /* Names still work for this session. */ }
  }
  return { names, rememberName }
}
