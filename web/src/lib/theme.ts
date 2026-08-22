import { theme as antdTheme, type ThemeConfig } from 'antd'

// Design Ref: llm-wiki/design.md §6 — 루트 Design.md(스타벅스 디자인 시스템 추출본)를 토큰
// 레벨로 리스킨. 브랜드 컬러(Green Accent)·따뜻한 크림 캔버스·50px 필 버튼·위스퍼소프트 카드
// 섀도만 가져오고, 프레임워크(AntD)·감사로그 고정 4색·상승↓하락 관례는 그대로 둔다.
const FONT_FAMILY = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

// Design.md §2 Green Accent — 버튼/링크/차트선/포커스링 등 colorPrimary가 파생시키는 모든 곳의 브랜드 시그널.
export const BRAND_GREEN = '#00754A'

// AntD Layout.Sider는 theme="light"/"dark" prop이 켜져 있으면 components.Layout.siderBg 토큰을
// 무시하고 자체 프리셋(라이트=흰색)을 쓴다(실측 확인) — 그래서 AppShell에서 Sider에 직접 인라인
// 스타일로 준다. Design.md Ceramic(라이트) / House Green 파생 다크 톤.
export const SIDER_BG_LIGHT = '#edebe9'
export const SIDER_BG_DARK = '#152622'

const CARD_SHADOW_LIGHT = '0 0 0.5px rgba(0, 0, 0, 0.14), 0 1px 1px rgba(0, 0, 0, 0.24)'
const CARD_SHADOW_DARK = '0 0 0.5px rgba(0, 0, 0, 0.4), 0 1px 1px rgba(0, 0, 0, 0.5)'

const sharedTokens = {
  fontFamily: FONT_FAMILY,
  colorPrimary: BRAND_GREEN,
  borderRadius: 12,
  borderRadiusLG: 16,
}

export const lightThemeConfig: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    ...sharedTokens,
    colorBgLayout: '#f2f0eb', // Design.md Neutral Warm — 크림 페이지 캔버스
    colorBgContainer: '#FFFFFF',
    boxShadow: CARD_SHADOW_LIGHT,
  },
  components: {
    Layout: { headerBg: '#FFFFFF', bodyBg: '#f2f0eb' },
    Card: { boxShadowTertiary: CARD_SHADOW_LIGHT },
    Button: { borderRadius: 999 }, // Design.md "모든 버튼 50px 풀필" — 실제 높이보다 큰 값으로 항상 완전한 필 보장
  },
}

export const darkThemeConfig: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    ...sharedTokens,
    // Design.md엔 전체앱 다크모드가 없어(House Green은 "밴드"로만 등장) House Green(#1E3932)을
    // 기준으로 직접 파생 — 카드=House Green 그대로, 캔버스=더 어둡게, 엘리베이트=더 밝게.
    colorBgLayout: '#0F1D19',
    colorBgContainer: '#1E3932',
    colorBgElevated: '#28483F',
    boxShadow: CARD_SHADOW_DARK,
  },
  components: {
    Layout: { headerBg: '#0F1D19', bodyBg: '#0F1D19' },
    Card: { boxShadowTertiary: CARD_SHADOW_DARK },
    Button: { borderRadius: 999 },
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
