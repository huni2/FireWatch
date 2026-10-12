import tokens from '../../../shared/design-tokens.json'

export type ThemePreference = 'light' | 'dark' | 'system'
export const themePalettes = {
  light: { ...tokens.light, onAccent: '#FFFFFF', accentSoft: '#FFF0E6', negative: '#2563EB', danger: '#B42318', info: '#2C527F', success: '#176E65', successSoft: '#EAF4F0' },
  dark: { ...tokens.dark, accent: tokens.accent, onAccent: '#17202E', accentSoft: '#30231C', negative: '#8AB4FF', danger: '#FF9D95', info: '#9BC4F7', success: '#6BD6C5', successSoft: '#142D2A' },
}
export type ThemeColors = typeof themePalettes.light
export const parseThemePreference = (value: unknown): ThemePreference => value === 'dark' || value === 'system' ? value : 'light'
export const resolveTheme = (preference: ThemePreference, system: string | null | undefined) => preference === 'system' ? system === 'dark' ? 'dark' : 'light' : preference
