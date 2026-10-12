import { useTheme, type ThemeColors } from '@/lib/theme'
import { StyleSheet, Text, View } from 'react-native'
import tokens from '../../../shared/design-tokens.json'

export function ScreenIntro({ title, description }: { eyebrow: string; title: string; description: string }) {
  const { colors: c } = useTheme()
  const styles = createStyles(c)

  return <View style={styles.card}>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
  </View>
}
const createStyles = (c: ThemeColors) => StyleSheet.create({
  card: { gap: 8 },
  title: { color: c.text, fontSize: tokens.typography.title, fontWeight: '700', letterSpacing: -.5 },
  description: { color: c.muted, fontSize: tokens.typography.body, lineHeight: 23 },
})
