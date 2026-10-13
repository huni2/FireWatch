export function formatStockPrice(value: number, currency?: string | null): string {
  if (currency && /^[A-Z]{3}$/.test(currency)) {
    try { return new Intl.NumberFormat('ko-KR', { style: 'currency', currency, maximumFractionDigits: currency === 'KRW' ? 0 : 2 }).format(value) } catch { /* Unknown currency: keep the value without inventing a unit. */ }
  }
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })} (통화 정보 없음)`
}

export function formatPriceAxis(value: number): string {
  if (!Number.isFinite(value)) return ''
  const magnitude = Math.abs(value)
  if (magnitude >= 1e8) return `${(value / 1e8).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`
  if (magnitude >= 1e4) return `${(value / 1e4).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만`
  return value.toLocaleString('ko-KR', { maximumFractionDigits: magnitude < 100 ? 2 : 0 })
}

// A price chart is not a balance chart: zero is not its reading baseline.
// Keep at least 0.5% of the starting price visible so tiny moves are not
// stretched into dramatic mountains. The caption always reports the real move.
export function stockPriceWindow(prices: number[], currency?: string | null) {
  const values = prices.filter(value => Number.isFinite(value) && value > 0)
  if (!values.length) return null
  const first = values[0], last = values.at(-1)!
  const lowest = Math.min(...values), highest = Math.max(...values)
  const unit = currency === 'KRW' ? 1 : .01
  const span = Math.max(highest - lowest, first * .005, unit * 4)
  const middle = (lowest + highest) / 2
  const minimum = Math.max(0, Math.floor((middle - span * .65) / unit) * unit)
  const maximum = Math.ceil((middle + span * .65) / unit) * unit
  const change = last - first
  return { minimum, maximum, first, last, change, percent: change / first * 100, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat' } as const
}

export function formatPriceChange(change: number, percent: number, currency?: string | null) {
  const sign = change > 0 ? '+' : change < 0 ? '−' : ''
  const magnitude = Math.abs(percent)
  const percentage = magnitude > 0 && magnitude < .01 ? '0.01% 미만' : `${magnitude.toFixed(2)}%`
  return `선택 기간 첫 기록보다 ${sign}${percentage} (${sign}${formatStockPrice(Math.abs(change), currency)})`
}
