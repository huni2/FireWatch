// 웹과 앱의 선택 자산 그래프 요청과 응답 식별자를 검증한다.
import type { GameAssetHistory } from './game-turn'
export interface GameHistoryQuery { sessionId: number; turnIndex: number; instrumentType: string; symbol: string | null }
export interface GameHistoryResponse { sessionId: number; turnIndex: number; history: GameAssetHistory }
export function gameHistoryPath(query: GameHistoryQuery) {
  const params = new URLSearchParams({ turnIndex: String(query.turnIndex), instrumentType: query.instrumentType })
  if (query.symbol != null) params.set('symbol', query.symbol)
  return `/api/game/sessions/${query.sessionId}/assets/history?${params}`
}
export function checkedGameHistory(query: GameHistoryQuery, response: GameHistoryResponse) {
  if (!response?.history || response.sessionId !== query.sessionId || response.turnIndex !== query.turnIndex || response.history.instrumentType !== query.instrumentType || response.history.symbol !== query.symbol)
    throw new Error('선택한 자산의 그래프를 확인하지 못했어요. 다시 불러와주세요.')
  return response.history
}
