import { request } from './api'
import { getDeviceId } from './deviceId'
import type { Portfolio, PortfolioDraft, NewsFeed } from '../../../shared/investing'
import { newsQuery, type NewsFilters } from '../../../shared/investing'
import type { RecommendationReport } from '../../../shared/discovery'
export const fetchRecommendations = () => request<RecommendationReport>('/api/recommendations/latest')
export const fetchRecommendationHistory = (from?: string, to?: string) => request<RecommendationReport[]>(`/api/recommendations?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}`)
export const fetchPortfolio = () => request<Portfolio>('/api/portfolio', { headers: { 'X-Device-Id': getDeviceId() } })
export const savePortfolio = (draft: PortfolioDraft) => request<Portfolio>('/api/portfolio', { method: 'PUT', headers: { 'X-Device-Id': getDeviceId() }, body: JSON.stringify(draft) })
export const fetchNewsFeed = (filters?: NewsFilters) => request<NewsFeed>(`/api/news?${newsQuery(filters)}`)
