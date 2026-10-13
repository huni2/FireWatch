import { AppSheet } from '@/components/AppSheet'
import { Text, View } from 'react-native'
import { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { useTheme } from '@/lib/theme'
import { gameRules } from '../../../../shared/game-rules'

export function PracticeRules({ open, close }: { open: boolean; close(): void }) {
  const { colors } = useTheme()
  return <AppSheet open={open} title="게임 규칙" close={close}>
    <BottomSheetScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 24 }}>
      {gameRules.map(rule => <View key={rule.title} style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={{ fontWeight: '700', fontSize: 17, color: colors.text }}>{rule.title}</Text>
        <Text style={{ fontSize: 15, lineHeight: 24, color: colors.muted }}>{rule.body}</Text>
      </View>)}
    </BottomSheetScrollView>
  </AppSheet>
}
