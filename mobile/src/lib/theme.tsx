import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColorScheme, vars } from 'nativewind'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LoadingIndicator } from '@/components/LoadingIndicator'
import { useClearChartSelection } from './chartSelection'
import { parseThemePreference, resolveTheme, themePalettes, type ThemePreference } from './themeColors'
export type { ThemePreference, ThemeColors } from './themeColors'

export const themeStorageKey = 'firewatch-theme'
const { light, dark } = themePalettes
const ThemeContext = createContext({ preference: 'light' as ThemePreference, dark: false, colors: light, saving: false, setPreference: async (_value: ThemePreference) => {} })
export const useTheme = () => useContext(ThemeContext)

function colorVariables(colors: typeof light) {
  return vars(Object.fromEntries(Object.entries(colors).map(([key, value]) => [
    `--fw-${key}`, [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16)).join(' '),
  ])))
}

// Portals need their own variable scope, including the app web preview.
export function ThemeSurface({ children }: { children: ReactNode }) {
  const { colors } = useTheme()
  const clearChartSelection = useClearChartSelection()
  const variables = useMemo(() => colorVariables(colors), [colors])
  return <View onTouchStart={clearChartSelection} style={[variables, { flex: 1 }]}>{children}</View>
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme()
  const [preference, setMode] = useState<ThemePreference>('light')
  const [ready, setReady] = useState(false), [saving, setSaving] = useState(false)
  const pending = useRef(false)
  useEffect(() => {
    let active = true
    AsyncStorage.getItem(themeStorageKey).then(value => {
      if (!active) return
      const mode = parseThemePreference(value)
      setColorScheme(mode); setMode(mode)
    }).catch(() => { if (active) setColorScheme('light') }).finally(() => { if (active) setReady(true) })
    return () => { active = false }
    // NativeWind's setter is a new wrapper each render; storage is read once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const isDark = resolveTheme(preference, colorScheme) === 'dark'
  const colors = isDark ? dark : light
  const variables = useMemo(() => colorVariables(colors), [colors])
  async function setPreference(mode: ThemePreference) {
    if (pending.current) return
    pending.current = true; setSaving(true)
    try { await AsyncStorage.setItem(themeStorageKey, mode); setColorScheme(mode); setMode(mode) }
    finally { pending.current = false; setSaving(false) }
  }
  if (!ready) return <View style={{ flex: 1, backgroundColor: light.canvas, alignItems: 'center', justifyContent: 'center', gap: 18 }}><Text style={{ color: light.muted }}>화면 설정을 확인하고 있어요</Text><LoadingIndicator color={light.accent} trackColor={light.border} label="화면 설정 확인 중" /></View>
  return <ThemeContext.Provider value={{ preference, dark: isDark, colors, saving, setPreference }}><View style={[variables, { flex: 1, backgroundColor: colors.canvas }]}><StatusBar style={isDark ? 'light' : 'dark'} />{children}</View></ThemeContext.Provider>
}
