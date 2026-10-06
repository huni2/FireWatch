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
    <View className="min-w-[45%] flex-1 gap-3 rounded-2xl border border-line bg-surface p-4">
      <Text className="text-xs font-medium text-muted">{title}</Text>
      <Text style={{ fontVariant: ['tabular-nums'] }} className={`text-xl font-bold ${value == null ? 'text-muted' : 'text-ink'}`}>
        {formatted}
      </Text>
      {value == null && <Text className="text-xs text-muted">자료 미수집</Text>}
    </View>
  )
}
