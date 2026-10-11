// Android에서 등록 분류를 선택하고 보유 자산·관련 뉴스로 연결한다.
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { Portfolio } from '../../../../shared/investing'
import { connectionLabels, portfolioConnections, type ConnectionKind } from '../../../../shared/portfolio-connections'

export function PortfolioConnections({ portfolio, onOpenStock, onOpenNews }: { portfolio: Portfolio; onOpenStock?: (symbol: string) => void; onOpenNews?: (query: string) => void }) {
  const [kind, setKind] = useState<ConnectionKind>('sector')
  const [key, setKey] = useState('')
  const groups = portfolioConnections(portfolio, kind)
  const selected = groups.find(group => group.key === key) ?? groups[0]
  return <View className="gap-4 rounded-2xl bg-surface p-5"><Text className="text-xl font-bold text-ink">내 투자 연결 지도</Text><Text className="text-sm text-muted">서로 다른 자산에서, 같은 연결을 찾아보세요.</Text>
    <View className="flex-row gap-2">{Object.entries(connectionLabels).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: kind === value }} onPress={() => { setKind(value as ConnectionKind); setKey('') }} className={`min-h-11 flex-1 items-center justify-center rounded-xl ${kind === value ? 'bg-canvas' : ''}`}><Text className="text-ink">{label}</Text></Pressable>)}</View>
    {groups.map(group => <Pressable key={group.key} accessibilityRole="button" accessibilityState={{ selected: group.key === selected?.key }} onPress={() => setKey(group.key)} className={`min-h-11 flex-row items-center justify-between rounded-xl px-3 py-3 ${group.key === selected?.key ? 'bg-canvas' : ''}`}><View className="gap-1"><Text className="font-bold text-ink">{group.label}</Text><Text className="text-xs text-muted">등록 자산 {group.names.length}개</Text></View><Text className="font-bold text-ink">{group.weight == null ? '→' : `${group.weight.toFixed(1)}%`}</Text></Pressable>)}
    {!groups.length && <Text className="text-muted">등록한 ETF가 없어요. 지수명을 입력하면 함께 볼 수 있어요.</Text>}
    {selected && <View className="gap-3 border-t border-line pt-4"><View style={{ backgroundColor: '#eaf4f0', borderRadius: 12, padding: 16 }}><Text style={{ color: '#176e65' }} className="text-xs">{connectionLabels[kind]} 연결 · 등록 기록 기준</Text><Text style={{ color: '#176e65' }} className="text-xl font-bold">{selected.label}</Text></View>{kind === 'index' && selected.key !== '미입력' && selected.names.length > 1 && <Text className="text-muted">다른 ETF를 등록했지만, 같은 지수명을 입력했어요.</Text>}<View style={{ borderLeftWidth: 1, borderLeftColor: '#176e65', paddingLeft: 16 }}>{selected.symbols.map((symbol, index) => <Pressable key={symbol} accessibilityRole="button" disabled={!onOpenStock} onPress={() => onOpenStock?.(symbol)} className="min-h-11 justify-center border-b border-line py-3"><Text className="text-ink">{selected.names[index]} →</Text></Pressable>)}</View>{selected.key !== '미입력' && onOpenNews && <Pressable accessibilityRole="button" onPress={() => onOpenNews(kind === 'currency' ? selected.names[0] : selected.label)} className="min-h-11 justify-center"><Text style={{ color: '#176e65' }}>연결된 소식 찾아보기 →</Text></Pressable>}</View>}
    <Text className="text-xs text-muted">등록 분류 기준이에요. ETF 실제 구성 종목은 분석하지 않아요. 거래 통화와 환율 노출은 달라요. 비중은 가격이 확인된 자산의 서버 계산값이 있을 때만 표시해요.</Text>
  </View>
}
