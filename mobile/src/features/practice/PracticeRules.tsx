import { ModalHeader } from '@/components/ModalHeader'
import { Modal, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ThemeSurface, useTheme } from '@/lib/theme'
import { gameRules } from '../../../../shared/game-rules'

export function PracticeRules({ open, close }: { open: boolean; close(): void }) {
  const { colors } = useTheme()
  return <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
    <ThemeSurface><View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.35)' }}>
      <SafeAreaView style={{ height: '85%', backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <ModalHeader title="게임 규칙" close={close} />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }}>{gameRules.map(rule => <View key={rule.title} style={{ gap: 8 }}><Text accessibilityRole="header" style={{ fontWeight: '700', fontSize: 17, color: colors.text }}>{rule.title}</Text><Text style={{ fontSize: 15, lineHeight: 24, color: colors.muted }}>{rule.body}</Text></View>)}</ScrollView>
      </SafeAreaView>
    </View></ThemeSurface>
  </Modal>
}
