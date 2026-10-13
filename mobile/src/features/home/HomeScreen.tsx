import { watchAccountSession } from '@/lib/session'
import { ScreenActivity } from '@/lib/screenActivity'
import { useTheme } from '@/lib/theme'
// Android의 주요 이동을 하단에 고정하고 알림·상세 탐색 상태를 유지한다.
import { router, Stack } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BackHandler, Pressable, ScrollView, Text, View } from 'react-native'
import { PortfolioScreen } from '../portfolio/PortfolioScreen'
import { CandidatesScreen } from '../candidates/CandidatesScreen'
import { PracticeScreen } from '../practice/PracticeScreen'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BriefingSheet, type BriefingSheetRef } from '../briefing/components/BriefingSheet'
import { BriefingScreen } from '../briefing/BriefingScreen'
import { useLatestBriefing } from '../briefing/hooks/useLatestBriefing'
import { IndicesScreen } from '../indices/IndicesScreen'
import { NewsScreen } from '../news/NewsScreen'
import { StocksScreen } from '../stocks/StocksScreen'
import { FirewatchIcon } from '../../components/FirewatchIcon'
import { FirewatchBrand } from '../../components/FirewatchBrand'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { FirewatchIconName } from '../../../../shared/firewatch-icons'

type HomeTab = 'portfolio' | 'candidates' | 'brief' | 'stocks' | 'indices' | 'news' | 'short-term' | 'practice'

const TABS: { key: HomeTab; label: string; icon: FirewatchIconName }[] = [
  { key: 'portfolio', label: '내 포트폴리오', icon: 'record' },
  { key: 'candidates', label: '투자 후보', icon: 'companies' },
  { key: 'brief', label: '브리핑', icon: 'briefing' },
  { key: 'stocks', label: '종목', icon: 'stocks' },
  { key: 'indices', label: '지수', icon: 'indices' },
  { key: 'news', label: '뉴스', icon: 'news' },
  { key: 'short-term', label: '단기 투자', icon: 'short-term' },
  { key: 'practice', label: '가상투자 게임', icon: 'game' },
]

export function HomeScreen() {
  const { colors, dark } = useTheme()
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState<HomeTab>('portfolio')
  const [visited, setVisited] = useState<HomeTab[]>(['portfolio'])
  const changeTab = useCallback((next: HomeTab) => { setVisited(previous => previous.includes(next) ? previous : [...previous, next]); setActiveTab(next) }, [])
  const [stockTarget, setStockTarget] = useState<{ symbol?: string; query?: string }>({})
  const stockOrigin = useRef<HomeTab>('candidates')
  const [newsQuery, setNewsQuery] = useState('')
  const [holdingTarget, setHoldingTarget] = useState<{ symbol: string; name: string } | null>(null)
  const [accountEpoch, setAccountEpoch] = useState(0)
  useEffect(() => watchAccountSession(() => { setAccountEpoch(value => value + 1); setVisited(['portfolio']); setStockTarget({}); setNewsQuery(''); setHoldingTarget(null); setActiveTab('portfolio') }), [])
  const exploration = ['candidates', 'stocks', 'short-term'].includes(activeTab)
  const market = ['news', 'brief', 'indices'].includes(activeTab)
  const primaryTabs: { key: HomeTab; label: string; icon: FirewatchIconName; selected: boolean }[] = [
    { key: 'portfolio', label: '내 기록', icon: 'record', selected: activeTab === 'portfolio' },
    { key: 'candidates', label: '기업 탐색', icon: 'companies', selected: exploration },
    { key: 'news', label: '시장 소식', icon: 'news', selected: market },
    { key: 'practice', label: '게임', icon: 'game', selected: activeTab === 'practice' },
  ]
  const discoveryNavigation = {
    onOpenStock: (symbol: string) => { stockOrigin.current = activeTab; setStockTarget({ symbol }); changeTab('stocks') },
    onSearchStock: (query: string) => { setStockTarget({ query }); changeTab('stocks') },
    onOpenNews: (query: string) => { setNewsQuery(query); changeTab('news') },
    onOpenPortfolio: (symbol?: string, name?: string) => { if (symbol && name) setHoldingTarget({ symbol, name }); changeTab('portfolio') },
  }
  const closeStock = () => { setStockTarget({}); changeTab(stockOrigin.current) }
  useEffect(() => {
    if (activeTab !== 'stocks' || !stockTarget.symbol) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { setStockTarget({}); changeTab(stockOrigin.current); return true })
    return () => subscription.remove()
  }, [activeTab, stockTarget.symbol, changeTab])
  const { briefing, cachedAt, loading, error, reload } = useLatestBriefing()
  const sheetRef = useRef<BriefingSheetRef>(null)
  const lastNotificationResponse = Notifications.useLastNotificationResponse()
  const handledNotification = useRef<string | null>(null)

  // 알림을 탭해서 앱이 열린 경우 홈 탭으로 전환하고 바텀시트를 자동으로 띄운다(Design §5.2 User Flow 2번).
  useEffect(() => {
    if (lastNotificationResponse?.notification.request.content.title === 'FireWatch 수집 장애') {
      const id = lastNotificationResponse.notification.request.identifier
      if (handledNotification.current !== id) { handledNotification.current = id; changeTab('portfolio') }
      return
    }
    if (lastNotificationResponse && briefing) {
      const id = lastNotificationResponse.notification.request.identifier
      if (handledNotification.current === id) return
      handledNotification.current = id
      changeTab('brief')
      sheetRef.current?.present()
    }
  }, [lastNotificationResponse, briefing, changeTab])

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: colors.accentSoft },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerTitle: () => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 }}><FirewatchBrand size={27} /><Text numberOfLines={1} style={{ flexShrink: 1, color: colors.text, fontSize: 20, fontWeight: '700', letterSpacing: -.5 }}>FireWatch</Text></View>,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <ThemeToggle />
              <Pressable accessibilityRole="button" accessibilityLabel="계정·설정 열기" onPress={() => router.push('/settings')} style={{ height: 44, width: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}><FirewatchIcon name="account" size={20} color={colors.muted} /></Pressable>
            </View>
          ),
        }}
      />

      {((exploration && !(activeTab === 'stocks' && stockTarget.symbol)) || market) && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, backgroundColor: colors.accentSoft }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{ flex: 1, flexDirection: 'row', gap: 4, padding: 4, borderRadius: 16, backgroundColor: colors.surface }}>
          {TABS.filter(tab => (exploration ? ['candidates', 'stocks', 'short-term'] : ['news', 'brief', 'indices']).includes(tab.key)).map(tab => {
            const selected = activeTab === tab.key
            const label = tab.key === 'candidates' ? '기업 찾기' : tab.key === 'stocks' ? '관심 기업' : tab.key === 'short-term' ? '단기 관찰' : tab.label
            return <Pressable key={tab.key} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} aria-selected={selected} onPress={() => { if (tab.key === 'stocks') setStockTarget({}); changeTab(tab.key) }} style={{ flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 12, backgroundColor: selected ? colors.actionBackground : 'transparent' }}>
              <FirewatchIcon name={tab.icon} size={16} color={selected ? colors.actionText : colors.muted} monochrome />
              <Text style={{ flexShrink: 1, fontSize: 13, fontWeight: selected ? '700' : '500', color: selected ? colors.actionText : colors.muted }}>{label}</Text>
            </Pressable>
          })}
        </View>
      </ScrollView>}

      <View key={`portfolio-${accountEpoch}`} style={{ flex: 1, display: activeTab === 'portfolio' ? 'flex' : 'none' }}><ScreenActivity.Provider value={activeTab === 'portfolio'}><PortfolioScreen initialHolding={holdingTarget} onHoldingConsumed={() => setHoldingTarget(null)} {...discoveryNavigation} onOpenCandidates={() => changeTab('candidates')} /></ScreenActivity.Provider></View>
      {visited.includes('candidates') && <View key={`candidates-${accountEpoch}`} style={{ flex: 1, display: activeTab === 'candidates' ? 'flex' : 'none' }}><ScreenActivity.Provider value={activeTab === 'candidates'}><CandidatesScreen {...discoveryNavigation} /></ScreenActivity.Provider></View>}
      {visited.includes('short-term') && <View key={`short-term-${accountEpoch}`} style={{ flex: 1, display: activeTab === 'short-term' ? 'flex' : 'none' }}><ScreenActivity.Provider value={activeTab === 'short-term'}><CandidatesScreen shortTerm {...discoveryNavigation} /></ScreenActivity.Provider></View>}
      {visited.includes('practice') && <View key={`practice-${accountEpoch}`} style={{ flex: 1, display: activeTab === 'practice' ? 'flex' : 'none' }}><ScreenActivity.Provider value={activeTab === 'practice'}><PracticeScreen /></ScreenActivity.Provider></View>}

      {visited.includes('brief') && <View key={`brief-${accountEpoch}`} style={{ flex: 1, display: activeTab === 'brief' ? 'flex' : 'none' }}><ScreenActivity.Provider value={activeTab === 'brief'}>{(
        <BriefingScreen
          briefing={briefing}
          cachedAt={cachedAt}
          loading={loading}
          error={error}
          onReload={reload}
          onOpenSheet={() => sheetRef.current?.present()}
        />
      )}</ScreenActivity.Provider></View>}
      {visited.includes('stocks') && <View key={`stocks-${accountEpoch}`} style={{ flex: 1, display: activeTab === 'stocks' ? 'flex' : 'none' }}><ScreenActivity.Provider value={activeTab === 'stocks'}><StocksScreen key={stockTarget.symbol ?? stockTarget.query ?? 'watchlist'} onBack={closeStock} initialSymbol={stockTarget.symbol} initialQuery={stockTarget.query} onOpenPortfolio={discoveryNavigation.onOpenPortfolio} /></ScreenActivity.Provider></View>}
      {visited.includes('indices') && <View key={`indices-${accountEpoch}`} style={{ flex: 1, display: activeTab === 'indices' ? 'flex' : 'none' }}><ScreenActivity.Provider value={activeTab === 'indices'}><IndicesScreen /></ScreenActivity.Provider></View>}
      {visited.includes('news') && <View key={`news-${accountEpoch}`} style={{ flex: 1, display: activeTab === 'news' ? 'flex' : 'none' }}><ScreenActivity.Provider value={activeTab === 'news'}><NewsScreen key={newsQuery} initialQuery={newsQuery} /></ScreenActivity.Provider></View>}

      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: insets.bottom, backgroundColor: colors.surface }}>
        {primaryTabs.map((tab) => (
          <Pressable accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: tab.selected }} aria-selected={tab.selected} key={tab.key} onPress={() => { if (activeTab !== tab.key) changeTab(tab.key) }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 60, paddingVertical: 6, gap: 2 }}>
            <FirewatchIcon name={tab.icon} size={22} color={tab.selected ? colors.accent : colors.muted} />
            <Text className={`text-sm font-semibold ${tab.selected ? 'text-brand' : 'text-muted'}`}>
              {tab.label}
            </Text>
            {tab.selected && <View className="mt-1 h-0.5 w-6 rounded-full bg-brand" />}
          </Pressable>
        ))}
      </View>

      {briefing && <BriefingSheet ref={sheetRef} briefing={briefing} />}
    </View>
  )
}
