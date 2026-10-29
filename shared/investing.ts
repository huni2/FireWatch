export interface Holding {
  symbol: string
  name: string
  quantity: number
  averageCost: number | null
  currency: 'KRW' | 'USD'
  assetClass: 'STOCK' | 'ETF' | 'BOND' | 'OTHER'
  sector: string
  region: 'KR' | 'US' | 'GLOBAL'
  underlyingIndex: string
}
// 1~28일 중 하나, 매월 말일은 CONTRIBUTION_LAST_DAY_OF_MONTH(백엔드 PortfolioContribution.LAST_DAY_OF_MONTH와 동일한 값), 납입일 미설정은 null.
export const CONTRIBUTION_LAST_DAY_OF_MONTH = 99
export interface PortfolioDraft {
  version: number
  goal: string
  horizonMonths: number
  riskLevel: 'CAUTIOUS' | 'BALANCED' | 'GROWTH'
  accountType: 'GENERAL' | 'ISA' | 'PENSION'
  monthlyContribution: number
  cash: number
  holdings: Holding[]
  contributionDay: number | null
}
export interface FeedArticle {
  title: string
  link: string
  description: string | null
  pubDate: string | null
}
export interface Portfolio extends Omit<PortfolioDraft, 'holdings'> {
  holdingNotes?: HoldingNote[]
  reviewCheckpoint?: PortfolioReviewCheckpoint | null
  lastContributionAppliedAt: string | null
  lastContributionAppliedAmount: number | null
  lastContributionAppliedMonths: number | null
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
  allocationBasis?: 'MARKET_VALUE'
  valuationCoverage?: { pricedHoldings: number; totalHoldings: number; includedValueKrw: number; missingNames: string[] } | null
  analysisVersion: string
  exposure?: {
    complete: boolean
    sectorWeights: Record<string, number>
    tradingCurrencyWeights: Record<string, number>
    largestHoldings: { name: string; weightPercent: number }[]
    indexOverlaps: { index: string; names: string[] }[]
    usdFxDown10ImpactKrw: number | null
  } | null
}
export interface HoldingNoteDraft { reason: string; nextCheck: string; reviewDate: string | null; reflection: string }
export interface HoldingNote extends HoldingNoteDraft { symbol: string; name: string; updatedAt: string }
export interface HoldingNoteRequest extends HoldingNoteDraft { symbol: string; version: number }
export interface PortfolioReviewCheckpoint {
  reviewedAt: string
  cash: number
  holdings: Portfolio['holdings']
  totalValueKrw: number | null
  fxAsOf: string | null
  newsLinks: string[]
}
export interface NewsFeed { news: FeedArticle[]; updatedAt: string | null; refreshMinutes: number; page?: number; size?: number; total?: number; hasMore?: boolean }
export interface NewsFilters { from?: string; to?: string; q?: string; page?: number; size?: number }
export const newsQuery = (filters: NewsFilters = {}) => Object.entries(filters).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&')
export const emptyHolding = (): Holding => ({ symbol: '', name: '', quantity: 0, averageCost: null, currency: 'KRW', assetClass: 'STOCK', sector: '미분류', region: 'KR', underlyingIndex: '' })
export const toDraft = (portfolio: Portfolio): PortfolioDraft => ({ version: portfolio.version, goal: portfolio.goal, horizonMonths: portfolio.horizonMonths, riskLevel: portfolio.riskLevel, accountType: portfolio.accountType, monthlyContribution: portfolio.monthlyContribution, cash: portfolio.cash, holdings: portfolio.holdings.map(h => h.holding), contributionDay: portfolio.contributionDay })
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
