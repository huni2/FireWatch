// 백엔드(FireWatch backend) REST API 클라이언트. web/src/lib/api.ts와 동일 스타일 —
// Design Ref: docs/02-design/features/mobile-app.design.md §4.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080'
const SETTINGS_API_KEY = process.env.EXPO_PUBLIC_SETTINGS_API_KEY ?? ''

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

export function fetchSettings(): Promise<Settings> {
  return request<Settings>('/api/settings')
}

// fcmToken만 새로 등록하고 기존 pushTime/keywords/watchedStocks는 그대로 유지 — 호출부가
// fetchSettings()로 먼저 현재 값을 읽어 함께 넘겨야 한다(백엔드는 값을 그대로 덮어씀).
export function updateSettings(input: {
  pushTime: string
  interestKeywords: string[]
  watchedStocks: string[]
  fcmToken?: string
}): Promise<Settings> {
  return request<Settings>('/api/settings', {
    method: 'PUT',
    headers: { 'X-API-Key': SETTINGS_API_KEY },
    body: JSON.stringify(input),
  })
}
