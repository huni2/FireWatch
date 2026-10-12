import { companyNewsGroups } from '../../../../../shared/company-news'
import { articleText } from '../../../../../shared/article-text'
import { LoadingState } from '@/components/LoadingState'
import { useCallback, useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import { fetchNewsFeed } from '@/lib/investingApi'
import { useResource } from '@/lib/useResource'
import Toast from 'react-native-toast-message'

export function CompanyNews({ name }: { name: string }) {
  const fetcher = useCallback(() => fetchNewsFeed({ q: name, page: 0, size: 5 }), [name])
  const { data, loading, error } = useResource(fetcher)
  const [expanded, setExpanded] = useState(false)
  const groups = companyNewsGroups(data?.news ?? [], name)
  const visible = expanded ? [...groups.headline, ...groups.mentions] : groups.headline
  return <View className="gap-3">
    <Text className="text-base font-semibold text-ink">{name} 이름이 제목에 있는 기사</Text>
    {loading && <LoadingState inline message="기업 관련 소식을 불러오고 있어요" />}
    {error && <Text className="text-danger">관련 뉴스를 불러오지 못했습니다.</Text>}
    {!loading && !error && !groups.headline.length && <Text className="text-sm text-muted">회사 이름이 제목에 있는 저장 기사는 아직 없어요.</Text>}
    {!loading && groups.mentions.length > 0 && <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} className="min-h-11 justify-center"><Text className="text-brand">본문에서 언급된 기사 {groups.mentions.length}개 {expanded ? "접기" : "보기"}</Text><Text className="text-xs text-muted">단순 언급일 수 있어요. 직접 소식인지 원문에서 확인해주세요.</Text></Pressable>}
    {!error && visible.filter(article => /^https?:\/\//i.test(article.link)).map(article => <Pressable key={article.link} accessibilityRole="link" onPress={() => { void Linking.openURL(article.link).catch(() => Toast.show({ type: 'error', text1: '기사를 열지 못했습니다.' })) }} className="gap-2 rounded-xl border border-line bg-surface p-4">
      <Text className="text-xs text-muted">{groups.headline.includes(article) ? "제목에 회사명 포함" : "본문에서 회사명 언급"}</Text>
      <Text className="text-sm font-semibold text-ink" numberOfLines={2}>{articleText(article.title)}</Text>
      {article.pubDate && <Text className="text-xs text-muted">{new Date(article.pubDate).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</Text>}
      {article.description && <Text className="text-xs text-muted" numberOfLines={2}>{articleText(article.description)}</Text>}
    </Pressable>)}
  </View>
}
