// web/src/features/stocks/components/StockSearchInput.tsx와 동일 역할 — RN엔 AntD Select 같은
// 드롭다운이 없어 TextInput + 결과 목록을 직접 구현.
import { useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'

import { searchStocks, type StockSearchResult } from '@/lib/api'

interface StockSearchInputProps {
  onSelect: (symbol: string) => void
}

const DEBOUNCE_MS = 300

export function StockSearchInput({ onSelect }: StockSearchInputProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StockSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleChange = (text: string) => {
    setQuery(text)
    clearTimeout(debounceRef.current)
    if (!text.trim()) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        setResults(await searchStocks(text))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, DEBOUNCE_MS)
  }

  const handleSelect = (symbol: string) => {
    onSelect(symbol)
    setQuery('')
    setResults([])
  }

  return (
    <View className="gap-2">
      <TextInput
        value={query}
        onChangeText={handleChange}
        placeholder="종목명으로 검색 (예: 삼성전자, Apple)"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-base"
      />
      {searching && <ActivityIndicator className="self-start" />}
      {!searching && query.trim() && results.length === 0 && (
        <Text className="text-xs text-neutral-400">검색 결과 없음 — 영문 사명으로도 시도해보세요</Text>
      )}
      {results.length > 0 && (
        <View className="gap-1 rounded-lg border border-neutral-200">
          {results.map((result) => (
            <Pressable
              key={result.symbol}
              onPress={() => handleSelect(result.symbol)}
              className="border-b border-neutral-100 px-3 py-2 last:border-b-0"
            >
              <Text className="text-sm text-neutral-900">
                {result.name} ({result.symbol}){result.exchange ? ` · ${result.exchange}` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}
