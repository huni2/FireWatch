// 가상 주간 게임의 시간 표시와 분야·보유 기업 뉴스 탐색을 웹과 앱에서 함께 사용한다.
import type { GameCompany } from './game-assets'
export const isWeeklyGame = (turn: { simulationVersion?: number | null } | null) => (turn?.simulationVersion ?? 0) >= 3
export const gamePeriod = (turn: { simulationVersion?: number | null } | null) => isWeeklyGame(turn) ? '주' : '턴'
export function gameNews<T extends { title: string }>(news: T[], companies: GameCompany[], holdings: { symbol: string | null }[], sector: string, heldOnly: boolean): T[] {
  const held = new Set(holdings.map(h => h.symbol).filter(Boolean))
  const heldSectors = new Set(companies.filter(c => held.has(c.symbol)).map(c => c.sector))
  const relevant = (item: T) => companies.some(c => held.has(c.symbol) && item.title.includes(c.name)) || [...heldSectors].some(s => s && item.title.includes(`[${s}]`))
  return news.filter(item => (!sector || item.title.includes(`[${sector}]`) || item.title.includes('[시장]')) && (!heldOnly || relevant(item) || item.title.includes('[시장]')))
    .map((item, index) => ({ item, index, priority: relevant(item) ? 0 : item.title.includes('[시장]') ? 1 : 2 }))
    .sort((a, b) => a.priority - b.priority || a.index - b.index).map(x => x.item)
}
