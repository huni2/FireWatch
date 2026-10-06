// 알림 터치 시(또는 홈 화면에서) 열리는 브리핑 상세 바텀시트. Design Ref: mobile-app.design.md §5.1/§5.4.
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import type { ComponentRef, Ref } from 'react'
import { Text, View } from 'react-native'

import type { Briefing } from '@/lib/api'
import tokens from '../../../../../shared/design-tokens.json'
import { qualifiedRecommendations } from '../../../../../shared/discovery'

import { RecommendedStockChip } from './RecommendedStockChip'

export type BriefingSheetRef = ComponentRef<typeof BottomSheetModal>

interface BriefingSheetProps {
  ref: Ref<BriefingSheetRef>
  briefing: Briefing
}

export function BriefingSheet({ ref, briefing }: BriefingSheetProps) {
  return (
    <BottomSheetModal ref={ref} snapPoints={['55%', '85%']} enablePanDownToClose backgroundStyle={{ backgroundColor: tokens.light.surface }} handleIndicatorStyle={{ backgroundColor: tokens.light.border }}>
      <BottomSheetScrollView contentContainerStyle={{ gap: 20, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 }}>
        <Text className="text-xs font-bold text-brand">DAILY MARKET BRIEF</Text>
        <Text className="text-lg font-bold text-neutral-900">
          {`증시 요약 · 자료 기준 ${briefing.briefingDate}`}
        </Text>
        <Text className="text-base leading-6 text-neutral-700">{briefing.marketSummary}</Text>
        {qualifiedRecommendations(briefing).length > 0 && (
          <View>
            <Text className="mb-2 text-sm font-semibold text-neutral-500">관찰 후보 · 눌러서 관심종목 추가</Text>
            <View className="flex-row flex-wrap gap-2">
              {qualifiedRecommendations(briefing).map(({ stockName: symbol }) => (
                <RecommendedStockChip key={symbol} symbol={symbol} />
              ))}
            </View>
          </View>
        )}
        {!qualifiedRecommendations(briefing).length && <Text className="text-sm text-neutral-500">선정 이유·위험·근거 기사를 갖춘 후보가 아직 없습니다.</Text>}
      </BottomSheetScrollView>
    </BottomSheetModal>
  )
}
