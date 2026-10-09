// 선택한 게임 자산의 그래프를 캐시하고 닫힘·턴·종목 변경 후 이전 응답을 무시한다.
import { useEffect, useRef, useState } from 'react'
import { fetchGameAssetHistory } from '../../lib/api'
import { gameHistoryPath, type GameHistoryQuery } from '../../../../shared/game-history'
import type { GameAssetHistory } from '../../../../shared/game-turn'
export function useGameAssetHistory(query: GameHistoryQuery | null) {
  const cache = useRef(new Map<string, Promise<GameAssetHistory>>())
  const [state, setState] = useState<{ key: string; history?: GameAssetHistory; error?: string }>({ key: '' })
  const [attempt, setAttempt] = useState(0)
  const { sessionId = 0, turnIndex = 0, instrumentType = '', symbol = null } = query ?? {}
  const key = query ? gameHistoryPath(query) : ''
  useEffect(() => {
    if (!key) return
    let active = true
    let promise = cache.current.get(key)
    if (!promise) {
      promise = fetchGameAssetHistory({ sessionId, turnIndex, instrumentType, symbol })
      if (cache.current.size >= 32) cache.current.delete(cache.current.keys().next().value!)
      cache.current.set(key, promise)
    }
    const pending = promise
    pending.then(history => { if (active) setState({ key, history }) }).catch(error => {
      if (cache.current.get(key) === pending) cache.current.delete(key)
      if (active) setState({ key, error: error instanceof Error ? error.message : '그래프를 불러오지 못했어요.' })
    })
    return () => { active = false }
  }, [key, sessionId, turnIndex, instrumentType, symbol, attempt])
  const visible = state.key === key ? state : null
  return { history: visible?.history, error: visible?.error, loading: !!key && !visible?.history && !visible?.error,
    retry: () => { setState({ key }); setAttempt(value => value + 1) } }
}
