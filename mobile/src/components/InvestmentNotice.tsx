import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { investmentNotice } from '../../../shared/investmentNotice'

export function InvestmentNotice() {
  const [expanded, setExpanded] = useState(false)
  return <View className="gap-2 border-t border-line pt-4">
    <Text className="text-sm text-muted">AI 분석은 참고 정보예요. 원금 손실 가능성이 있으며 수익을 보장하지 않아요.</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} className="min-h-11 justify-center"><Text className="text-brand">{expanded ? '분석 한계 접기' : '분석의 한계와 확인할 점 보기'}</Text></Pressable>
    {expanded && <><Text className="font-bold text-ink">{investmentNotice.title}</Text><Text className="text-sm text-muted">{investmentNotice.summary}</Text><Text className="text-sm text-muted">{investmentNotice.limitations}</Text><Pressable accessibilityRole="button" onPress={() => router.push('/investment-info')} className="min-h-11 justify-center"><Text className="text-brand">투자 정보 이용안내</Text></Pressable></>}
  </View>
}
