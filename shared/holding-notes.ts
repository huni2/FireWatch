import type { HoldingNote, HoldingNoteDraft, Portfolio } from './investing'

export const emptyHoldingNote = (): HoldingNoteDraft => ({ reason: '', nextCheck: '', reviewDate: null, reflection: '' })
export const noteDraft = (note?: HoldingNote): HoldingNoteDraft => note ? { reason: note.reason, nextCheck: note.nextCheck, reviewDate: note.reviewDate, reflection: note.reflection } : emptyHoldingNote()
export const normalizedNote = (draft: HoldingNoteDraft): HoldingNoteDraft => ({ reason: draft.reason.trim(), nextCheck: draft.nextCheck.trim(), reviewDate: draft.reviewDate?.trim() || null, reflection: draft.reflection.trim() })
export const noteIsEmpty = (draft: HoldingNoteDraft) => { const n = normalizedNote(draft); return !n.reason && !n.nextCheck && !n.reviewDate && !n.reflection }
export function holdingNoteError(draft: HoldingNoteDraft): string | null {
  if (draft.reason.length > 500 || draft.nextCheck.length > 500) return '보유 이유와 다음 확인할 내용은 각각 500자까지 입력해주세요.'
  if (draft.reflection.length > 1000) return '돌아본 내용은 1,000자까지 입력해주세요.'
  const date = draft.reviewDate?.trim()
  if (date) {
    const parsed = new Date(`${date}T00:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < '2000-01-01' || date > '2100-12-31') return '재점검 날짜를 YYYY-MM-DD 형식으로 입력해주세요. (2000~2100년)'
  }
  return null
}
export function koreanToday(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
export function holdingNotePickerDate(reviewDate: string | null, now = new Date()): Date {
  const date = reviewDate?.trim() || null
  const selected = date && !holdingNoteError({ ...emptyHoldingNote(), reviewDate: date }) ? date : koreanToday(now)
  const [year, month, day] = selected.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}
export function holdingNoteDateText(reviewDate: string | null): string {
  const date = reviewDate?.trim()
  if (!date || holdingNoteError({ ...emptyHoldingNote(), reviewDate: date })) return '날짜 선택 (선택 사항)'
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][new Date(`${date}T12:00:00Z`).getUTCDay()]
  return `${date.replaceAll('-', '. ')}. (${weekday})`
}
export function noteDateLabel(note: HoldingNoteDraft, today = koreanToday()): string {
  if (!note.reviewDate) return '날짜 없이 보관 중'
  return note.reviewDate < today ? `다시 확인할 날짜가 지났어요 · ${holdingNoteDateText(note.reviewDate)}` : note.reviewDate === today ? '오늘 다시 확인하기' : `다시 확인할 날짜 · ${holdingNoteDateText(note.reviewDate)}`
}
export function holdingNoteRows(portfolio: Portfolio, today = koreanToday()) {
  const held = new Map(portfolio.holdings.map(row => [row.holding.symbol, row.holding.name]))
  return (portfolio.holdingNotes ?? []).map(note => ({ note, name: held.get(note.symbol) ?? note.name, archived: !held.has(note.symbol), due: !!note.reviewDate && note.reviewDate <= today }))
    .sort((a, b) => Number(b.due) - Number(a.due) || (a.note.reviewDate ?? '9999').localeCompare(b.note.reviewDate ?? '9999') || b.note.updatedAt.localeCompare(a.note.updatedAt))
}
