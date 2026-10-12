import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { ScreenActivity } from './screenActivity'
import { AppState } from 'react-native'

export function useResource<T>(fetcher: () => Promise<T>) {
  const active = useContext(ScreenActivity)
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const generation = useRef(0)
  const load = useCallback(async (pullToRefresh: boolean) => {
    const id = ++generation.current
    setLoading(true); setError(null)
    setRefreshing(pullToRefresh)
    try { const result = await fetcher(); if (id === generation.current) setData(result) }
    catch (e) { if (id === generation.current) setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.') }
    finally { if (id === generation.current) { setLoading(false); setRefreshing(false) } }
  }, [fetcher])
  const reload = useCallback(() => load(false), [load])
  const refresh = useCallback(() => load(true), [load])
  useEffect(() => {
    if (!active) return
    const initial = setTimeout(() => { void reload() }, 0)
    const requestGeneration = generation
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void reload() })
    return () => { clearTimeout(initial); requestGeneration.current++; listener.remove() }
  }, [reload, active])
  const replaceData = useCallback((value: T) => { generation.current++; setData(value); setError(null); setLoading(false); setRefreshing(false) }, [])
  return { data, error, loading, refreshing, refresh, reload, replaceData }
}
