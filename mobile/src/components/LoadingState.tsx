import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Text, View } from 'react-native'
import tokens from '../../../shared/design-tokens.json'
import { FirewatchBrand } from './FirewatchBrand'

export function LoadingState({ message = '자료를 불러오고 있어요', startup = false, inline = false }: { message?: string; startup?: boolean; inline?: boolean }) {
  const [offset] = useState(() => new Animated.Value(0))
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    let active = true
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(offset, { toValue: 120, duration: 1100, useNativeDriver: true }),
      Animated.timing(offset, { toValue: 0, duration: 1100, useNativeDriver: true }),
    ]))
    const update = (reduce: boolean) => { animation.stop(); if (!reduce && active) animation.start() }
    void AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => {})
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update)
    const timer = setTimeout(() => setSlow(true), 5000)
    return () => { active = false; animation.stop(); subscription.remove(); clearTimeout(timer) }
  }, [offset])
  return <View style={{ flex: inline ? undefined : 1, minHeight: inline ? 180 : undefined, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 18, backgroundColor: inline ? undefined : tokens.light.canvas }}>
    {startup && <><FirewatchBrand size={54} /><Text style={{ color: tokens.light.text, fontSize: 24, fontWeight: '700' }}>FireWatch</Text></>}
    <Text accessibilityLiveRegion="polite" style={{ color: tokens.light.muted, fontSize: 15, textAlign: 'center', lineHeight: 23 }}>{message}</Text>
    <View accessibilityRole="progressbar" accessibilityLabel={message} accessibilityValue={{ text: '준비 중' }} style={{ width: 180, height: 4, backgroundColor: tokens.light.border, borderRadius: 2, overflow: 'hidden' }}><Animated.View style={{ width: 60, height: 4, borderRadius: 2, backgroundColor: tokens.light.accent, transform: [{ translateX: offset }] }} /></View>
    {slow && <Text accessibilityLiveRegion="polite" style={{ color: tokens.light.muted, fontSize: 13, textAlign: 'center' }}>평소보다 조금 오래 걸리고 있어요.</Text>}
  </View>
}
