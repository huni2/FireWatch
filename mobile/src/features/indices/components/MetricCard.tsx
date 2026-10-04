// web/src/features/indices/components/MetricStat.tsx의 모바일 버전 — 트렌드 애니메이션 없이 현재값만 표시.
import { Text, View } from 'react-native'

interface MetricCardProps {
  title: string
  value: number | null
  precision?: number
}

export function MetricCard({ title, value, precision = 2 }: MetricCardProps) {
  const formatted =
    value == null
      ? '—'
      : new Intl.NumberFormat('ko-KR', { minimumFractionDigits: precision, maximumFractionDigits: precision }).format(
          value,
        )

  return (
    <View className="min-w-[30%] flex-1 gap-1 rounded-xl border border-neutral-200 p-3">
      <Text className="text-xs font-medium text-neutral-500">{title}</Text>
      <Text className={`text-lg font-bold ${value == null ? 'text-neutral-300' : 'text-neutral-900'}`}>
        {formatted}
      </Text>
    </View>
  )
}
