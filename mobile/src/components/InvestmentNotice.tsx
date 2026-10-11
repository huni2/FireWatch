import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { investmentNotice } from '../../../shared/investmentNotice'

export function InvestmentNotice() {
  const [expanded, setExpanded] = useState(false)
  return <View className="gap-2 rounded-xl border border-line bg-surface p-4">
    <Text className="font-bold text-ink">{investmentNotice.title}</Text>
    <Text className="text-sm text-muted">{investmentNotice.summary}</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} className="py-3"><Text className="text-brand">{expanded ? '분석 한계 접기' : '분석의 한계와 확인할 점 보기'}</Text></Pressable>
    {expanded && <><Text className="text-sm text-muted">{investmentNotice.limitations}</Text><Pressable accessibilityRole="button" onPress={() => router.push('/investment-info')} className="min-h-11 justify-center"><Text className="text-brand">투자 정보 이용안내</Text></Pressable></>}
  </View>
}
