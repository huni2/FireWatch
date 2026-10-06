export interface Holding {
  symbol: string
  name: string
  quantity: number
  averageCost: number
  currency: 'KRW' | 'USD'
  assetClass: 'STOCK' | 'ETF' | 'BOND' | 'OTHER'
  sector: string
  region: 'KR' | 'US' | 'GLOBAL'
  underlyingIndex: string
}
export interface PortfolioDraft {
  version: number
  goal: string
  horizonMonths: number
  riskLevel: 'CAUTIOUS' | 'BALANCED' | 'GROWTH'
  accountType: 'GENERAL' | 'ISA' | 'PENSION'
  monthlyContribution: number
  cash: number
  holdings: Holding[]
}
export interface FeedArticle {
  title: string
  link: string
  description: string | null
  pubDate: string | null
}
export interface Portfolio extends Omit<PortfolioDraft, 'holdings'> {
  holdings: { holding: Holding; investedKrw: number | null; currentPrice: number | null; valueKrw: number | null; returnPercent: number | null; quoteAsOf: string | null }[]
  investedKrw: number | null
  totalValueKrw: number | null
  returnPercent: number | null
  allocation: Record<string, number>
  targetAllocation: Record<string, number>
  contributionPlan: Record<string, number>
  insights: string[]
  relatedNews: FeedArticle[]
  updatedAt: string | null
  fxAsOf: string | null
  analysisVersion: string
}
export interface NewsFeed { news: FeedArticle[]; updatedAt: string | null; refreshMinutes: number; page?: number; size?: number; total?: number; hasMore?: boolean }
export interface NewsFilters { from?: string; to?: string; q?: string; page?: number; size?: number }
export const newsQuery = (filters: NewsFilters = {}) => Object.entries(filters).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&')
export const emptyHolding = (): Holding => ({ symbol: '', name: '', quantity: 1, averageCost: 0, currency: 'KRW', assetClass: 'STOCK', sector: '미분류', region: 'KR', underlyingIndex: '' })
export const toDraft = (portfolio: Portfolio): PortfolioDraft => ({ version: portfolio.version, goal: portfolio.goal, horizonMonths: portfolio.horizonMonths, riskLevel: portfolio.riskLevel, accountType: portfolio.accountType, monthlyContribution: portfolio.monthlyContribution, cash: portfolio.cash, holdings: portfolio.holdings.map(h => h.holding) })
export const accountLabels = { GENERAL: '일반 계좌', ISA: 'ISA', PENSION: '연금 계좌' }
export const riskLabels = { CAUTIOUS: '안정 선호', BALANCED: '균형 선호', GROWTH: '성장 선호' }
export const assetLabels: Record<string, string> = { STOCK: '개별주식', ETF: 'ETF', BOND: '채권', OTHER: '기타', CASH: '현금' }
export const productChecklist = [
  '계좌: ISA·연금 등 실제 계좌에서 매수 가능한 상품인지 확인',
  '투자 대상: 같은 지수 추종인지, 레버리지·인버스·옵션 전략이 포함됐는지 확인',
  '비용: 총보수 외 기타 비용과 매매 수수료 확인',
  '환율: 환노출·환헤지 여부와 거래 통화 확인',
  '분배: 분배금 지급 방식·주기 확인',
  '거래: 거래량·매수/매도 호가 차이·추적 차이 확인',
]
