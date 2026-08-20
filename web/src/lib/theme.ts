import { theme as antdTheme, type ThemeConfig } from 'antd'

// Design Ref: llm-wiki/design.md §4 — 토스/TradingView/Robinhood 벤치마크를 실제 톤(라운드된
// 카드, 낮은 채도 배경, 굵은 숫자)으로 반영. AntD 기본 토큰(colorPrimary #1677ff, radius 6)만
// 쓰던 걸 리디자인하며 여기서 한 번에 정의.
const FONT_FAMILY = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

const sharedTokens = {
  fontFamily: FONT_FAMILY,
  colorPrimary: '#4F46E5', // indigo — 브랜드 포인트. FALLBACK 배지(#6366F1)와 톤이 이어지도록 의도적으로 근접.
  borderRadius: 12,
  borderRadiusLG: 16,
}

export const lightThemeConfig: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    ...sharedTokens,
    colorBgLayout: '#F5F6FA',
    colorBgContainer: '#FFFFFF',
    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
  },
  components: {
    Layout: { headerBg: '#FFFFFF', bodyBg: '#F5F6FA' },
    Card: { boxShadowTertiary: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)' },
  },
}

export const darkThemeConfig: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    ...sharedTokens,
    colorBgLayout: '#0B0F19',
    colorBgContainer: '#141925',
    colorBgElevated: '#1B2231',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.4)',
  },
  components: {
    Layout: { headerBg: '#0B0F19', bodyBg: '#0B0F19' },
    Card: { boxShadowTertiary: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.4)' },
  },
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

// 한국 증시 관례 — 상승 빨강/하락 파랑(브리핑 콘텐츠 색, 위 감사로그 색과 별개 팔레트)
export const TREND_UP_COLOR = '#F5222D'
export const TREND_DOWN_COLOR = '#1677FF'
