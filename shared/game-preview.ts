interface VirtualTurn {
  turnIndex: number; status: string; cash: number; allowShortSelling: boolean; stockPrices: Record<string, number>
  briefing: { kospi: number | null; kosdaq?: number | null; sp500?: number | null; nasdaq?: number | null; dow?: number | null; goldPrice: number | null; silverPrice?: number | null; usdKrw?: number | null }
  holdings: { instrumentType: string; symbol: string | null; quantity: number }[]
  marketEvents?: { description: string; blockedAssets: string[] }[]
}
// Instant display calculation only. Server checks turn, price, cash, quantity and idempotency at execution.
export function virtualOrderPreview<T extends string>(turn: VirtualTurn, instrumentType: T, symbol: string | null, action: 'BUY' | 'SELL', quantity: number | null) {
  if (turn.status !== 'ACTIVE' || quantity == null || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1e9 || Math.abs(quantity * 1e4 - Math.round(quantity * 1e4)) > .001) return null
  const b = turn.briefing
  const prices: Record<string, number | null | undefined> = { KOSPI: b.kospi, KOSDAQ: b.kosdaq, SP500: b.sp500, NASDAQ: b.nasdaq, DOW: b.dow, GOLD: b.goldPrice, SILVER: b.silverPrice, USD: b.usdKrw }
  const unitPrice = instrumentType === 'STOCK' ? turn.stockPrices[symbol ?? ''] : prices[instrumentType]
  if (unitPrice == null || unitPrice <= 0) return null
  const owned = turn.holdings.find(h => h.instrumentType === instrumentType && h.symbol === symbol)?.quantity ?? 0
  const total = Number((unitPrice * quantity).toFixed(8))
  const blocked = turn.marketEvents?.find(e => e.blockedAssets.includes(instrumentType === 'STOCK' ? `STOCK:${symbol}` : instrumentType))
  const allowed = !blocked && (action === 'BUY' ? total <= turn.cash : turn.allowShortSelling || quantity <= owned)
  return { turnIndex: turn.turnIndex, instrumentType, symbol, action, quantity, unitPrice, total, cashAfter: Number((turn.cash + (action === 'BUY' ? -total : total)).toFixed(8)), quantityAfter: owned + (action === 'BUY' ? quantity : -quantity), allowed, reason: blocked?.description ?? (allowed ? null : action === 'BUY' ? '현금이 부족합니다.' : '보유 수량보다 많이 팔 수 없습니다.') }
}
