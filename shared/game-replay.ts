import { gameAssets } from './game-assets'
import type { GameAssetHistory, GamePick, GamePositionTrade, GamePriceDriver } from './game-turn'

interface ReplayTurn {
  turnIndex: number; cash: number; portfolioValue: number | null
  transactions: (GamePositionTrade & { turnIndex: number; total: number })[]
  holdings: { instrumentType: string; symbol: string | null; quantity: number; currentPrice: number | null }[]
  assetHistories?: GameAssetHistory[]; gamePicks?: GamePick[]; priceDrivers?: GamePriceDriver[]
  stockPrices: Record<string, number>
  briefing: { recommendedStocks: string[]; kospi: number | null; sp500?: number | null; usdKrw?: number | null; news: { title: string }[] }
}
const key = (type: string, symbol: string | null) => `${type}:${symbol ?? ''}`
const nameFor = (type: string, symbol: string | null) => symbol ? gameAssets.find(a => a.symbol === symbol)?.name ?? '가상 회사' : ({ KOSPI: '코스피', KOSDAQ: '코스닥', SP500: 'S&P 500', NASDAQ: '나스닥', DOW: '다우', GOLD: '금', SILVER: '은', USD: '달러' } as Record<string, string>)[type] ?? type
const priceFor = (turn: ReplayTurn, type: string, symbol: string | null) => turn.assetHistories?.find(h => h.instrumentType === type && h.symbol === symbol)?.points.at(-1)?.price ?? turn.holdings.find(h => h.instrumentType === type && h.symbol === symbol)?.currentPrice ?? (type === 'STOCK' ? turn.stockPrices[symbol ?? ''] : type === 'KOSPI' ? turn.briefing.kospi : null)
export function replayChoices(before: ReplayTurn) {
  return before.transactions.filter(t => t.turnIndex === before.turnIndex).map(t => ({ ...t, name: nameFor(t.instrumentType, t.symbol) }))
}
export function replayResults(before: ReplayTurn, after: ReplayTurn) {
  const targets = new Map<string, { instrumentType: string; symbol: string | null }>()
  for (const item of [...before.holdings, ...replayChoices(before)]) targets.set(key(item.instrumentType, item.symbol), item)
  return [...targets.values()].map(item => {
    const previous = priceFor(before, item.instrumentType, item.symbol), current = priceFor(after, item.instrumentType, item.symbol)
    const carried = before.holdings.find(h => h.instrumentType === item.instrumentType && h.symbol === item.symbol)?.quantity ?? 0
    return { ...item, name: nameFor(item.instrumentType, item.symbol), carried, previous, current, percent: previous != null && previous > 0 && current != null ? (current / previous - 1) * 100 : null, profit: previous != null && current != null ? carried * (current - previous) : null, driver: after.priceDrivers?.find(d => d.instrumentType === item.instrumentType && d.symbol === item.symbol) }
  })
}
export function replayPicks(before: ReplayTurn, after: ReplayTurn) {
  return before.briefing.recommendedStocks.map(name => {
    const asset = gameAssets.find(a => a.name === name || a.symbol === name)
    const previous = asset ? before.stockPrices[asset.symbol] : null, current = asset ? after.stockPrices[asset.symbol] : null
    return { name: asset?.name ?? name, percent: previous != null && previous > 0 && current != null ? (current / previous - 1) * 100 : null }
  })
}
export function replayIndicators(before: ReplayTurn, after: ReplayTurn) {
  return (['kospi', 'sp500', 'usdKrw'] as const).map(key => {
    const previous = before.briefing[key], current = after.briefing[key]
    return { name: { kospi: '가상 코스피', sp500: '가상 S&P 500', usdKrw: '가상 달러 지표' }[key], previous, current, percent: previous != null && previous > 0 && current != null ? (current / previous - 1) * 100 : null }
  })
}
