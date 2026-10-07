export type RankingTab = 'board' | 'winners' | 'publish' | 'mine'
export type RankingDifficulty = 'EASY' | 'NORMAL' | 'HARD'
export interface RankingEntry {
  id: string; nickname: string; weekStart: string; board: 'FINISHED' | 'PROGRESS'
  difficulty: RankingDifficulty; shortSelling: boolean; turnIndex: number
  returnPercent: number; submittedAt: string; visible: boolean
}
export interface RankingBoard {
  weekStart: string; closesAt: string; closed: boolean; total: number; page: number
  entries: { rank: number; entry: RankingEntry }[]
}
export interface RankingMine { nickname: string | null; entries: RankingEntry[]; total: number; page: number }
export interface RankingGame { sessionId: number; turnIndex: number; totalTurns: number; status: 'ACTIVE' | 'ENDED'; simulation: boolean; returnPercent: number | null }
export const rankingDifficulties = { EASY: '여유롭게', NORMAL: '균형 있게', HARD: '신중하게' }
export const rankingScore = (score: number) => `${score > 0 ? '+' : ''}${score.toFixed(2)}%`
export const rankingLeague = (e: RankingEntry) => `${rankingDifficulties[e.difficulty]} · 공매도 ${e.shortSelling ? '허용' : '없음'}`
export const rankingGameBoard = (g: RankingGame) => g.status === 'ENDED' && g.turnIndex === g.totalTurns - 1 ? '24턴 완주' : `${g.turnIndex + 1}턴 기록`
export function rankingWeek(offset = 0, now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3600_000)
  kst.setUTCDate(kst.getUTCDate() - (kst.getUTCDay() + 6) % 7 + offset * 7)
  return kst.toISOString().slice(0, 10)
}
export const rankingQuery = (week: string, difficulty: RankingDifficulty, shortSelling: boolean, board: string, turn: number, page: number) => new URLSearchParams({ week, difficulty, shortSelling: String(shortSelling), board, turn: String(turn), page: String(page) }).toString()
