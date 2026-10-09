// Fictional companies. Prices and news come exclusively from the seeded game simulator.
export interface GameCompany { symbol: string; name: string; sector?: string; aliases?: string[]; source?: string | null; verifiedAt?: string | null; exchange: string }
export const gameAssets: GameCompany[] = [
  { symbol: 'AURA', name: '오로라 반도체', exchange: '가상 시장' },
  { symbol: 'NEO', name: '네오 모빌리티', exchange: '가상 시장' },
  { symbol: 'SOLAR', name: '솔라 에너지', exchange: '가상 시장' },
  { symbol: 'LUMEN', name: '루멘 헬스', exchange: '가상 시장' },
  { symbol: 'NEXUS', name: '넥서스 클라우드', exchange: '가상 시장' },
]
export const searchGameAssets = (query: string, assets = gameAssets) => assets.filter(a => [a.name, a.symbol, ...(a.aliases ?? [])].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
export const assetsForGame = (turn: { simulationVersion?: number | null; gameAssets?: Omit<GameCompany, 'exchange'>[] } | null): GameCompany[] => turn?.gameAssets?.length ? turn.gameAssets.map(a => ({ ...a, exchange: '가상 시장' })) : turn?.simulationVersion && turn.simulationVersion !== 1 ? [] : gameAssets
export const filterGameAssets = (assets: GameCompany[], query: string, sector: string) => searchGameAssets(query, assets).filter(a => !sector || a.sector === sector)
