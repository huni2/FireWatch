import koreanNames from './stock-names.json'
import { findCompany } from './discovery'

export type StockNames = Record<string, string>
export const STOCK_NAMES_KEY = 'firewatch:stockNames'
export function parseStockNames(raw: string | null): StockNames {
  try {
    const value: unknown = JSON.parse(raw ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([symbol, name]) => /^[A-Za-z0-9]+(\.[A-Za-z0-9]+)?$/.test(symbol) && typeof name === 'string' && name.trim().length > 0).slice(-200))
  } catch { return {} }
}
export function stockName(symbol: string, names: StockNames = {}): string {
  return findCompany(symbol)?.name ?? (koreanNames as StockNames)[symbol] ?? names[symbol] ?? symbol
}
export function stockLabel(symbol: string, names: StockNames = {}): string {
  const name = stockName(symbol, names)
  return name === symbol ? '회사명 확인 필요' : name
}
