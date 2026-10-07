import { findCompany, portfolioContext, qualifiedRecommendations, type DiscoveryBriefing } from './discovery'
import type { Portfolio } from './investing'
import { stockLabel } from './stock-labels'

export function investmentFocus(watched: string[], portfolio?: Portfolio | null, names: Record<string, string> = {}) {
  const holdings = portfolio?.holdings.filter(row => row.holding.assetClass === 'STOCK') ?? []
  return [...new Set([...watched, ...holdings.map(row => row.holding.symbol)])].map(symbol => ({
    symbol,
    name: holdings.find(row => row.holding.symbol === symbol)?.holding.name || stockLabel(symbol, names),
    watched: watched.includes(symbol),
    held: holdings.some(row => row.holding.symbol === symbol),
  }))
}

// Match exact identities and retained evidence; do not infer subsidiaries or price causes.
export function focusRecommendation(symbol: string, name: string, briefing?: DiscoveryBriefing | null) {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '')
  return qualifiedRecommendations(briefing).find(pick => findCompany(pick.stockName)?.symbol === symbol ||
    (name !== '회사명 확인 필요' && normalize(pick.stockName) === normalize(name)))
}

export function focusPortfolioContext(symbol: string, portfolio?: Portfolio | null) {
  if (!portfolio) return '보유 기록을 불러오면 내 투자 구성과 비교할 수 있어요.'
  const company = findCompany(symbol)
  if (company) return portfolioContext(company, portfolio)
  return portfolio.holdings.some(row => row.holding.symbol === symbol)
    ? '내 보유 기록에 있는 자산입니다. 수량과 매입원금 비중을 확인하세요.'
    : '현재 등록한 보유 기록에는 없는 자산입니다. ETF 안의 기업 포함 여부는 별도로 확인하세요.'
}

export function focusNews(symbol: string, name: string, briefing?: DiscoveryBriefing | null) {
  if (name === '회사명 확인 필요') return []
  const company = findCompany(symbol)
  const keys = [name, ...(company?.aliases ?? [])].map(value => value.toLowerCase()).filter(value => value.length >= 2)
  const evidence = focusRecommendation(symbol, name, briefing)?.sourceNewsLinks ?? []
  return [...new Map((briefing?.news ?? []).filter(article => /^https?:\/\//i.test(article.link) &&
    (evidence.includes(article.link) || keys.some(key => `${article.title} ${article.description ?? ''}`.toLowerCase().includes(key))))
    .map(article => [article.link, article])).values()].slice(0, 2)
}
