// web/src/features/indices/components/MetricStat.tsx의 모바일 버전 — 트렌드 애니메이션 없이 현재값만 표시.
import { Pressable, Text } from 'react-native'
import { useTheme } from '@/lib/theme'

interface MetricCardProps {
  title: string
  value: number | null
  precision?: number
  onPress?(): void
  selected?: boolean
  note?: string
}

export function MetricCard({ title, value, precision = 2, onPress, selected = false, note }: MetricCardProps) {
  const { colors } = useTheme()
  const formatted =
    value == null
      ? '—'
      : new Intl.NumberFormat('ko-KR', { minimumFractionDigits: precision, maximumFractionDigits: precision }).format(
          value,
        )

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title} 그래프 보기`} accessibilityState={{ selected }} onPress={onPress} style={{ minWidth: '45%', flex: 1, gap: 12, borderRadius: 16, borderWidth: 1, borderColor: selected ? colors.accent : colors.border, backgroundColor: colors.surface, padding: 16 }}>
      <Text className="text-xs font-medium text-muted">{title}</Text>
      <Text style={{ fontVariant: ['tabular-nums'] }} className={`text-xl font-bold ${value == null ? 'text-muted' : 'text-ink'}`}>
        {formatted}
      </Text>
      {value == null && <Text className="text-xs text-muted">자료 미수집</Text>}
      {note && value != null && <Text className="text-xs text-muted">{note}</Text>}
      <Text className="text-xs text-brand">{selected ? '보고 있는 지표' : '흐름 보기'}</Text>
    </Pressable>
  )
}
