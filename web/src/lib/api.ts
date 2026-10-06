// 백엔드(FireWatch backend) REST API 클라이언트. Design Ref: docs/02-design/features/firewatch.design.md §4.
import { getDeviceId } from './deviceId'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

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
  trendingKeywords: string[]
  goldPrice: number | null
  silverPrice: number | null
  usdKrw: number | null
  jpy100Krw: number | null
  cnyKrw: number | null
  kospi: number | null
  kosdaq: number | null
  sp500: number | null
  nasdaq: number | null
  dow: number | null
  usBondYield10y: number | null
  krBondYield10y: number | null
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
  webPushSubscribed: boolean
  updatedAt: string
}

export interface WebPushSubscriptionPayload {
  endpoint: string
  keys: { p256dh: string; auth: string }
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

export interface RecommendedStockPerformance {
  stockName: string
  symbol: string | null
  briefingDate: string
  priceAtRecommendation: number | null
  currentPrice: number | null
  returnPercent: number | null
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
  return request<Settings>('/api/settings', { headers: { 'X-Device-Id': getDeviceId() } })
}

export function updateSettings(input: {
  pushTime: string
  interestKeywords: string[]
  watchedStocks: string[]
  webPushSubscription?: WebPushSubscriptionPayload
}): Promise<Settings> {
  return request<Settings>('/api/settings', {
    method: 'PUT',
    headers: { 'X-Device-Id': getDeviceId() },
    body: JSON.stringify(input),
  })
}

export function fetchStockHistory(symbol: string, range: StockChartRange = '6mo'): Promise<StockHistory> {
  return request<StockHistory>(`/api/stocks/${encodeURIComponent(symbol)}/history?range=${range}`)
}

export function searchStocks(query: string): Promise<StockSearchResult[]> {
  return request<StockSearchResult[]>(`/api/stocks/search?q=${encodeURIComponent(query)}`)
}

export function fetchRecommendedStockPerformance(): Promise<RecommendedStockPerformance[]> {
  return request<RecommendedStockPerformance[]>('/api/stocks/recommendations/performance')
}

// 가상투자 게임(2026-10-05) — 실제로 쌓인 Briefing 날짜를 셔플한 덱을 턴 순서로 쓰는 턴제 게임.
export type GameSessionStatus = 'ACTIVE' | 'ENDED'
export type GameInstrumentType = 'GOLD' | 'SILVER' | 'USD' | 'KOSPI' | 'KOSDAQ' | 'SP500' | 'NASDAQ' | 'DOW' | 'STOCK'
export type GameTradeAction = 'BUY' | 'SELL'
// 난이도 = 시작 자금. 금액 자체는 서버가 정한다(GameService.startingCashFor) — 프론트는 난이도
// 이름만 고른다.
export type GameDifficulty = 'EASY' | 'NORMAL' | 'HARD'

export interface GameHolding {
  instrumentType: GameInstrumentType
  symbol: string | null
  quantity: number
  currentPrice: number | null
  value: number
}

export interface GameTurn {
  sessionId: number
  status: GameSessionStatus
  turnIndex: number
  totalTurns: number
  turnDate: string
  briefing: Briefing
  holdings: GameHolding[]
  cash: number
  portfolioValue: number
  startingCash: number
  allowShortSelling: boolean
  returnPercent: number
}

// 이미 활성 게임이 있으면 difficulty/allowShortSelling은 무시되고 그 게임이 그대로 이어진다
// (GameService.startGame 참고) — 인자 없이 불러도 "이어하기" 용도로 그대로 쓸 수 있다.
export function startGame(input?: { difficulty: GameDifficulty; allowShortSelling: boolean }): Promise<GameTurn> {
  return request<GameTurn>('/api/game/start', {
    method: 'POST',
    headers: { 'X-Device-Id': getDeviceId() },
    body: input ? JSON.stringify(input) : undefined,
  })
}

export function fetchCurrentTurn(): Promise<GameTurn> {
  return request<GameTurn>('/api/game/current', { headers: { 'X-Device-Id': getDeviceId() } })
}

export function tradeGame(input: {
  instrumentType: GameInstrumentType
  symbol?: string
  action: GameTradeAction
  quantity: number
}): Promise<GameTurn> {
  return request<GameTurn>('/api/game/trade', {
    method: 'POST',
    headers: { 'X-Device-Id': getDeviceId() },
    body: JSON.stringify(input),
  })
}

export function nextGameTurn(): Promise<GameTurn> {
  return request<GameTurn>('/api/game/next-turn', { method: 'POST', headers: { 'X-Device-Id': getDeviceId() } })
}

export function endGame(): Promise<GameTurn> {
  return request<GameTurn>('/api/game/end', { method: 'POST', headers: { 'X-Device-Id': getDeviceId() } })
}
