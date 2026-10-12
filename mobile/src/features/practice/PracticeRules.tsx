import { AppSheet } from '@/components/AppSheet'
import { ScrollView, Text, View } from 'react-native'
import { useTheme } from '@/lib/theme'
import { gameRules } from '../../../../shared/game-rules'

export function PracticeRules({ open, close }: { open: boolean; close(): void }) {
  const { colors } = useTheme()
  return <AppSheet open={open} title="게임 규칙" close={close}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }}>{gameRules.map(rule => <View key={rule.title} style={{ gap: 8 }}><Text accessibilityRole="header" style={{ fontWeight: '700', fontSize: 17, color: colors.text }}>{rule.title}</Text><Text style={{ fontSize: 15, lineHeight: 24, color: colors.muted }}>{rule.body}</Text></View>)}</ScrollView>
  </AppSheet>
}
