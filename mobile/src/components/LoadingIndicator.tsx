import { useContext, useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, View } from 'react-native'
import { ScreenActivity } from '@/lib/screenActivity'
import { bindLoadingMotion } from '@/lib/loadingMotion'

// A busy indicator, not an invented percentage of an unknown server operation.
export function LoadingIndicator({ color, trackColor, label, width = 180 }: { color: string; trackColor: string; label: string; width?: number }) {
  const active = useContext(ScreenActivity)
  const [offset] = useState(() => new Animated.Value(0))
  const segment = width / 3
  useEffect(() => {
    if (!active) return
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(offset, { toValue: width - segment, duration: 900, easing: Easing.linear, useNativeDriver: true, isInteraction: false }),
      Animated.timing(offset, { toValue: 0, duration: 900, easing: Easing.linear, useNativeDriver: true, isInteraction: false }),
    ]))
    return bindLoadingMotion(loop, AccessibilityInfo)
  }, [offset, width, segment, active])
  return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ text: '처리 중' }} style={{ width, height: 4, backgroundColor: trackColor, borderRadius: 2, overflow: 'hidden' }}>
    <Animated.View style={{ width: segment, height: 4, borderRadius: 2, backgroundColor: color, transform: [{ translateX: offset }] }} />
  </View>
}
