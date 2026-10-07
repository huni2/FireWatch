import { useCallback, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, Text, TextInput, View } from 'react-native'
import { request } from '@/lib/api'
import { useResource } from '@/lib/useResource'
import { catalogQuery, type CatalogPage } from '../../../../shared/catalog'

export function CatalogExplorer({ onOpenStock }: { onOpenStock?: (symbol: string) => void }) {
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [region, setRegion] = useState('')
  const load = useCallback(() => request<CatalogPage>(`/api/catalog?${catalogQuery(q, 'ETF', region)}`), [q, region])
  const catalog = useResource(load)
  return <View className="gap-3 rounded-xl border border-line bg-surface p-4">
    <Text className="text-lg font-bold text-ink">ETF 상품 비교</Text><Text className="text-sm text-muted">ISA는 계좌, S&P500은 지수입니다. 같은 지수를 추종하는 상품의 거래 통화와 운용사를 확인하세요.</Text>
    <TextInput accessibilityLabel="저장된 ETF 검색" placeholder="예: S&P500, 타이거" value={text} onChangeText={setText} onSubmitEditing={() => setQ(text)} returnKeyType="search" className="rounded-lg border border-line p-3 text-ink" />
    <Pressable accessibilityRole="button" onPress={() => setQ(text)} className="min-h-11 justify-center"><Text className="text-brand">ETF 검색</Text></Pressable>
    <View className="flex-row flex-wrap gap-2">{[{ key: '', name: '전체' }, { key: 'KR', name: '한국 상장' }, { key: 'US', name: '미국 상장' }].map(item => <Pressable accessibilityRole="button" accessibilityState={{ selected: region === item.key }} key={item.key} onPress={() => setRegion(item.key)} className={`min-h-11 justify-center rounded-lg p-3 ${region === item.key ? 'bg-brand' : 'bg-canvas'}`}><Text className={region === item.key ? 'text-white' : 'text-ink'}>{item.name}</Text></Pressable>)}</View>
    {catalog.loading && <ActivityIndicator accessibilityLabel="ETF 목록 불러오는 중" />}
    {catalog.error && <><Text className="text-muted">ETF 목록: {catalog.error}</Text><Pressable accessibilityRole="button" onPress={() => void catalog.reload()} className="py-3"><Text className="text-brand">다시 시도</Text></Pressable></>}
    {catalog.data && <Text className="text-muted">저장된 ETF {catalog.data.total}개{catalog.data.hasMore ? ' · 일부 결과입니다. 검색어를 더 입력하세요.' : ''}</Text>}
    {!catalog.loading && catalog.data?.items.map(({ instrument: item, price, quoteAt }) => <View key={item.symbol} className="gap-2 rounded-lg border border-line p-4">
      <Text className="font-bold text-ink">{item.name}</Text><Text className="text-muted">{item.region === 'KR' ? '한국 상장' : '미국 상장'} · {item.currency} 거래 · {item.underlyingIndex}</Text><Text className="text-muted">운용사 · {item.issuer}</Text>
      <Text className="text-muted">{price == null ? '저장된 시세 없음 · 상세 차트에서 확인' : `${price.toLocaleString()} ${item.currency}`}</Text>{quoteAt && <Text className="text-xs text-muted">시세 기준 {new Date(quoteAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST</Text>}
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(item.source)} className="py-3"><Text className="text-brand">공식 상품 설명·비용 확인 ↗</Text></Pressable><Text className="text-xs text-muted">상품 정보 확인 · {item.verifiedAt}</Text>
      {onOpenStock && <Pressable accessibilityRole="button" onPress={() => onOpenStock(item.symbol)} className="py-3"><Text className="text-brand">가격·차트 보기</Text></Pressable>}
    </View>)}
    {!catalog.loading && catalog.data?.total === 0 && <Text className="text-muted">저장된 목록에 해당 ETF가 없습니다.</Text>}
    <Text className="text-xs text-muted">공식 출처를 확인한 시작 목록이며 추천 순위가 아닙니다. 최신 총비용·환헤지·분배 방식·ISA 및 연금 매수 가능 여부는 금융회사와 운용사에서 확인하세요.</Text>
  </View>
}
