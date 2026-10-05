import { theme as antdTheme, type ThemeConfig } from 'antd'

// Design Ref: llm-wiki/design.md §6 — 2026-10-05 재설계(메뉴 중복 제거·ECOS 참고 리스킨). 크림
// 캔버스는 AI 생성 디자인에 흔한 클리셰 배색이라 빼고 채도를 낮춘 세이지그레이로, 서체는 Noto Sans
// KR로 교체. 다크모드는 카드와 배경이 거의 구분 안 되던 문제(그림자만으로 구분해 어두운 바탕에서
// 그림자 자체가 안 보임)를 실측 발견해 카드 표면색·테두리를 배경과 분명히 분리했다.
const FONT_FAMILY = "'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

// Design.md §2 Green Accent — 버튼/링크/차트선/포커스링 등 colorPrimary가 파생시키는 모든 곳의 브랜드 시그널.
export const BRAND_GREEN = '#00754A'
// 다크 배경에서 #00754A는 채도가 낮아 보여 밝힌 값 — 라이트는 그대로, 다크 전용.
const BRAND_GREEN_DARK = '#35C080'

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
    colorBgLayout: '#EEF1ED', // 채도 낮춘 세이지그레이 페이지 캔버스(크림 클리셰 대체)
    colorBgContainer: '#FFFFFF',
    boxShadow: CARD_SHADOW_LIGHT,
  },
  components: {
    Layout: { headerBg: '#FFFFFF', bodyBg: '#EEF1ED' },
    Card: { boxShadowTertiary: CARD_SHADOW_LIGHT },
    Button: { borderRadius: 999 }, // Design.md "모든 버튼 50px 풀필" — 실제 높이보다 큰 값으로 항상 완전한 필 보장
  },
}

export const darkThemeConfig: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    ...sharedTokens,
    colorPrimary: BRAND_GREEN_DARK,
    // 카드 표면을 배경보다 뚜렷이 밝게 + 테두리를 명시적으로 줘서 그림자에만 기대지 않게 함
    // (실측: 그림자 기반 구분은 어두운 바탕 위에서 그림자 자체가 거의 안 보여 카드 경계가 사라짐).
    colorBgLayout: '#0E1512',
    colorBgContainer: '#17221C',
    colorBgElevated: '#1C2821',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.09)',
    boxShadow: CARD_SHADOW_DARK,
  },
  components: {
    Layout: { headerBg: '#0E1512', bodyBg: '#0E1512' },
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

// 신문 1면형 섹션 카드(WEB-14, 2026-10-05) — Card를 박스가 아니라 제목 밑줄만 있는 지면 섹션처럼
// 보이게 하는 공통 prop 묶음. 처음엔 대시보드 3곳에서만 썼다가 종목·설정·감사로그 페이지에도
// 같은 스타일을 적용하면서(WEB-15) 반복되길래 여기로 모음.
export const SECTION_CARD_PROPS = {
  variant: 'borderless' as const,
  style: { background: 'transparent' },
  styles: { header: { paddingInline: 0 }, body: { paddingInline: 0 } },
}
