import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'

export function useResource<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const generation = useRef(0)
  const reload = useCallback(async () => {
    const id = ++generation.current
    setLoading(true); setError(null)
    try { const result = await fetcher(); if (id === generation.current) setData(result) }
    catch (e) { if (id === generation.current) setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.') }
    finally { if (id === generation.current) setLoading(false) }
  }, [fetcher])
  useEffect(() => {
    const initial = setTimeout(() => { void reload() }, 0)
    const requestGeneration = generation
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void reload() })
    return () => { clearTimeout(initial); requestGeneration.current++; listener.remove() }
  }, [reload])
  return { data, error, loading, reload }
}
