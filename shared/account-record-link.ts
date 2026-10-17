import type { Holding } from './investing'

export interface AccountRecordSnapshot {
  holdings: Holding[]
  cash: number
  watchedStocks: string[]
  watchedNames?: Record<string, string>
  noteCount?: number
  goal: string
  accountType: string
}
export interface AccountRecordComparison { fingerprint: string; device: AccountRecordSnapshot; account: AccountRecordSnapshot }
export interface AccountRecordChoice { mode: 'ACCOUNT' | 'MERGE_ACCOUNT' | 'MERGE_DEVICE'; cashSource: 'ACCOUNT' | 'DEVICE'; fingerprint: string }
export function accountRecordErrorMessage(error: { message: string; details?: Record<string, unknown> }): string {
  const fields = error.details?.fieldErrors
  const hint = fields && typeof fields === 'object' ? Object.values(fields).find(value => typeof value === 'string') : null
  return hint ? `${error.message} ${hint}` : error.message
}
export function accountRecordComparison(error: { code: string; details?: Record<string, unknown> }): AccountRecordComparison | null {
  if (error.code !== 'ACCOUNT_RECORD_CHOICE_REQUIRED') return null
  const c = error.details?.comparison as AccountRecordComparison | undefined
  function snapshotValid(s?: AccountRecordSnapshot) {
    return !!s && Number.isFinite(s.cash) && s.cash >= 0 && Array.isArray(s.holdings)
      && (s.noteCount === undefined || (Number.isInteger(s.noteCount) && s.noteCount >= 0 && s.noteCount <= 100))
      && s.holdings.every(h => h && typeof h.symbol === 'string' && typeof h.name === 'string' && Number.isFinite(h.quantity)
        && (h.averageCost == null || Number.isFinite(h.averageCost)))
      && Array.isArray(s.watchedStocks) && s.watchedStocks.every(s => typeof s === 'string')
  }
  return c && /^[a-f0-9]{64}$/.test(c.fingerprint) && snapshotValid(c.device) && snapshotValid(c.account) ? c : null
}
export function accountRecordSummary(c: AccountRecordComparison) {
  const account = new Set(c.account.holdings.map(h => h.symbol.toUpperCase()))
  return { duplicates: c.device.holdings.filter(h => account.has(h.symbol.toUpperCase())),
    holdings: new Set([...account, ...c.device.holdings.map(h => h.symbol.toUpperCase())]).size,
    watches: new Set([...c.account.watchedStocks, ...c.device.watchedStocks].map(s => s.toUpperCase())).size }
}
