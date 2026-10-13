import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { View, type GestureResponderEvent } from 'react-native'

type Reset = () => void
const ChartSelection = createContext({ activate: (_reset: Reset) => {}, release: (_reset: Reset) => {}, clear: () => {} })

export function ChartSelectionProvider({ children }: { children: ReactNode }) {
  const active = useRef<Reset | null>(null)
  const actions = useMemo(() => ({
    activate(reset: Reset) {
      if (active.current && active.current !== reset) active.current()
      active.current = reset
    },
    release(reset: Reset) { if (active.current === reset) active.current = null },
    clear() { const reset = active.current; active.current = null; reset?.() },
  }), [])
  return <ChartSelection.Provider value={actions}><View style={{ flex: 1 }} onTouchStart={actions.clear}>{children}</View></ChartSelection.Provider>
}

export const useClearChartSelection = () => useContext(ChartSelection).clear

// Gifted Charts owns its pointer internally. Remount only a selected chart on an outside touch.
export function useChartSelection() {
  const { activate, release } = useContext(ChartSelection)
  const [version, setVersion] = useState(0)
  const reset = useCallback(() => setVersion(value => value + 1), [])
  useEffect(() => () => release(reset), [release, reset])
  const onTouchStart = (event: GestureResponderEvent) => { event.stopPropagation(); activate(reset) }
  return { version, onTouchStart }
}
