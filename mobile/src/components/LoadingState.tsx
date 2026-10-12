import { useTheme } from '@/lib/theme'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { FirewatchBrand } from './FirewatchBrand'
import { LoadingIndicator } from './LoadingIndicator'

export function LoadingState({ message = '자료를 불러오고 있어요', startup = false, inline = false, compact = false }: { message?: string; startup?: boolean; inline?: boolean; compact?: boolean }) {
  const { colors } = useTheme()
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 5000)
    return () => clearTimeout(timer)
  }, [])
  return <View style={{ flex: inline ? undefined : 1, minHeight: inline ? compact ? 64 : 180 : undefined, alignItems: 'center', justifyContent: 'center', padding: compact ? 8 : 24, gap: compact ? 10 : 18, backgroundColor: inline ? undefined : colors.canvas }}>
    {startup && <><FirewatchBrand size={54} /><Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>FireWatch</Text></>}
    <Text accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 15, textAlign: 'center', lineHeight: 23 }}>{message}</Text>
    <LoadingIndicator color={colors.accent} trackColor={colors.border} label={message} width={compact ? 120 : 180} />
    {slow && <Text accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 13, textAlign: 'center' }}>평소보다 조금 오래 걸리고 있어요.</Text>}
  </View>
}
