export const marketMetrics = [
  { key: 'kospi', label: '코스피', group: '주가지수', unit: 'pt' },
  { key: 'kosdaq', label: '코스닥', group: '주가지수', unit: 'pt' },
  { key: 'sp500', label: 'S&P 500', group: '주가지수', unit: 'pt' },
  { key: 'nasdaq', label: '나스닥', group: '주가지수', unit: 'pt' },
  { key: 'dow', label: '다우존스', group: '주가지수', unit: 'pt' },
  { key: 'usdKrw', label: '달러/원', group: '환율', unit: '원' },
  { key: 'jpy100Krw', label: '100엔/원', group: '환율', unit: '원' },
  { key: 'cnyKrw', label: '위안/원', group: '환율', unit: '원' },
  { key: 'goldPrice', label: '금', group: '원자재·채권', unit: 'USD/oz' },
  { key: 'silverPrice', label: '은', group: '원자재·채권', unit: 'USD/oz' },
  { key: 'usBondYield10y', label: '미국채 10년물', group: '원자재·채권', unit: '%' },
  { key: 'krBondYield10y', label: '한국국채 10년물', group: '원자재·채권', unit: '%' },
] as const
export type MarketMetricKey = typeof marketMetrics[number]['key']
export type MarketRecord = { briefingDate: string } & Partial<Record<MarketMetricKey, number | null>>
export function marketHistoryWindow(days: number, now = Date.now()) {
  const end = new Date(now + 9 * 3600000).toISOString().slice(0, 10)
  const from = new Date(Date.parse(`${end}T00:00:00Z`) - (days - 1) * 86400000).toISOString().slice(0, 10)
  return { from, to: end }
}
export function marketPoints(records: MarketRecord[], key: MarketMetricKey, from: string, to: string) {
  const points = new Map<string, { date: string; value: number }>()
  for (const record of records) {
    const value = record[key]
    if (record.briefingDate < from || record.briefingDate > to || typeof value !== 'number' || !Number.isFinite(value) || points.has(record.briefingDate)) continue
    points.set(record.briefingDate, { date: record.briefingDate, value })
  }
  return [...points.values()].sort((a, b) => a.date.localeCompare(b.date))
}
