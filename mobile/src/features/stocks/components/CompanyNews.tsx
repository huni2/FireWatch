import { useCallback } from 'react'
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native'
import { fetchNewsFeed } from '@/lib/investingApi'
import { useResource } from '@/lib/useResource'
import Toast from 'react-native-toast-message'

export function CompanyNews({ name }: { name: string }) {
  const fetcher = useCallback(() => fetchNewsFeed({ q: name, page: 0, size: 5 }), [name])
  const { data, loading, error } = useResource(fetcher)
  return <View className="gap-3">
    <Text className="text-base font-semibold text-ink">{name} 관련 뉴스</Text>
    {loading && <ActivityIndicator />}
    {error && <Text className="text-red-600">관련 뉴스를 불러오지 못했습니다.</Text>}
    {!loading && !error && !data?.news.length && <Text className="text-sm text-muted">이 회사에 관한 저장된 뉴스가 아직 없습니다.</Text>}
    {!error && data?.news.filter(article => /^https?:\/\//i.test(article.link)).map(article => <Pressable key={article.link} accessibilityRole="link" onPress={() => { void Linking.openURL(article.link).catch(() => Toast.show({ type: 'error', text1: '기사를 열지 못했습니다.' })) }} className="gap-2 rounded-xl border border-line bg-surface p-4">
      <Text className="text-sm font-semibold text-ink">{article.title}</Text>
      {article.pubDate && <Text className="text-xs text-muted">{new Date(article.pubDate).toLocaleString('ko-KR')}</Text>}
      {article.description && <Text className="text-xs text-muted" numberOfLines={2}>{article.description}</Text>}
    </Pressable>)}
  </View>
}
