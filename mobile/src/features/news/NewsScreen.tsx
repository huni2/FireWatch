// web/src/features/news/NewsPage.tsx에 대응하는 모바일 뉴스 화면(APP-10) — 오늘의 관련 뉴스 목록,
// 탭하면 외부 브라우저로 기사 링크를 연다.
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native'

import type { NewsArticle } from '@/lib/api'

import { useLatestBriefing } from '../briefing/hooks/useLatestBriefing'

function NewsItem({ article }: { article: NewsArticle }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(article.link)}
      className="gap-1 rounded-xl border border-neutral-200 p-4"
    >
      <Text className="text-sm font-semibold text-neutral-900">{article.title}</Text>
      {article.description && (
        <Text className="text-xs text-neutral-500" numberOfLines={2}>
          {article.description}
        </Text>
      )}
    </Pressable>
  )
}

export function NewsScreen() {
  const { briefing, loading } = useLatestBriefing()
  const news = briefing?.news ?? []

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    )
  }

  if (news.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-center text-base text-neutral-500">관련 뉴스가 없습니다</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-3 p-6">
      {news.map((article) => (
        <NewsItem key={article.link} article={article} />
      ))}
    </ScrollView>
  )
}
