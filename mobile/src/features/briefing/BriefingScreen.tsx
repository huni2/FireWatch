// 홈 탭 콘텐츠 — 오늘의 브리핑 요약 표시만 담당. 브리핑 조회·바텀시트·알림 처리는
// HomeScreen(상단 세그먼트 탭의 상위)이 관리한다(2026-10-04, APP-8 — 탭 전환에도 데이터 유지 위해 분리).
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'

import type { Briefing } from '@/lib/api'

import { RecommendedStockChip } from './components/RecommendedStockChip'

function minutesAgoLabel(isoString: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 60000))
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  return `${Math.floor(minutes / 60)}시간 전`
}

interface BriefingScreenProps {
  briefing: Briefing | null
  cachedAt: string | null
  loading: boolean
  onOpenSheet: () => void
}

export function BriefingScreen({ briefing, cachedAt, loading, onOpenSheet }: BriefingScreenProps) {
  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-4 p-6">
      {loading && <ActivityIndicator className="mt-10" />}

      {!loading && !briefing && (
        <Text className="mt-10 text-center text-base text-neutral-500">
          오늘자 브리핑이 아직 생성되지 않았습니다
        </Text>
      )}

      {!loading && briefing && (
        <>
          {cachedAt && (
            <View className="self-start rounded-full bg-neutral-100 px-3 py-1">
              <Text className="text-xs text-neutral-500">
                {`🔌 마지막 갱신 ${minutesAgoLabel(cachedAt)}`}
              </Text>
            </View>
          )}
          <Pressable onPress={onOpenSheet} className="gap-2 rounded-2xl border border-neutral-200 p-4">
            <Text className="text-base font-bold text-neutral-900">
              {`오늘의 증시 요약 · ${briefing.briefingDate}`}
            </Text>
            <Text className="text-sm text-neutral-600" numberOfLines={3}>
              {briefing.marketSummary}
            </Text>
          </Pressable>
          {briefing.recommendedStocks.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {briefing.recommendedStocks.map((symbol) => (
                <RecommendedStockChip key={symbol} symbol={symbol} />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}
