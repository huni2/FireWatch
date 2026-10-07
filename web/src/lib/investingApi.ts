import { ApiRequestError, request } from './api'
import { getDeviceId } from './deviceId'
import type { Portfolio, PortfolioDraft, NewsFeed } from '../../../shared/investing'
import { newsQuery, type NewsFilters } from '../../../shared/investing'
import type { RecommendationReport } from '../../../shared/discovery'
export const fetchRecommendations = () => request<RecommendationReport>('/api/recommendations/latest')
export const fetchRecommendationHistory = (from?: string, to?: string) => request<RecommendationReport[]>(`/api/recommendations?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}`)
export const fetchPortfolio = async () => {
  const options = { headers: { 'X-Device-Id': getDeviceId() } }
  try { return await request<Portfolio>('/api/portfolio', options) }
  catch (error) {
    // Concurrent first-visit settings reads can create the same device row.
    // Retry this read once after the winning insert commits; never retry a save.
    if (!(error instanceof ApiRequestError) || error.status !== 409) throw error
    return request<Portfolio>('/api/portfolio', options)
  }
}
export const savePortfolio = (draft: PortfolioDraft) => request<Portfolio>('/api/portfolio', { method: 'PUT', headers: { 'X-Device-Id': getDeviceId() }, body: JSON.stringify(draft) })
export const fetchNewsFeed = (filters?: NewsFilters) => request<NewsFeed>(`/api/news?${newsQuery(filters)}`)
