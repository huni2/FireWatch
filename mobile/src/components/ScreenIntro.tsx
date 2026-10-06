import { StyleSheet, Text, View } from 'react-native'
import tokens from '../../../shared/design-tokens.json'

export function ScreenIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <View style={styles.card}>
    <View style={styles.signal} />
    <Text style={styles.eyebrow}>{eyebrow}</Text>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
  </View>
}
const styles = StyleSheet.create({
  card: { backgroundColor: tokens.light.surface, borderColor: tokens.light.border, borderWidth: 1, borderRadius: 22, padding: 22, gap: 12, overflow: 'hidden' },
  signal: { position: 'absolute', height: 5, width: 48, backgroundColor: tokens.light.accent, right: 22, top: 22, borderRadius: 8 },
  eyebrow: { color: tokens.light.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, paddingRight: 54 },
  title: { color: tokens.light.text, fontSize: tokens.typography.title, fontWeight: '800', letterSpacing: -.7 },
  description: { color: tokens.light.muted, fontSize: tokens.typography.body, lineHeight: 23 },
})
