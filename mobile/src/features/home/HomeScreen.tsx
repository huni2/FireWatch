// 상단 세그먼트 탭(홈/종목)으로 화면을 전환하는 홈 화면 — 하단 탭·드로어 대신 사용자가 선택한 네비게이션
// 구조(2026-10-04, APP-8). 알림 탭 시 바텀시트를 띄우려면 탭을 바꿔도 브리핑 데이터가 유지돼야 해서,
// 브리핑 조회·바텀시트는 여기(최상위)에서 관리하고 BriefingScreen엔 표시만 맡긴다.
import { router, Stack } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { BriefingSheet, type BriefingSheetRef } from '../briefing/components/BriefingSheet'
import { BriefingScreen } from '../briefing/BriefingScreen'
import { useLatestBriefing } from '../briefing/hooks/useLatestBriefing'
import { StocksScreen } from '../stocks/StocksScreen'

type HomeTab = 'brief' | 'stocks'

const TABS: { key: HomeTab; label: string }[] = [
  { key: 'brief', label: '홈' },
  { key: 'stocks', label: '종목' },
]

export function HomeScreen() {
  const [activeTab, setActiveTab] = useState<HomeTab>('brief')
  const { briefing, cachedAt, loading } = useLatestBriefing()
  const sheetRef = useRef<BriefingSheetRef>(null)
  const lastNotificationResponse = Notifications.useLastNotificationResponse()

  // 알림을 탭해서 앱이 열린 경우 홈 탭으로 전환하고 바텀시트를 자동으로 띄운다(Design §5.2 User Flow 2번).
  useEffect(() => {
    if (lastNotificationResponse && briefing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('brief')
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

      <View className="flex-row border-b border-neutral-100">
        {TABS.map((tab) => (
          <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} className="flex-1 items-center py-3">
            <Text className={`text-sm font-semibold ${activeTab === tab.key ? 'text-brand' : 'text-neutral-400'}`}>
              {tab.label}
            </Text>
            {activeTab === tab.key && <View className="mt-1 h-0.5 w-6 rounded-full bg-brand" />}
          </Pressable>
        ))}
      </View>

      {activeTab === 'brief' ? (
        <BriefingScreen
          briefing={briefing}
          cachedAt={cachedAt}
          loading={loading}
          onOpenSheet={() => sheetRef.current?.present()}
        />
      ) : (
        <StocksScreen />
      )}

      {briefing && <BriefingSheet ref={sheetRef} briefing={briefing} />}
    </View>
  )
}
