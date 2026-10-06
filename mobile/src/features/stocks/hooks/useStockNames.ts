import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useRef, useState } from 'react'
import { parseStockNames, STOCK_NAMES_KEY, type StockNames } from '../../../../../shared/stock-labels'

export function useStockNames() {
  const [names, setNames] = useState<StockNames>({})
  const currentNames = useRef<StockNames>({})
  useEffect(() => {
    let active = true
    AsyncStorage.getItem(STOCK_NAMES_KEY).then(raw => {
      if (!active) return
      currentNames.current = { ...parseStockNames(raw), ...currentNames.current }
      setNames(currentNames.current)
    }).catch(() => {})
    return () => { active = false }
  }, [])
  const rememberName = (symbol: string, name?: string) => {
    if (!name?.trim() || name === symbol) return
    const next = parseStockNames(JSON.stringify({ ...currentNames.current, [symbol]: name }))
    currentNames.current = next
    setNames(next)
    void AsyncStorage.setItem(STOCK_NAMES_KEY, JSON.stringify(next)).catch(() => {})
  }
  return { names, rememberName }
}
