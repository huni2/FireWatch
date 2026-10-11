// 등록된 분야·거래 통화·ETF 지수명만 묶어 투자 연결을 보여준다.
import type { Portfolio } from './investing'

export type ConnectionKind = 'sector' | 'currency' | 'index'
export interface PortfolioConnection { key: string; label: string; symbols: string[]; names: string[]; weight: number | null }
export const connectionLabels: Record<ConnectionKind, string> = { sector: '분야', currency: '거래 통화', index: 'ETF 지수' }
export function portfolioConnections(portfolio: Portfolio, kind: ConnectionKind): PortfolioConnection[] {
  const groups = new Map<string, PortfolioConnection>()
  for (const { holding } of portfolio.holdings) {
    if (kind === 'index' && holding.assetClass !== 'ETF') continue
    const key = (kind === 'sector' ? holding.sector : kind === 'currency' ? holding.currency : holding.underlyingIndex).trim() || '미입력'
    const label = kind === 'currency' ? key === 'KRW' ? '원화' : key === 'USD' ? '달러' : key : key
    const weights = kind === 'sector' ? portfolio.exposure?.sectorWeights : kind === 'currency' ? portfolio.exposure?.tradingCurrencyWeights : null
    const weight = weights?.[key]
    const group = groups.get(key) ?? { key, label, symbols: [], names: [], weight: weight != null && Number.isFinite(weight) ? weight : null }
    if (!group.symbols.includes(holding.symbol)) { group.symbols.push(holding.symbol); group.names.push(holding.name) }
    groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) => b.symbols.length - a.symbols.length || a.label.localeCompare(b.label, 'ko'))
}
