// Long briefings use a full-screen reader with a fixed close button.
import { useImperativeHandle, useState, type Ref } from 'react'
import { Modal, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { ModalHeader } from '@/components/ModalHeader'
import { ThemeSurface, useTheme } from '@/lib/theme'
import { toastConfig } from '@/lib/toastConfig'
import { briefingText } from '../../../../../shared/briefing-text'

import type { Briefing } from '@/lib/api'
import { qualifiedRecommendations } from '../../../../../shared/discovery'

import { RecommendedStockList } from './RecommendedStockChip'
import { InvestmentNotice } from '@/components/InvestmentNotice'

export interface BriefingSheetRef { present(): void; dismiss(): void }

interface BriefingSheetProps {
  ref: Ref<BriefingSheetRef>
  briefing: Briefing
}

export function BriefingSheet({ ref, briefing }: BriefingSheetProps) {
  const [open, setOpen] = useState(false)
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  useImperativeHandle(ref, () => ({ present: () => setOpen(true), dismiss: () => setOpen(false) }), [])
  if (!open) return null
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setOpen(false)}>
      <ThemeSurface>
        <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <ModalHeader title="오늘의 브리핑" close={() => setOpen(false)} />
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator contentContainerStyle={{ gap: 20, padding: 20, paddingBottom: 48 }}>
            <InvestmentNotice />
            <Text className="text-lg font-bold text-ink">
              {`증시 요약 · 자료 기준 ${briefing.briefingDate}`}
            </Text>
            <Text selectable className="text-base leading-7 text-ink">{briefingText(briefing.marketSummary)}</Text>
            {qualifiedRecommendations(briefing).length > 0 && (
              <RecommendedStockList stocks={qualifiedRecommendations(briefing).map(pick => pick.stockName)} />
            )}
            {!qualifiedRecommendations(briefing).length && <Text className="text-sm text-muted">선정 이유·위험·근거 기사를 갖춘 후보가 아직 없습니다.</Text>}
          </ScrollView>
        </View>
        <Toast config={toastConfig} topOffset={insets.top + 12} />
      </ThemeSurface>
    </Modal>
  )
}
