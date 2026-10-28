// 보유 자산 구성(ETF/개별주식/기타)을 막대 대신 도넛으로 — 색은 웹과 동일한 success/info 역할색을 재사용.
import { View, Text } from 'react-native'
import { PieChart } from 'react-native-gifted-charts'
import { useTheme } from '@/lib/theme'

export function AllocationDonut({ allocation, holdingsCount }: { allocation: Record<string, number>; holdingsCount: number }) {
  const { colors } = useTheme()
  const data = Object.entries(allocation).filter(([, value]) => value > 0).map(([key, value]) => ({
    value,
    color: key === 'ETF' ? colors.success : key === 'STOCK' ? colors.info : colors.muted,
  }))
  if (!data.length) return null
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ alignItems: 'center', paddingVertical: 4 }}>
    <PieChart data={data} donut radius={72} innerRadius={48} innerCircleColor={colors.surface}
      centerLabelComponent={() => <View style={{ alignItems: 'center' }}><Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{holdingsCount}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>개 자산</Text></View>} />
  </View>
}
