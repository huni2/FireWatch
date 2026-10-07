import { ScreenIntro } from '@/components/ScreenIntro'
// web/src/features/stocks/StocksPage.tsx와 동일 역할의 모바일 종목 화면(APP-8) — 관심 종목 관리 + 차트.
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { updateSettings } from '@/lib/api'
import Toast from 'react-native-toast-message'

import { KeywordInput } from '../settings/components/KeywordInput'
import { useSettings } from '../settings/hooks/useSettings'
import { StockChart } from './components/StockChart'
import { StockSearchInput } from './components/StockSearchInput'
import { stockLabel } from '../../../../shared/stock-labels'
import { useStockNames } from './hooks/useStockNames'
import { InvestmentContext } from './components/InvestmentContext'

const TICKER_PATTERN = /^[A-Za-z0-9]+(\.[A-Za-z0-9]+)?$/

export function StocksScreen({ initialSymbol, initialQuery = '', onOpenPortfolio }: { initialSymbol?: string; initialQuery?: string; onOpenPortfolio?: () => void }) {
  const { settings, loading } = useSettings()
  const [watchedStocks, setWatchedStocks] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(initialSymbol && TICKER_PATTERN.test(initialSymbol) ? initialSymbol : null)
  const { names, rememberName } = useStockNames()
  const labelForValue = (symbol: string) => stockLabel(symbol, names)

  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWatchedStocks(settings.watchedStocks)
      setSelected((current) => current ?? settings.watchedStocks[0] ?? null)
    }
  }, [settings])

  async function handleChange(next: string[]) {
    const previous = watchedStocks
    const previousSelected = selected
    setWatchedStocks(next)
    if (selected && !next.includes(selected)) setSelected(next[0] ?? null)
    if (!settings) return
    try { await updateSettings({ watchedStocks: next }) }
    catch (e) { setWatchedStocks(previous); setSelected(previousSelected); Toast.show({ type: 'error', text1: '관심종목 저장 실패', text2: e instanceof Error ? e.message : '다시 시도해주세요.' }) }
  }

  function handleAddFromSearch(symbol: string, name?: string) {
    rememberName(symbol, name)
    if (watchedStocks.includes(symbol)) {
      setSelected(symbol)
      return
    }
    handleChange([...watchedStocks, symbol])
    setSelected(symbol)
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <Text className="text-base text-muted">불러오는 중...</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-5 p-5 pb-10">
      <ScreenIntro eyebrow="MY WATCHLIST" title="관심 종목" description="지켜볼 회사를 모으고 가격 흐름을 비교하세요." />
      <View className="gap-3">
        <Text className="text-sm font-semibold text-muted">관심 종목</Text>

          <StockSearchInput onSelect={handleAddFromSearch} initialQuery={initialQuery} />
            <Text className="text-xs text-muted">
              국내 대형주는 한글명(예: 삼성전자)으로 찾을 수 있고, 그 외는 영문 사명(예: Tesla)으로 검색하세요.
            </Text>
            <KeywordInput value={watchedStocks} onChange={handleChange} showInput={false} labelForValue={labelForValue} />
      </View>

      {watchedStocks.length === 0 && !selected ? (
        <Text className="text-xs text-muted">관심 종목을 추가하면 차트가 표시됩니다.</Text>
      ) : (
        <View className="gap-3">
          <Text className="text-sm font-semibold text-muted">차트</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {[...new Set([...watchedStocks, ...(selected ? [selected] : [])])].map((symbol) => (
                <Pressable
                  key={symbol}
                  onPress={() => setSelected(symbol)}
                  className={`min-h-11 justify-center rounded-xl px-4 py-3 ${selected === symbol ? 'bg-brand' : 'bg-neutral-100'}`}
                >
                  <Text className={`text-xs font-medium ${selected === symbol ? 'text-white' : 'text-muted'}`}>
                    {labelForValue(symbol)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          {selected && <StockChart key={selected} symbol={selected} name={labelForValue(selected)} onNameFound={rememberName} />}
          {selected && <InvestmentContext symbol={selected} name={labelForValue(selected)} onOpenPortfolio={onOpenPortfolio} />}
        </View>
      )}
    </ScrollView>
  )
}
