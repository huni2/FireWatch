import tokens from '../../../shared/design-tokens.json'

export type ThemePreference = 'light' | 'dark' | 'system'
// accent(오렌지)는 불꽃 로고 전용으로 남기고, 버튼/선택 상태 등 액션 색은 primary(인디고)를 쓴다 — 웹과 동일한 역할 분리.
export const themePalettes = {
  light: { ...tokens.light, actionBackground: '#DEE1FF', actionText: '#17202E', gameActionBackground: '#E4DAFF', gameActionText: '#17202E', primarySoft: '#EEF0FF', gameSoft: '#F3EEFF', negative: '#2563EB', danger: '#B42318', info: '#2C527F', success: '#176E65', successSoft: '#EAF4F0' },
  dark: { ...tokens.dark, accent: tokens.accent, primary: tokens.primary, game: tokens.game, actionBackground: '#32377A', actionText: tokens.dark.text, gameActionBackground: '#4C3E99', gameActionText: tokens.dark.text, primarySoft: '#262A4A', gameSoft: '#2A2340', negative: '#8AB4FF', danger: '#FF9D95', info: '#9BC4F7', success: '#6BD6C5', successSoft: '#142D2A' },
}
export type ThemeColors = typeof themePalettes.light
export const parseThemePreference = (value: unknown): ThemePreference => value === 'dark' || value === 'system' ? value : 'light'
export const resolveTheme = (preference: ThemePreference, system: string | null | undefined) => preference === 'system' ? system === 'dark' ? 'dark' : 'light' : preference
