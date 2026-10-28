import { AppSheet, AppSheetScrollView } from '@/components/AppSheet'
import { ActionButton } from '@/components/ActionButton'
import { useTheme } from '@/lib/theme'
import { LoadingState } from '@/components/LoadingState'
// Android 뉴스는 목록을 먼저 보여주고 날짜 입력을 별도 시트에서 처리한다.
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { newsDateRangeError } from '../../../../shared/news-date-range'
import { articleText } from '../../../../shared/article-text'
// web/src/features/news/NewsPage.tsx에 대응하는 모바일 뉴스 화면(APP-10) — 오늘의 관련 뉴스 목록,
// 탭하면 외부 브라우저로 기사 링크를 연다.
import { useCallback, useState } from 'react'
import { Linking, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native'
import { newsQuery } from '../../../../shared/investing'
import type { NewsFilters } from '../../../../shared/investing'

import type { NewsArticle } from '@/lib/api'

import { useResource } from '@/lib/useResource'
import { fetchNewsFeed } from '@/lib/investingApi'

function NewsItem({ article }: { article: NewsArticle }) {
  return (
    <Pressable
      accessibilityRole="link" accessibilityHint="외부 브라우저에서 뉴스 원문을 열어요"
      onPress={() => Linking.openURL(article.link)}
      className="gap-2 border-b border-line py-4"
    >
      <Text className="text-base leading-6 font-semibold text-ink">{articleText(article.title)}</Text>
      {article.description && (
        <Text className="text-sm leading-6 text-muted" numberOfLines={2}>
          {articleText(article.description)}
        </Text>
      )}
      <Text className="text-xs text-primary">뉴스 원문 보기 ↗ · 외부 브라우저로 이동해요</Text>
      {article.pubDate && <Text className="text-xs text-muted">{new Date(article.pubDate).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) + ' KST'}</Text>}
    </Pressable>
  )
}

export function NewsScreen({ initialQuery = '' }: { initialQuery?: string }) {
  const { colors } = useTheme()
  const [dateField, setDateField] = useState<'from' | 'to' | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [validation, setValidation] = useState('')
  const [draft, setDraft] = useState({ q: initialQuery, from: '', to: '' })
  const [filters, setFilters] = useState<NewsFilters>({ q: initialQuery, page: 0, size: 20 })
  const requestKey = newsQuery(filters)
  const fetcher = useCallback(async () => ({ key: requestKey, feed: await fetchNewsFeed(filters) }), [filters, requestKey])
  const { data: response, loading, refreshing, error, refresh } = useResource(fetcher)
  const data = response?.key === requestKey ? response.feed : null
  const news = data?.news ?? []
  function selectDate(event: DateTimePickerEvent, date?: Date) {
    const field = dateField; setDateField(null)
    if (event.type === 'set' && date && field) { const value = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; setDraft(v => ({ ...v, [field]: value })); setValidation('') }
  }
  function apply() { const problem = newsDateRangeError(draft.from, draft.to); setValidation(problem); if (problem) return; setFilters({ ...draft, q: draft.q.trim(), page: 0, size: 20 }); setFilterOpen(false) }



  return (
    <><ScrollView className="flex-1 bg-canvas" keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 p-5 pb-10" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text className="text-2xl font-bold text-ink">{filters.q ? `${filters.q} 관련 소식` : '시장 소식'}</Text>
      <TextInput placeholderTextColor={colors.muted} accessibilityLabel="뉴스 검색어" placeholder="종목명·키워드 (예: 반도체)" maxLength={100} value={draft.q} onChangeText={q => setDraft(v => ({ ...v, q }))} className="rounded-xl border border-line bg-surface p-3 text-ink" />
      <View className="flex-row flex-wrap gap-2"><ActionButton tone="primary" label="뉴스 찾기" onPress={apply} /><ActionButton label="전체 보기" onPress={() => { setValidation(''); setDraft({ q: '', from: '', to: '' }); setFilters({ page: 0, size: 20 }) }} /><ActionButton label="기간 선택" onPress={() => setFilterOpen(true)} /></View>
      {(filters.from || filters.to) && <Text className="text-xs text-muted">한국 날짜 · {filters.from || '처음부터'} ~ {filters.to || '최근까지'}</Text>}
      {validation && !filterOpen && <Text accessibilityRole="alert" className="text-danger">{validation}</Text>}
      {loading && !data && <LoadingState inline message="조건에 맞는 소식을 찾고 있어요" />}
      {!loading && !news.length && !error && <Text className="text-muted">이 조건으로 저장된 뉴스가 없습니다.</Text>}
      {error && <View className="gap-2"><Text accessibilityRole="alert" className="text-danger">{error}</Text><Pressable accessibilityRole="button" onPress={() => void refresh()} className="min-h-12 justify-center"><Text className="text-primary">같은 조건으로 다시 확인</Text></Pressable></View>}
      {news.map((article) => (
        <NewsItem key={article.link} article={article} />
      ))}
      <View className="flex-row flex-wrap items-center justify-between gap-2"><ActionButton label="이전" disabled={!filters.page || loading} onPress={() => setFilters(v => ({ ...v, page: (v.page ?? 0) - 1 }))} /><Text className="text-sm text-ink">{(filters.page ?? 0) + 1} 페이지 · {data?.total ?? news.length}건</Text><ActionButton label="다음" disabled={!data?.hasMore || loading} onPress={() => setFilters(v => ({ ...v, page: (v.page ?? 0) + 1 }))} /></View>
      <Text className="text-xs text-muted">한국 날짜 기준 · 저장된 제목·설명 검색 · 수집 예정 간격 약 {data?.refreshMinutes ?? 30}분, 지연될 수 있어요.{data?.updatedAt ? ` 마지막 수집 ${new Date(data.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST` : ''}</Text>
    </ScrollView><AppSheet open={filterOpen} title="뉴스 기간 선택" close={() => { setDateField(null); setFilterOpen(false) }} footer={<ActionButton fullWidth tone="primary" label="기간 적용" onPress={apply} />}><AppSheetScrollView keyboardShouldPersistTaps="handled" ><Text className="text-muted">한국 시간 날짜 기준 · 비워두면 전체 기간을 찾아요.</Text>      <Pressable accessibilityRole="button" accessibilityLabel="뉴스 시작 날짜 선택" onPress={() => setDateField('from')} className="min-h-12 justify-center rounded-xl border border-line px-4"><Text className="text-ink">시작 날짜 · {draft.from || '전체 기간'}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="뉴스 마지막 날짜 선택" onPress={() => setDateField('to')} className="min-h-12 justify-center rounded-xl border border-line px-4"><Text className="text-ink">마지막 날짜 · {draft.to || '최근까지'}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { setDraft(v => ({ ...v, from: '', to: '' })); setValidation('') }} className="min-h-12 justify-center"><Text className="text-ink">기간 초기화</Text></Pressable>{dateField && <DateTimePicker mode="date" value={draft[dateField] ? new Date(`${draft[dateField]}T12:00:00`) : new Date()} onChange={selectDate} />}{validation && <Text accessibilityRole="alert" className="text-danger">{validation}</Text>}</AppSheetScrollView></AppSheet></>
  )
}
