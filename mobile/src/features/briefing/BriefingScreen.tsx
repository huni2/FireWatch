// 홈 화면 — 오늘의 브리핑 요약 + 알림 탭 시 바텀시트 자동 오픈. Design Ref: mobile-app.design.md §5.1/§5.4.
import { router, Stack } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { useEffect, useRef } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'

import { BriefingSheet, type BriefingSheetRef } from './components/BriefingSheet'
import { RecommendedStockChip } from './components/RecommendedStockChip'
import { useLatestBriefing } from './hooks/useLatestBriefing'

function minutesAgoLabel(isoString: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 60000))
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  return `${Math.floor(minutes / 60)}시간 전`
}

export function BriefingScreen() {
  const { briefing, cachedAt, loading } = useLatestBriefing()
  const sheetRef = useRef<BriefingSheetRef>(null)
  const lastNotificationResponse = Notifications.useLastNotificationResponse()

  // 알림을 탭해서 앱이 열린 경우 바텀시트를 자동으로 띄운다(Design §5.2 User Flow 2번).
  useEffect(() => {
    if (lastNotificationResponse && briefing) {
      sheetRef.current?.present()
    }
  }, [lastNotificationResponse, briefing])

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
              <Text className="text-xl">⚙️</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerClassName="gap-4 p-6">
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
            <Pressable
              onPress={() => sheetRef.current?.present()}
              className="gap-2 rounded-2xl border border-neutral-200 p-4"
            >
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

      {briefing && <BriefingSheet ref={sheetRef} briefing={briefing} />}
    </View>
  )
}
