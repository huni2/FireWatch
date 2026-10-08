import tokens from '../../../../shared/design-tokens.json'
// 상단 세그먼트 탭(홈/종목/지수/뉴스)으로 화면을 전환하는 홈 화면 — 하단 탭·드로어 대신 사용자가 선택한
// 네비게이션 구조(2026-10-04, APP-8~10). 알림 탭 시 바텀시트를 띄우려면 탭을 바꿔도 브리핑 데이터가
// 유지돼야 해서, 브리핑 조회·바텀시트는 여기(최상위)에서 관리하고 각 탭 화면엔 표시만 맡긴다.
import { router, Stack } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { useEffect, useRef, useState } from 'react'
import { Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { PortfolioScreen } from '../portfolio/PortfolioScreen'
import { CandidatesScreen } from '../candidates/CandidatesScreen'
import { PracticeScreen } from '../practice/PracticeScreen'
import { StatusBar } from 'expo-status-bar'

import { BriefingSheet, type BriefingSheetRef } from '../briefing/components/BriefingSheet'
import { BriefingScreen } from '../briefing/BriefingScreen'
import { useLatestBriefing } from '../briefing/hooks/useLatestBriefing'
import { IndicesScreen } from '../indices/IndicesScreen'
import { NewsScreen } from '../news/NewsScreen'
import { StocksScreen } from '../stocks/StocksScreen'

type HomeTab = 'portfolio' | 'candidates' | 'brief' | 'stocks' | 'indices' | 'news' | 'short-term' | 'practice'

const TABS: { key: HomeTab; label: string }[] = [
  { key: 'portfolio', label: '내 포트폴리오' },
  { key: 'candidates', label: '투자 후보' },
  { key: 'brief', label: '브리핑' },
  { key: 'stocks', label: '종목' },
  { key: 'indices', label: '지수' },
  { key: 'news', label: '뉴스' },
  { key: 'short-term', label: '단기 투자' },
  { key: 'practice', label: '가상투자 게임' },
]

export function HomeScreen() {
  const [activeTab, setActiveTab] = useState<HomeTab>('portfolio')
  const [stockTarget, setStockTarget] = useState<{ symbol?: string; query?: string }>({})
  const [newsQuery, setNewsQuery] = useState('')
  const exploration = ['candidates', 'stocks', 'short-term'].includes(activeTab)
  const market = ['news', 'brief', 'indices'].includes(activeTab)
  const primaryTabs: { key: HomeTab; label: string; selected: boolean }[] = [
    { key: 'portfolio', label: '내 기록', selected: activeTab === 'portfolio' },
    { key: 'candidates', label: '기업 탐색', selected: exploration },
    { key: 'news', label: '시장 소식', selected: market },
    { key: 'practice', label: '게임', selected: activeTab === 'practice' },
  ]
  const discoveryNavigation = {
    onOpenStock: (symbol: string) => { setStockTarget({ symbol }); setActiveTab('stocks') },
    onSearchStock: (query: string) => { setStockTarget({ query }); setActiveTab('stocks') },
    onOpenNews: (query: string) => { setNewsQuery(query); setActiveTab('news') },
    onOpenPortfolio: () => setActiveTab('portfolio'),
  }
  const { briefing, cachedAt, loading, error, reload } = useLatestBriefing()
  const sheetRef = useRef<BriefingSheetRef>(null)
  const lastNotificationResponse = Notifications.useLastNotificationResponse()
  const handledNotification = useRef<string | null>(null)

  // 알림을 탭해서 앱이 열린 경우 홈 탭으로 전환하고 바텀시트를 자동으로 띄운다(Design §5.2 User Flow 2번).
  useEffect(() => {
    if (lastNotificationResponse?.notification.request.content.title === 'FireWatch 수집 장애') {
      const id = lastNotificationResponse.notification.request.identifier
      if (handledNotification.current !== id) { handledNotification.current = id; setActiveTab('portfolio') }
      return
    }
    if (lastNotificationResponse && briefing) {
      const id = lastNotificationResponse.notification.request.identifier
      if (handledNotification.current === id) return
      handledNotification.current = id
      setActiveTab('brief')
      sheetRef.current?.present()
    }
  }, [lastNotificationResponse, briefing])

  return (
    <View style={{ flex: 1, backgroundColor: tokens.light.canvas }}>
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: tokens.light.surface },
          headerTintColor: tokens.light.text,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="도움말 열기" accessibilityHint="브라우저에서 서비스 이용 방법을 엽니다." onPress={() => void Linking.openURL('https://firewatch-eqp.pages.dev/guide')} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}><Text style={{ color: tokens.light.muted, fontSize: 13 }}>도움말</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="계정·설정 열기" onPress={() => router.push('/settings')} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}><Text style={{ color: tokens.light.text, fontSize: 13 }}>설정</Text></Pressable>
            </View>
          ),
        }}
      />

      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: tokens.light.border, backgroundColor: tokens.light.surface }}>
        {primaryTabs.map((tab) => (
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab.selected }} key={tab.key} onPress={() => { if (!tab.selected) setActiveTab(tab.key) }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingVertical: 10 }}>
            <Text className={`text-sm font-semibold ${tab.selected ? 'text-brand' : 'text-muted'}`}>
              {tab.label}
            </Text>
            {tab.selected && <View className="mt-1 h-0.5 w-6 rounded-full bg-brand" />}
          </Pressable>
        ))}
      </View>
      {(exploration || market) && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ backgroundColor: tokens.light.surface, paddingHorizontal: 12, gap: 4 }}>
        {TABS.filter(tab => (exploration ? ['candidates', 'stocks', 'short-term'] : ['news', 'brief', 'indices']).includes(tab.key)).map(tab => <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: activeTab === tab.key }} onPress={() => setActiveTab(tab.key)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: activeTab === tab.key ? tokens.light.accent : 'transparent' }}><Text style={{ fontSize: 13, color: activeTab === tab.key ? tokens.light.accent : tokens.light.muted }}>{tab.key === 'candidates' ? '추천·분야' : tab.key === 'stocks' ? '회사 검색·시세' : tab.key === 'short-term' ? '단기 관찰' : tab.label}</Text></Pressable>)}
      </ScrollView>}

      <View style={{ flex: 1, display: activeTab === 'portfolio' ? 'flex' : 'none' }}><PortfolioScreen {...discoveryNavigation} onOpenCandidates={() => setActiveTab('candidates')} /></View>
      {activeTab === 'candidates' && <CandidatesScreen {...discoveryNavigation} />}
      {activeTab === 'short-term' && <CandidatesScreen shortTerm {...discoveryNavigation} />}
      {activeTab === 'practice' && <PracticeScreen />}

      {activeTab === 'brief' && (
        <BriefingScreen
          briefing={briefing}
          cachedAt={cachedAt}
          loading={loading}
          error={error}
          onReload={reload}
          onOpenSheet={() => sheetRef.current?.present()}
        />
      )}
      {activeTab === 'stocks' && <StocksScreen initialSymbol={stockTarget.symbol} initialQuery={stockTarget.query} onOpenPortfolio={discoveryNavigation.onOpenPortfolio} />}
      {activeTab === 'indices' && <IndicesScreen />}
      {activeTab === 'news' && <NewsScreen initialQuery={newsQuery} />}

      {briefing && <BriefingSheet ref={sheetRef} briefing={briefing} />}
    </View>
  )
}
