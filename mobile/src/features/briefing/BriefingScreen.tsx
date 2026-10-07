import { ScreenIntro } from '@/components/ScreenIntro'
import { InvestmentNotice } from '@/components/InvestmentNotice'
// 홈 탭 콘텐츠 — 오늘의 브리핑 요약 표시만 담당. 브리핑 조회·바텀시트·알림 처리는
// HomeScreen(상단 세그먼트 탭의 상위)이 관리한다(2026-10-04, APP-8 — 탭 전환에도 데이터 유지 위해 분리).
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'

import type { Briefing } from '@/lib/api'

import { RecommendedStockChip } from './components/RecommendedStockChip'
import { qualifiedRecommendations } from '../../../../shared/discovery'

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
  error?: string | null
  onReload?: () => void
}

export function BriefingScreen({ briefing, cachedAt, loading, onOpenSheet, error, onReload }: BriefingScreenProps) {
  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-5 p-5 pb-10">
      <ScreenIntro eyebrow="DAILY MARKET BRIEF" title="오늘의 브리핑" description="시장 흐름을 읽고 내 보유 자산과 함께 살펴보세요." />
      <InvestmentNotice />
      {loading && <ActivityIndicator className="mt-10" />}
      {error && <View className="gap-2 rounded-xl bg-neutral-100 p-4"><Text>{error}</Text><Pressable onPress={onReload}><Text className="text-brand">다시 시도</Text></Pressable></View>}

      {!loading && !briefing && !error && (
        <Text className="mt-10 text-center text-base text-muted">
          오늘자 브리핑이 아직 생성되지 않았습니다
        </Text>
      )}

      {!loading && briefing && (
        <>
          {cachedAt && (
            <View className="self-start rounded-full bg-neutral-100 px-3 py-1">
              <Text className="text-xs text-muted">
                {`🔌 마지막 갱신 ${minutesAgoLabel(cachedAt)}`}
              </Text>
            </View>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel="브리핑 상세 열기" onPress={onOpenSheet} className="gap-3 rounded-2xl border border-line bg-surface p-5">
            <Text className="text-base font-bold text-ink">
              {`증시 요약 · 자료 기준 ${briefing.briefingDate}`}
            </Text>
            <Text className="text-sm font-semibold text-brand">전체 브리핑 읽기 →</Text>
            <Text className="text-sm text-muted" numberOfLines={3}>
              {briefing.marketSummary}
            </Text>
          </Pressable>
          {qualifiedRecommendations(briefing).length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {qualifiedRecommendations(briefing).map(({ stockName: symbol }) => (
                <RecommendedStockChip key={symbol} symbol={symbol} />
              ))}
            </View>
          )}
          {!qualifiedRecommendations(briefing).length && <View className="rounded-2xl border border-line bg-surface p-5"><Text className="text-muted">선정 이유·위험·근거 기사를 갖춘 AI 후보가 아직 없습니다.</Text></View>}
        </>
      )}
    </ScrollView>
  )
}
