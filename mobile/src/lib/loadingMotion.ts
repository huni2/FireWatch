type Loop = { stop(): void; reset(): void; start(): void }
type MotionPreference = {
  isReduceMotionEnabled(): Promise<boolean>
  addEventListener(name: 'reduceMotionChanged', update: (reduce: boolean) => void): { remove(): void }
}

export function bindLoadingMotion(loop: Loop, preference: MotionPreference) {
  let active = true
  let preferenceChanged = false
  const update = (reduce: boolean) => {
    if (!active) return
    loop.stop()
    // Animated.loop.stop marks the loop finished; start alone cannot restart it.
    loop.reset()
    if (!reduce) loop.start()
  }
  const subscription = preference.addEventListener('reduceMotionChanged', reduce => {
    preferenceChanged = true
    update(reduce)
  })
  void preference.isReduceMotionEnabled().then(reduce => {
    if (!preferenceChanged) update(reduce)
  }).catch(() => { if (!preferenceChanged) update(false) })
  return () => { active = false; loop.stop(); subscription.remove() }
}
