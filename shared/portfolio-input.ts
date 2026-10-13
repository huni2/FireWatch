// Korean/US grouping commas are accepted, malformed grouping is not silently changed.
export function parsePortfolioNumber(input: string): number {
  const text = input.trim()
  if (!text) return 0
  if (!/^(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{0,4})?|\.\d{1,4})$/.test(text)) return NaN
  return Number(text.replaceAll(',', ''))
}

export function portfolioNumberHint(input: string, unit: string): string | undefined {
  const value = parsePortfolioNumber(input)
  return input.trim() && Number.isFinite(value) ? `입력한 값 ${value.toLocaleString('ko-KR', { maximumFractionDigits: 4 })}${unit}` : undefined
}
