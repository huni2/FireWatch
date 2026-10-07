import { request } from './api'
import type { RecommendationReport } from '../../../shared/discovery'
import { getDeviceId } from './deviceId'
import { newsQuery, type NewsFilters, type Portfolio, type PortfolioDraft, type NewsFeed } from '../../../shared/investing'
export const fetchPortfolio = async () => request<Portfolio>('/api/portfolio', { headers: { 'X-Device-Id': await getDeviceId() } })
export const savePortfolio = async (draft: PortfolioDraft) => request<Portfolio>('/api/portfolio', { method: 'PUT', headers: { 'X-Device-Id': await getDeviceId() }, body: JSON.stringify(draft) })
export const fetchNewsFeed = (filters?: NewsFilters) => request<NewsFeed>(`/api/news?${newsQuery(filters)}`)
export const fetchRecommendations = () => request<RecommendationReport>('/api/recommendations/latest')
export const fetchRecommendationHistory = (from?: string, to?: string) => request<RecommendationReport[]>(`/api/recommendations?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}`)

export interface PracticeTurn {
  gamePicks?: import('../../../shared/game-turn').GamePick[]
  priceDrivers?: import('../../../shared/game-turn').GamePriceDriver[]
  assetHistories?: import('../../../shared/game-turn').GameAssetHistory[]
  marketEvents: import('../../../shared/game-turn').GameMarketEvent[]
  turnContributions: import('../../../shared/game-turn').GameTurnContribution[]
  simulation: boolean; stockPrices: Record<string, number>; allowShortSelling: boolean
  sessionId: number; status: 'ACTIVE' | 'ENDED'; turnIndex: number; totalTurns: number; turnDate: string
  cash: number; portfolioValue: number | null; returnPercent: number | null; benchmarkReturnPercent: number | null; turnChange: number | null; review: string[]
  briefing: { marketSummary: string; goldPrice: number | null; silverPrice: number | null; kospi: number | null; kosdaq: number | null; sp500: number | null; nasdaq: number | null; dow: number | null; usdKrw: number | null; news: NewsFeed['news']; recommendedStocks: string[]; dataSourceStatus: string }
  holdings: { instrumentType: string; symbol: string | null; quantity: number; currentPrice: number | null; value: number | null }[]
  transactions: { id: number; turnIndex: number; instrumentType: string; symbol: string | null; action: 'BUY' | 'SELL'; quantity: number; price: number; total: number }[]
}
export interface PracticePreview { turnIndex: number; instrumentType: string; symbol: string | null; action: 'BUY' | 'SELL'; quantity: number; unitPrice: number; total: number; cashAfter: number; quantityAfter: number; allowed: boolean; reason: string | null }
export const previewPractice = async (body: object) => request<PracticePreview>('/api/game/preview', { method: 'POST', headers: { 'X-Device-Id': await getDeviceId() }, body: JSON.stringify(body) })
export const practice = async (action: 'current' | 'start' | 'trade' | 'next-turn' | 'end', body?: object) => request<PracticeTurn>(`/api/game/${action}`, { method: action === 'current' ? 'GET' : 'POST', headers: { 'X-Device-Id': await getDeviceId() }, body: body ? JSON.stringify(body) : undefined })
