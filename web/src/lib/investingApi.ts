import { request } from './api'
import { getDeviceId } from './deviceId'
import type { Portfolio, PortfolioDraft, NewsFeed } from '../../../shared/investing'
import { newsQuery, type NewsFilters } from '../../../shared/investing'
export const fetchPortfolio = () => request<Portfolio>('/api/portfolio', { headers: { 'X-Device-Id': getDeviceId() } })
export const savePortfolio = (draft: PortfolioDraft) => request<Portfolio>('/api/portfolio', { method: 'PUT', headers: { 'X-Device-Id': getDeviceId() }, body: JSON.stringify(draft) })
export const fetchNewsFeed = (filters?: NewsFilters) => request<NewsFeed>(`/api/news?${newsQuery(filters)}`)
