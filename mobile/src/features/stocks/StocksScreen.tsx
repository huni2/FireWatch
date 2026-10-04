// web/src/features/stocks/StocksPage.tsx와 동일 역할의 모바일 종목 화면(APP-8) — 관심 종목 관리 + 차트.
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { updateSettings } from '@/lib/api'

import { KeywordInput } from '../settings/components/KeywordInput'
import { useSettings } from '../settings/hooks/useSettings'
import { StockChart } from './components/StockChart'
import { StockSearchInput } from './components/StockSearchInput'

const TICKER_PATTERN = /^[A-Za-z0-9]+(\.[A-Za-z0-9]+)?$/

function validateTicker(value: string): string | null {
  return TICKER_PATTERN.test(value) ? null : '티커 형식이 아닙니다 — 예: 005930.KS, AAPL'
}

type AddMode = 'search' | 'ticker'

export function StocksScreen() {
  const { settings, loading } = useSettings()
  const [watchedStocks, setWatchedStocks] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [addMode, setAddMode] = useState<AddMode>('search')

  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWatchedStocks(settings.watchedStocks)
      setSelected((current) => current ?? settings.watchedStocks[0] ?? null)
    }
  }, [settings])

  async function handleChange(next: string[]) {
    setWatchedStocks(next)
    if (selected && !next.includes(selected)) setSelected(next[0] ?? null)
    if (!settings) return
    await updateSettings({ pushTime: settings.pushTime, interestKeywords: settings.interestKeywords, watchedStocks: next })
  }

  function handleAddFromSearch(symbol: string) {
    if (watchedStocks.includes(symbol)) {
      setSelected(symbol)
      return
    }
    handleChange([...watchedStocks, symbol])
    setSelected(symbol)
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-base text-neutral-500">불러오는 중...</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-6 p-6">
      <View className="gap-3">
        <Text className="text-sm font-semibold text-neutral-500">관심 종목</Text>

        <View className="flex-row gap-2">
          {(
            [
              { label: '이름으로 찾기', value: 'search' as const },
              { label: '티커 직접 입력', value: 'ticker' as const },
            ]
          ).map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setAddMode(option.value)}
              className={`rounded-full px-3 py-1 ${addMode === option.value ? 'bg-brand' : 'bg-neutral-100'}`}
            >
              <Text className={`text-xs font-medium ${addMode === option.value ? 'text-white' : 'text-neutral-600'}`}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {addMode === 'search' ? (
          <>
            <StockSearchInput onSelect={handleAddFromSearch} />
            <Text className="text-xs text-neutral-400">
              국내 대형주는 한글명(예: 삼성전자)으로 찾을 수 있고, 그 외는 영문 사명(예: Tesla)으로 검색하세요.
            </Text>
            <KeywordInput value={watchedStocks} onChange={handleChange} showInput={false} />
          </>
        ) : (
          <>
            <KeywordInput
              value={watchedStocks}
              onChange={handleChange}
              placeholder="정확한 티커를 알면 직접 입력 후 완료"
              validate={validateTicker}
            />
            <Text className="text-xs text-neutral-400">
              국내 종목은 코스피 005930.KS, 코스닥은 .KQ, 해외는 AAPL처럼 티커 그대로 입력하세요.
            </Text>
          </>
        )}
      </View>

      {watchedStocks.length === 0 ? (
        <Text className="text-xs text-neutral-400">관심 종목을 추가하면 차트가 표시됩니다.</Text>
      ) : (
        <View className="gap-3">
          <Text className="text-sm font-semibold text-neutral-500">차트</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {watchedStocks.map((symbol) => (
                <Pressable
                  key={symbol}
                  onPress={() => setSelected(symbol)}
                  className={`rounded-full px-3 py-1 ${selected === symbol ? 'bg-brand' : 'bg-neutral-100'}`}
                >
                  <Text className={`text-xs font-medium ${selected === symbol ? 'text-white' : 'text-neutral-600'}`}>
                    {symbol}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          {selected && <StockChart symbol={selected} />}
        </View>
      )}
    </ScrollView>
  )
}
