// 백엔드(FireWatch backend) REST API 클라이언트. Design Ref: docs/02-design/features/firewatch.design.md §4.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
const SETTINGS_API_KEY = import.meta.env.VITE_SETTINGS_API_KEY ?? ''

export type DataSourceStatus = 'NORMAL' | 'FALLBACK'

export interface NewsArticle {
  title: string
  link: string
  description: string | null
  pubDate: string | null
}

export interface Briefing {
  id: number
  briefingDate: string
  marketSummary: string
  recommendedStocks: string[]
  goldPrice: number | null
  silverPrice: number | null
  usdKrw: number | null
  jpy100Krw: number | null
  cnyKrw: number | null
  dataSourceStatus: DataSourceStatus
  createdAt: string
  news: NewsArticle[]
}

export type AuditEventType =
  | 'SCHEDULER'
  | 'GEMINI_API'
  | 'FINANCIAL_API'
  | 'NEWS_API'
  | 'FCM_PUSH'
  | 'USER_SETTING'
  | 'ERROR'
  | 'UNCATEGORIZED'

export type AuditStatus = 'SUCCESS' | 'WARNING' | 'FALLBACK' | 'FAILURE'

export interface AuditLogEntry {
  id: number
  eventType: AuditEventType
  actionName: string
  status: AuditStatus
  executionTimeMs: number | null
  responseSummary: string | null
  createdAt: string
}

export interface AuditLogPage {
  data: AuditLogEntry[]
  pagination: { page: number; size: number; total: number }
}

export interface Settings {
  pushTime: string
  interestKeywords: string[]
  watchedStocks: string[]
  updatedAt: string
}

export interface StockPricePoint {
  timestamp: string
  close: number
}

export interface StockHistory {
  symbol: string
  points: StockPricePoint[]
}

export type StockChartRange = '1d' | '1wk' | '1mo' | '3mo' | '6mo' | '5y'

export interface StockSearchResult {
  symbol: string
  name: string
  exchange: string | null
}

export interface ApiErrorBody {
  code: string
  message: string
  details?: Record<string, unknown>
}

export class ApiRequestError extends Error {
  readonly apiError: ApiErrorBody
  readonly status: number

  constructor(apiError: ApiErrorBody, status: number) {
    super(apiError.message)
    this.name = 'ApiRequestError'
    this.apiError = apiError
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: ApiErrorBody } | null
    const apiError: ApiErrorBody = body?.error ?? {
      code: 'UNKNOWN',
      message: `요청이 실패했습니다 (${response.status})`,
    }
    throw new ApiRequestError(apiError, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

function toDateParam(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function fetchLatestBriefing(): Promise<Briefing> {
  return request<Briefing>('/api/briefings/latest')
}

export function fetchBriefingHistory(days: number): Promise<Briefing[]> {
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return request<Briefing[]>(`/api/briefings?from=${toDateParam(from)}&to=${toDateParam(to)}`)
}

export function fetchAuditLogs(params: {
  eventType?: string
  status?: string
  from?: string
  to?: string
  page?: number
  size?: number
}): Promise<AuditLogPage> {
  const query = new URLSearchParams()
  if (params.eventType) query.set('eventType', params.eventType)
  if (params.status) query.set('status', params.status)
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)
  query.set('page', String(params.page ?? 0))
  query.set('size', String(params.size ?? 20))
  return request<AuditLogPage>(`/api/audit-logs?${query.toString()}`)
}

export function fetchSettings(): Promise<Settings> {
  return request<Settings>('/api/settings')
}

export function updateSettings(input: {
  pushTime: string
  interestKeywords: string[]
  watchedStocks: string[]
}): Promise<Settings> {
  return request<Settings>('/api/settings', {
    method: 'PUT',
    headers: { 'X-API-Key': SETTINGS_API_KEY },
    body: JSON.stringify(input),
  })
}

export function fetchStockHistory(symbol: string, range: StockChartRange = '6mo'): Promise<StockHistory> {
  return request<StockHistory>(`/api/stocks/${encodeURIComponent(symbol)}/history?range=${range}`)
}

export function searchStocks(query: string): Promise<StockSearchResult[]> {
  return request<StockSearchResult[]>(`/api/stocks/search?q=${encodeURIComponent(query)}`)
}
