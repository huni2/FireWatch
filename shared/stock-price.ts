export function formatStockPrice(value: number, currency?: string | null): string {
  if (currency && /^[A-Z]{3}$/.test(currency)) {
    try { return new Intl.NumberFormat('ko-KR', { style: 'currency', currency, maximumFractionDigits: currency === 'KRW' ? 0 : 2 }).format(value) } catch { /* Unknown currency: keep the value without inventing a unit. */ }
  }
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })} (통화 정보 없음)`
}
