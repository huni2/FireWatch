import type { Portfolio } from './investing'

function koreaDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) : null
}

// Record-edit time is not a price timestamp. Summarise only included valuations.
export function portfolioAsOf(portfolio: Portfolio): string {
  if (!portfolio.holdings.length) return '직접 등록한 현금 기록 기준이에요.'
  const included = portfolio.holdings.filter(row => row.valueKrw != null)
  if (!included.length) return '계산에 필요한 가격·환율이 아직 확인되지 않았어요.'
  const dates = included.map(row => koreaDate(row.quoteAsOf))
  let label = dates.some(date => !date) ? '일부 종목의 시세 기준 날짜를 확인하지 못했어요.'
    : new Set(dates).size > 1 ? '종목별 시세 기준 날짜가 달라요. 보유 목록에서 확인해주세요.'
    : `시세 기준 ${dates[0]} (한국 시간)`
  if (included.some(row => row.holding.currency === 'USD')) {
    const fxDate = koreaDate(portfolio.fxAsOf)
    label += fxDate ? ` · 환율 기준 ${fxDate}` : ' · 환율 기준 날짜 확인 필요'
  }
  return label
}
