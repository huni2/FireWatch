// Fictional companies. Prices and news come exclusively from the seeded game simulator.
export const gameAssets = [
  { symbol: 'AURA', name: '오로라 반도체', exchange: '가상 시장' },
  { symbol: 'NEO', name: '네오 모빌리티', exchange: '가상 시장' },
  { symbol: 'SOLAR', name: '솔라 에너지', exchange: '가상 시장' },
  { symbol: 'LUMEN', name: '루멘 헬스', exchange: '가상 시장' },
  { symbol: 'NEXUS', name: '넥서스 클라우드', exchange: '가상 시장' },
]
export const searchGameAssets = (query: string) => gameAssets.filter(a => `${a.name} ${a.symbol}`.toLowerCase().includes(query.trim().toLowerCase()))
