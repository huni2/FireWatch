// 백엔드(FireWatch backend) REST API 클라이언트. web/src/lib/api.ts와 동일 스타일 —
// Design Ref: docs/02-design/features/mobile-app.design.md §4.
import { getDeviceId } from './deviceId'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080'

export interface Settings {
  pushTime: string
  interestKeywords: string[]
  watchedStocks: string[]
  updatedAt: string
}

export type DataSourceStatus = 'NORMAL' | 'FALLBACK'

// 홈 화면·바텀시트가 실제로 쓰는 필드만 우선 반영 — 지수/뉴스 등 나머지는 웹 전용(Design §2.2 Out of Scope).
export interface Briefing {
  briefingDate: string
  marketSummary: string
  recommendedStocks: string[]
  dataSourceStatus: DataSourceStatus
}

export interface StockSearchResult {
  symbol: string
  name: string
  exchange: string | null
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

  return (await response.json()) as T
}

export function fetchLatestBriefing(): Promise<Briefing> {
  return request<Briefing>('/api/briefings/latest')
}

// 조회 전용 + 인증 불필요(web/src/lib/api.ts의 searchStocks와 동일 엔드포인트) — 추천종목 칩 클릭(APP-7) 전용.
export function searchStocks(query: string): Promise<StockSearchResult[]> {
  return request<StockSearchResult[]>(`/api/stocks/search?q=${encodeURIComponent(query)}`)
}

// APP-8 — 모바일 종목 화면용 가격 히스토리(웹과 동일 엔드포인트, 인증 불필요).
export function fetchStockHistory(symbol: string, range: StockChartRange = '6mo'): Promise<StockHistory> {
  return request<StockHistory>(`/api/stocks/${encodeURIComponent(symbol)}/history?range=${range}`)
}

export async function fetchSettings(): Promise<Settings> {
  const deviceId = await getDeviceId()
  return request<Settings>('/api/settings', { headers: { 'X-Device-Id': deviceId } })
}

// fcmToken만 새로 등록하고 기존 pushTime/keywords/watchedStocks는 그대로 유지 — 호출부가
// fetchSettings()로 먼저 현재 값을 읽어 함께 넘겨야 한다(백엔드는 값을 그대로 덮어씀).
export async function updateSettings(input: {
  pushTime: string
  interestKeywords: string[]
  watchedStocks: string[]
  fcmToken?: string
}): Promise<Settings> {
  const deviceId = await getDeviceId()
  return request<Settings>('/api/settings', {
    method: 'PUT',
    headers: { 'X-Device-Id': deviceId },
    body: JSON.stringify(input),
  })
}
