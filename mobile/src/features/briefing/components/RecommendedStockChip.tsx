import { Pressable, Text } from 'react-native'
import Toast from 'react-native-toast-message'

import { fetchSettings, searchStocks, updateSettings } from '@/lib/api'

// 눌러도 아무 일이 없다는 지적(2026-10-04 앱 리뷰, 웹 WEB-9과 동일 문제) — 이름으로 티커를 찾아
// 관심종목에 추가한다. 모바일엔 아직 종목 화면이 없어(APP-8 예정) 화면 이동 없이 토스트로만 알림.
export function RecommendedStockChip({ symbol }: { symbol: string }) {
  const handlePress = async () => {
    try {
      const results = await searchStocks(symbol)
      if (results.length === 0) {
        Toast.show({ type: 'error', text1: `"${symbol}" 종목을 찾지 못했습니다.` })
        return
      }
      const ticker = results[0].symbol
      const settings = await fetchSettings()
      if (settings.watchedStocks.includes(ticker)) {
        Toast.show({ type: 'success', text1: '이미 관심종목에 있어요.' })
        return
      }
      await updateSettings({
        pushTime: settings.pushTime,
        interestKeywords: settings.interestKeywords,
        watchedStocks: [...settings.watchedStocks, ticker],
      })
      Toast.show({ type: 'success', text1: '관심종목에 추가했습니다.' })
    } catch {
      Toast.show({ type: 'error', text1: '관심종목 추가에 실패했습니다.' })
    }
  }

  return (
    <Pressable onPress={handlePress} className="rounded-full bg-brand/10 px-3 py-1.5">
      <Text className="text-sm font-semibold text-brand">{symbol}</Text>
    </Pressable>
  )
}
