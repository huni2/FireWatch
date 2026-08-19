import { theme as antdTheme, type ThemeConfig } from 'antd'

export const lightThemeConfig: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: { colorPrimary: '#1677ff' },
}

export const darkThemeConfig: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: { colorPrimary: '#1677ff' },
}

// Design Ref: llm-wiki/design.md §1 — 감사로그 상태 4색(고정값, 브리핑 콘텐츠 색과 분리)
export const AUDIT_STATUS_TAG_COLOR: Record<string, string> = {
  SUCCESS: 'success',
  WARNING: 'warning',
  FALLBACK: 'processing',
  FAILURE: 'error',
}

export const AUDIT_STATUS_LABEL: Record<string, string> = {
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  FALLBACK: 'FALLBACK',
  FAILURE: 'FAILURE',
}
