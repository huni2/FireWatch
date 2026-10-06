import { theme as antdTheme, type ThemeConfig } from 'antd'
import tokens from '../../../shared/design-tokens.json'

// 2026-10-07: 기본 라이트·선택 다크와 오렌지, 웹·모바일 공유 토큰을 사용한다.
const FONT_FAMILY = "'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

// 기존 import 이름을 유지하되 값은 오렌지 브랜드 토큰이다.
export const BRAND_GREEN = tokens.light.accent
// 밝은 배경에서는 대비를 위해 더 짙은 오렌지를 사용한다.
const BRAND_GREEN_DARK = tokens.accent

const CARD_SHADOW_LIGHT = '0 0 0.5px rgba(0, 0, 0, 0.14), 0 1px 1px rgba(0, 0, 0, 0.24)'
const CARD_SHADOW_DARK = '0 0 0.5px rgba(0, 0, 0, 0.4), 0 1px 1px rgba(0, 0, 0, 0.5)'

const sharedTokens = {
  fontFamily: FONT_FAMILY,
  colorPrimary: BRAND_GREEN,
  borderRadius: 12,
  borderRadiusLG: 16,
  fontSize: tokens.typography.body,
  fontSizeHeading1: tokens.typography.title,
  fontSizeHeading3: tokens.typography.section,
}

export const lightThemeConfig: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    ...sharedTokens,
    colorBgLayout: tokens.light.canvas,
    colorBgContainer: '#FFFFFF',
    boxShadow: CARD_SHADOW_LIGHT,
  },
  components: {
    Layout: { headerBg: '#FFFFFF', bodyBg: tokens.light.canvas },
    Card: { boxShadowTertiary: CARD_SHADOW_LIGHT },
    Button: { borderRadius: 10 },
  },
}

export const darkThemeConfig: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    ...sharedTokens,
    colorPrimary: BRAND_GREEN_DARK,
    // 카드 표면을 배경보다 뚜렷이 밝게 + 테두리를 명시적으로 줘서 그림자에만 기대지 않게 함
    // (실측: 그림자 기반 구분은 어두운 바탕 위에서 그림자 자체가 거의 안 보여 카드 경계가 사라짐).
    colorBgLayout: tokens.dark.canvas,
    colorBgContainer: tokens.dark.surface,
    colorBgElevated: tokens.dark.elevated,
    colorText: tokens.dark.text,
    colorTextSecondary: tokens.dark.muted,
    colorBorderSecondary: tokens.dark.border,
    boxShadow: CARD_SHADOW_DARK,
  },
  components: {
    Layout: { headerBg: tokens.dark.surface, bodyBg: tokens.dark.canvas },
    Card: { boxShadowTertiary: CARD_SHADOW_DARK },
    Button: { borderRadius: 10, primaryColor: '#18110D' },
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

// 신문 1면형 섹션 카드(WEB-14, 2026-10-05) — Card를 박스가 아니라 제목 밑줄만 있는 지면 섹션처럼
// 보이게 하는 공통 prop 묶음. 처음엔 대시보드 3곳에서만 썼다가 종목·설정·감사로그 페이지에도
// 같은 스타일을 적용하면서(WEB-15) 반복되길래 여기로 모음.
// paddingInline:0으로 완전히 눕혔더니 "카드 여백이 아예 없다"는 지적(2026-10-05)을 받아
// AntD 기본 패딩은 유지하고 테두리·배경·그림자만 없앤다(= 박스만 빠지고 여백은 그대로).
export const SECTION_CARD_PROPS = {
  variant: 'outlined' as const,
  style: { borderRadius: tokens.radius },
}
