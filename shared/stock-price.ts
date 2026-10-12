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
