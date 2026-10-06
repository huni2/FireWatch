// web/src/features/stocks/components/StockSearchInput.tsx와 동일 역할 — RN엔 AntD Select 같은
// 드롭다운이 없어 TextInput + 결과 목록을 직접 구현.
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'

import { searchStocks, type StockSearchResult } from '@/lib/api'
import { stockLabel } from '../../../../../shared/stock-labels'

interface StockSearchInputProps {
  onSelect: (symbol: string, name?: string) => void
  initialQuery?: string
}

const DEBOUNCE_MS = 300

export function StockSearchInput({ onSelect, initialQuery = '' }: StockSearchInputProps) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<StockSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generation = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    const current = generation
    return () => { clearTimeout(debounceRef.current); current.current++ }
  }, [])

  const handleChange = (text: string) => {
    setQuery(text)
    clearTimeout(debounceRef.current)
    const id = ++generation.current
    setResults([])
    setError(null)
    if (!text.trim()) {
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const found = await searchStocks(text)
        if (id === generation.current) setResults(found)
      } catch (e) {
        if (id === generation.current) setError(e instanceof Error ? e.message : '검색에 실패했습니다. 다시 입력해주세요.')
      } finally {
        if (id === generation.current) setSearching(false)
      }
    }, DEBOUNCE_MS)
  }

  const handleSelect = (symbol: string) => {
    clearTimeout(debounceRef.current)
    generation.current++
    setSearching(false)
    onSelect(symbol, results.find(result => result.symbol === symbol)?.name)
    setQuery('')
    setResults([])
  }

  useEffect(() => {
    const initialSearch = setTimeout(() => { if (initialQuery) handleChange(initialQuery) }, 0)
    return () => clearTimeout(initialSearch)
  }, [initialQuery])

  return (
    <View className="gap-2">
      <TextInput
        accessibilityLabel="관심종목 이름 검색"
        value={query}
        onChangeText={handleChange}
        placeholder="종목명으로 검색 (예: 삼성전자, Apple)"
        className="rounded-lg border border-line bg-surface px-3 py-2 text-base"
      />
      {searching && <ActivityIndicator className="self-start" />}
      {error && <Text className="text-xs text-red-600">{error}</Text>}
      {!searching && !error && query.trim() && results.length === 0 && (
        <Text className="text-xs text-muted">검색 결과 없음 — 영문 사명으로도 시도해보세요</Text>
      )}
      {results.length > 0 && (
        <View className="gap-1 rounded-lg border border-line bg-surface">
          {results.map((result) => (
            <Pressable
              key={result.symbol}
              onPress={() => handleSelect(result.symbol)}
              accessibilityRole="button"
              className="min-h-11 justify-center border-b border-line px-3 py-3 last:border-b-0"
            >
              <Text className="text-sm text-ink">
                {stockLabel(result.symbol, { [result.symbol]: result.name })}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}
