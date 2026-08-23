// 알림 터치 시(또는 홈 화면에서) 열리는 브리핑 상세 바텀시트. Design Ref: mobile-app.design.md §5.1/§5.4.
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet'
import type { ComponentRef, Ref } from 'react'
import { Text, View } from 'react-native'

import type { Briefing } from '@/lib/api'

import { RecommendedStockChip } from './RecommendedStockChip'

export type BriefingSheetRef = ComponentRef<typeof BottomSheetModal>

interface BriefingSheetProps {
  ref: Ref<BriefingSheetRef>
  briefing: Briefing
}

export function BriefingSheet({ ref, briefing }: BriefingSheetProps) {
  return (
    <BottomSheetModal ref={ref} snapPoints={['55%', '85%']} enablePanDownToClose>
      <BottomSheetView className="gap-4 px-6 pb-10 pt-2">
        <Text className="text-lg font-bold text-neutral-900">
          {`오늘의 증시 요약 · ${briefing.briefingDate}`}
        </Text>
        <Text className="text-base leading-6 text-neutral-700">{briefing.marketSummary}</Text>
        {briefing.recommendedStocks.length > 0 && (
          <View>
            <Text className="mb-2 text-sm font-semibold text-neutral-500">추천종목</Text>
            <View className="flex-row flex-wrap gap-2">
              {briefing.recommendedStocks.map((symbol) => (
                <RecommendedStockChip key={symbol} symbol={symbol} />
              ))}
            </View>
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  )
}
