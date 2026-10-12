import { AppSheet } from '@/components/AppSheet'
// 알림 터치 시(또는 홈 화면에서) 열리는 브리핑 상세 바텀시트. Design Ref: mobile-app.design.md §5.1/§5.4.
import { useImperativeHandle, useState, type Ref } from 'react'
import { ScrollView, Text, View } from 'react-native'

import type { Briefing } from '@/lib/api'
import { qualifiedRecommendations } from '../../../../../shared/discovery'

import { RecommendedStockChip } from './RecommendedStockChip'
import { InvestmentNotice } from '@/components/InvestmentNotice'

export interface BriefingSheetRef { present(): void; dismiss(): void }

interface BriefingSheetProps {
  ref: Ref<BriefingSheetRef>
  briefing: Briefing
}

export function BriefingSheet({ ref, briefing }: BriefingSheetProps) {
  const [open, setOpen] = useState(false)
  useImperativeHandle(ref, () => ({ present: () => setOpen(true), dismiss: () => setOpen(false) }), [])
  return (
    <AppSheet open={open} title="시장 브리핑" close={() => setOpen(false)}>
      <ScrollView contentContainerStyle={{ gap: 20, padding: 20, paddingBottom: 40 }}>
        <InvestmentNotice />
        <Text className="text-lg font-bold text-ink">
          {`증시 요약 · 자료 기준 ${briefing.briefingDate}`}
        </Text>
        <Text className="text-base leading-6 text-muted">{briefing.marketSummary}</Text>
        {qualifiedRecommendations(briefing).length > 0 && (
          <View>
            <Text className="mb-2 text-sm font-semibold text-muted">관찰 후보 · 눌러서 관심종목 추가</Text>
            <View className="flex-row flex-wrap gap-2">
              {qualifiedRecommendations(briefing).map(({ stockName: symbol }) => (
                <RecommendedStockChip key={symbol} symbol={symbol} />
              ))}
            </View>
          </View>
        )}
        {!qualifiedRecommendations(briefing).length && <Text className="text-sm text-muted">선정 이유·위험·근거 기사를 갖춘 후보가 아직 없습니다.</Text>}
      </ScrollView>
    </AppSheet>
  )
}
