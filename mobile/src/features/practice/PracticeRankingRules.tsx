// 앱에서도 웹과 동일한 순위 조건을 펼쳐 확인하게 한다.
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { rankingEligibility, rankingFairness, rankingInitialFunds, rankingRules } from '../../../../shared/game-ranking-rules'

export function PracticeRankingRules() {
  const [expanded, setExpanded] = useState(false)
  return <View className="rounded-2xl border border-line p-4 gap-3">
    <Text className="text-muted">{rankingEligibility}</Text>
    <Text className="text-muted">{rankingInitialFunds}</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} className="py-3" onPress={() => setExpanded(value => !value)}><Text className="font-bold text-ink">{expanded ? '순위 기준 접기' : '순위 등록·산정 기준 보기'}</Text></Pressable>
    {expanded && <View className="gap-4">{rankingRules.map(rule => <View key={rule.title} className="gap-2"><Text className="font-bold text-ink">{rule.title}</Text><Text className="text-muted">{rule.body}</Text></View>)}<Text className="text-muted">{rankingFairness}</Text></View>}
  </View>
}
