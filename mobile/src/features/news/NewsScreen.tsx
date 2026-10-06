import { ScreenIntro } from '@/components/ScreenIntro'
// web/src/features/news/NewsPage.tsx에 대응하는 모바일 뉴스 화면(APP-10) — 오늘의 관련 뉴스 목록,
// 탭하면 외부 브라우저로 기사 링크를 연다.
import { useCallback, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native'
import type { NewsFilters } from '../../../../shared/investing'

import type { NewsArticle } from '@/lib/api'

import { useResource } from '@/lib/useResource'
import { fetchNewsFeed } from '@/lib/investingApi'

function NewsItem({ article }: { article: NewsArticle }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(article.link)}
      className="gap-1 rounded-xl border border-line bg-surface p-4"
    >
      <Text className="text-sm font-semibold text-ink">{article.title}</Text>
      {article.description && (
        <Text className="text-xs text-muted" numberOfLines={2}>
          {article.description}
        </Text>
      )}
      {article.pubDate && <Text className="text-xs text-muted">{new Date(article.pubDate).toLocaleString('ko-KR')}</Text>}
    </Pressable>
  )
}

export function NewsScreen({ initialQuery = '' }: { initialQuery?: string }) {
  const [draft, setDraft] = useState({ q: initialQuery, from: '', to: '' })
  const [filters, setFilters] = useState<NewsFilters>({ q: initialQuery, page: 0, size: 20 })
  const fetcher = useCallback(() => fetchNewsFeed(filters), [filters])
  const { data, loading, error, reload } = useResource(fetcher)
  const news = data?.news ?? []

  if (loading && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator />
      </View>
    )
  }


  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-4 p-5 pb-10" refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
      <ScreenIntro eyebrow="NEWS ARCHIVE" title="뉴스 보관함" description="날짜와 종목 키워드로 저장된 소식을 다시 찾아보세요." />
      <TextInput accessibilityLabel="뉴스 검색어" placeholder="종목명·키워드 (예: 반도체)" maxLength={100} value={draft.q} onChangeText={q => setDraft(v => ({ ...v, q }))} className="rounded-xl border border-line bg-surface p-3" />
      <TextInput accessibilityLabel="뉴스 시작 날짜" placeholder="시작 날짜 YYYY-MM-DD" value={draft.from} onChangeText={from => setDraft(v => ({ ...v, from }))} className="rounded-xl border border-line bg-surface p-3" />
      <TextInput accessibilityLabel="뉴스 마지막 날짜" placeholder="마지막 날짜 YYYY-MM-DD" value={draft.to} onChangeText={to => setDraft(v => ({ ...v, to }))} className="rounded-xl border border-line bg-surface p-3" />
      <View className="flex-row gap-3"><Pressable onPress={() => setFilters({ ...draft, page: 0, size: 20 })} className="rounded-xl bg-brand p-3"><Text className="text-white">뉴스 찾기</Text></Pressable><Pressable onPress={() => { setDraft({ q: '', from: '', to: '' }); setFilters({ page: 0, size: 20 }) }} className="p-3"><Text>전체 보기</Text></Pressable></View>
      {!loading && !news.length && !error && <Text className="text-muted">이 조건으로 저장된 뉴스가 없습니다.</Text>}
      <Text className="text-xs text-muted">브리핑 이후 추가 소식 · 약 30분 간격{data?.updatedAt ? ` · ${new Date(data.updatedAt).toLocaleString('ko-KR')}` : ''}</Text>
      {error && <Text className="text-red-600">{error}</Text>}
      {news.map((article) => (
        <NewsItem key={article.link} article={article} />
      ))}
      <View className="flex-row justify-between"><Pressable disabled={!filters.page || loading} onPress={() => setFilters(v => ({ ...v, page: (v.page ?? 0) - 1 }))}><Text className="text-brand">이전</Text></Pressable><Text>{(filters.page ?? 0) + 1} 페이지 · {data?.total ?? news.length}건</Text><Pressable disabled={!data?.hasMore || loading} onPress={() => setFilters(v => ({ ...v, page: (v.page ?? 0) + 1 }))}><Text className="text-brand">다음</Text></Pressable></View>
      <Text className="text-xs text-muted">한국 시간 날짜 기준 · 저장된 제목·설명에서 검색합니다.</Text>
    </ScrollView>
  )
}
