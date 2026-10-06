export interface GameMarketEvent {
  code: 'SIDECAR' | 'TRADING_HALT'
  title: string
  description: string
  blockedAssets: string[]
}
export interface GamePick { symbol: string; name: string; reason: string; risk: string; newsTitle: string }
export interface GamePriceDriver { instrumentType: string; symbol: string | null; scenario: string; newsTitle: string; marketPercent: number; sectorPercent: number; assetPercent: number; halted: boolean }
export interface GameAssetHistory {
  instrumentType: string
  symbol: string | null
  name: string
  points: { turnIndex: number; price: number }[]
}
export interface GamePositionTrade {
  instrumentType: string; symbol: string | null; action: 'BUY' | 'SELL'; quantity: number; price: number
}
// Moving-average open-position basis. Closing trades keep the remaining basis;
// crossing through zero starts a new long/short basis at that trade's price.
export function positionStats(trades: GamePositionTrade[], type: string, symbol: string | null, currentPrice: number | null) {
  let quantity = 0, averagePrice = 0
  for (const trade of trades.filter(t => t.instrumentType === type && t.symbol === symbol)) {
    const delta = trade.action === 'BUY' ? trade.quantity : -trade.quantity
    const next = quantity + delta
    if (quantity === 0 || Math.sign(quantity) === Math.sign(delta)) averagePrice = (Math.abs(quantity) * averagePrice + Math.abs(delta) * trade.price) / Math.abs(next)
    else if (Math.abs(next) < 1e-8) averagePrice = 0
    else if (Math.sign(next) !== Math.sign(quantity)) averagePrice = trade.price
    quantity = Math.abs(next) < 1e-8 ? 0 : next
  }
  const profit = currentPrice == null || !quantity ? null : quantity * (currentPrice - averagePrice)
  return { averagePrice: quantity ? averagePrice : null, profit, returnPercent: profit == null || !averagePrice ? null : profit / (Math.abs(quantity) * averagePrice) * 100 }
}
export function historyChange(history?: GameAssetHistory) {
  const latest = history?.points.at(-1), previous = history?.points.at(-2)
  return latest && previous && previous.price > 0 ? { difference: latest.price - previous.price, percent: (latest.price / previous.price - 1) * 100 } : null
}
export interface GameTurnContribution {
  instrumentType: string
  symbol: string | null
  name: string
  carriedQuantity: number
  previousPrice: number | null
  currentPrice: number | null
  profit: number | null
  reason: string
}
