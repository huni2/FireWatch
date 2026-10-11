// 웹과 Android의 뉴스 기간 입력을 같은 한국 날짜 형식으로 검증한다.
export function newsDateRangeError(from: string, to: string): string {
  for (const value of [from, to]) {
    if (!value) continue
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '날짜를 YYYY-MM-DD 형식으로 입력해주세요.'
    const date = new Date(`${value}T00:00:00Z`)
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return '달력에 있는 날짜로 입력해주세요.'
  }
  return from && to && from > to ? '마지막 날짜는 시작 날짜 이후로 선택해주세요.' : ''
}
