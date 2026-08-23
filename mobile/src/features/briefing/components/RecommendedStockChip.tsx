import { Text, View } from 'react-native'

export function RecommendedStockChip({ symbol }: { symbol: string }) {
  return (
    <View className="rounded-full bg-brand/10 px-3 py-1.5">
      <Text className="text-sm font-semibold text-brand">{symbol}</Text>
    </View>
  )
}
