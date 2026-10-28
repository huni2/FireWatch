import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useTheme } from '@/lib/theme'
import { request } from '@/lib/api'
import { searchHoldingCatalog, holdingSearchDescription, type HoldingSearchResult } from '../../../../shared/holding-search'

export function HoldingSearch({ registered, onSelect, onQueryChange }: { registered: string[]; onSelect: (item: HoldingSearchResult) => void; onQueryChange: () => void }) {
  const { colors: c } = useTheme()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<HoldingSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [retry, setRetry] = useState(0)
  const generation = useRef(0)
  const page = useRef(0)
  const busy = useRef(false)
  useEffect(() => {
    const requests = generation
    const token = ++requests.current
    page.current = 0; busy.current = false
    if (!query.trim()) return
    const timer = setTimeout(async () => {
      if (token !== generation.current) return
      busy.current = true
      try {
        const found = await searchHoldingCatalog(request, query)
        if (token !== generation.current) return
        setResults(found.results); setHasMore(found.hasMore); setTotal(found.total)
      } catch { if (token === generation.current) setError(true) }
      finally { if (token === generation.current) { busy.current = false; setLoading(false) } }
    }, 300)
    return () => { clearTimeout(timer); requests.current++ }
  }, [query, retry])
  async function more() {
    if (busy.current || loading || !hasMore) return
    const token = generation.current, next = page.current + 1
    busy.current = true; setLoading(true); setError(false)
    try {
      const found = await searchHoldingCatalog(request, query, next)
      if (token !== generation.current) return
      page.current = next
      setResults(previous => [...previous, ...found.results.filter(item => !previous.some(row => row.symbol === item.symbol))])
      setHasMore(found.hasMore); setTotal(found.total)
    } catch { if (token === generation.current) setError(true) }
    finally { if (token === generation.current) { busy.current = false; setLoading(false) } }
  }
  function changeQuery(text: string) {
    generation.current++; setQuery(text); setResults([]); setError(false); setHasMore(false); setTotal(0); setLoading(!!text.trim()); onQueryChange()
  }
  return <View style={{ gap: 8 }}>
    <Text style={{ color: c.text, fontWeight: '600' }}>주식·ETF 검색</Text>
    <TextInput accessibilityLabel="주식·ETF 검색" value={query} onChangeText={changeQuery} autoCapitalize="none" autoCorrect={false}
      placeholder="회사명, ETF명 또는 종목코드" placeholderTextColor={c.muted} returnKeyType="search"
      style={{ minHeight: 52, padding: 14, borderWidth: 1, borderColor: c.border, borderRadius: 12, color: c.text, fontSize: 16 }} />
    {!!query && <Pressable accessibilityRole="button" accessibilityLabel="검색어 지우기" onPress={() => changeQuery('')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: c.primary }}>검색어 지우기</Text></Pressable>}
    {!query.trim() && <View style={{ gap: 6 }}><Text style={{ color: c.muted, fontSize: 13 }}>검색 예시</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['삼성전자', '애플', 'TIGER'].map(example => <Pressable key={example} accessibilityRole="button" accessibilityLabel={`${example} 검색`} onPress={() => changeQuery(example)} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 12 }}><Text style={{ color: c.text }}>{example}</Text></Pressable>)}</View><Text style={{ color: c.muted, fontSize: 13 }}>예시를 누르면 관련 종목을 검색해요.</Text></View>}
    {(results.length > 0 || hasMore) && <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 300, borderWidth: 1, borderColor: c.border, borderRadius: 12 }}>
      {results.map(item => <Pressable key={item.symbol} accessibilityRole="button" accessibilityLabel={`${item.name}, ${holdingSearchDescription(item)}${registered.includes(item.symbol.toUpperCase()) ? ', 등록됨' : ''}`}
        onPress={() => onSelect(item)} style={{ minHeight: 64, padding: 14, gap: 5, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Text style={{ color: c.text, fontWeight: '600', fontSize: 16 }}>{item.name}{registered.includes(item.symbol.toUpperCase()) ? ' · 등록됨' : ''}</Text>
        <Text style={{ color: c.muted, fontSize: 13 }}>{holdingSearchDescription(item)}</Text>
      </Pressable>)}
      {hasMore && <Pressable accessibilityRole="button" disabled={loading} onPress={() => void more()} style={{ minHeight: 48, padding: 14 }}><Text style={{ color: c.primary }}>{loading ? '불러오는 중…' : '검색 결과 더 보기'}</Text></Pressable>}
    </ScrollView>}
    <Text accessibilityLiveRegion="polite" style={{ color: error ? c.danger : c.muted, fontSize: 13 }}>
      {loading ? '검색 중…' : error ? '검색을 불러오지 못했어요. 입력한 검색어는 유지했어요.' : query.trim() ? total ? `검색 결과 ${total}개 · 보유한 종목을 눌러주세요.` : '등록 가능한 목록에 없어요. 다른 이름이나 종목코드로 검색해보세요.' : '검색 결과에서 보유한 종목을 선택해주세요.'}
    </Text>
    {error && <Pressable accessibilityRole="button" onPress={() => { if (results.length && hasMore) void more(); else { setError(false); setLoading(true); setRetry(value => value + 1) } }} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.primary }}>다시 시도</Text></Pressable>}
  </View>
}
