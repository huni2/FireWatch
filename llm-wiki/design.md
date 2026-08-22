# FireWatch — Design

디자인 컨셉 정본. 색·컴포넌트·애니메이션·참고 사이트. 근거는 `docs/specs/`의 원본 3문서.

## 1. 컬러 — 감사로그 상태 뱃지 (명세서 5.1절, 고정값)

| 상태 | Hex | AntD `<Tag>` | 의미 |
|---|---|---|---|
| SUCCESS | `#10B981` (Emerald) | `color="success"` | 스케줄러 정상 종료, Gemini API 200 OK, FCM 발송 완료 |
| WARNING | `#F59E0B` (Amber) | `color="warning"` | API 응답 지연(3초 이상), 일부 FCM 토큰 발송 실패 |
| FALLBACK | `#6366F1` (Indigo) | `color="processing"` | Gemini API 장애로 Yahoo/수출입은행 기본 지표로 대체 발송 |
| FAILURE | `#EF4444` (Crimson) | `color="error"` | 스케줄러 예외, Network Timeout, FCM 인증 실패 |

이 네 값은 감사로그 화면 전용이며, 브리핑 콘텐츠(주가 상승/하락 등) 색상과 섞지 않는다.

## 2. UI 프레임워크 선택

| 레이어 | 채택 | 대안(제안서에 있었으나 기각) |
|---|---|---|
| Web | **Ant Design v5** + `darkAlgorithm` | Shadcn UI + Tailwind (조합 B) |
| Mobile | **NativeWind**(Tailwind CSS for RN) | Tamagui, Gluestack UI |

선정 이유·트레이드오프는 [[Decisions/0002-ui-framework-selection]]. 명세서 자체가 이미 AntD를 요구사항(FR-04)으로 못 박고 있어, 제안서의 "조합 A(생산성 중심)"를 그대로 따른다.

## 3. 애니메이션 원칙 (참고 가이드 근거)

**적극 사용**
- 수치 변경 틱(CountUp/Flash): 금/은/환율 수치 갱신 시 슬라이딩 + 상승/하락 반짝임 — Framer Motion(Web) / Reanimated(Mobile).
- 스켈레톤 로딩: 매일 8시 Gemini 응답 대기 중 카드에 적용. 스피너 대신 사용.
- 바텀시트/카드 페이드인: 알림 터치 → 상세 브리핑 카드가 아래에서 위로.

**금지**
- 0.5초 넘는 3D 회전/줌인 페이지 전환.
- 3초 넘게 그려지는 차트 드로잉 애니메이션(숫자를 읽는 것을 방해).

**라이브러리**
| 용도 | 라이브러리 |
|---|---|
| Web 애니메이션 | Framer Motion |
| Mobile 애니메이션 | React Native Reanimated |
| 아이콘/벡터 모션(알림 종, 성공 체크) | Lottie (LottieFiles) |

## 4. 참고 사이트 (벤치마킹용, 코드 의존 아님)

- Mobbin — Finance/Crypto/Investing/Toss/Revolut/Robinhood 검색으로 모바일 앱 흐름 참고.
- Dribbble/Behance — "Financial Dashboard", "Trading Dashboard Dark" 검색으로 색감·다크모드 톤 참고.
- 실제 서비스: 토스(텍스트 가독성), TradingView(다크 테마 표준), Robinhood(초보자 친화 대시보드), Revolut(핀테크 UX).

## 5. 다크 모드

Web은 AntD `ConfigProvider` + `darkAlgorithm`으로 기본 제공. Mobile은 NativeWind의 다크 클래스(`dark:`)를 앱 전역 테마 설정과 연동. 두 플랫폼 모두 다크를 기본값으로 할지, 라이트/다크 토글을 둘지는 미결정 — [[OpenQuestions]] 참고.

## 6. 브랜드 컬러 리스킨 (2026-08-23, 웹만)

루트 `Design.md`(untracked — 스타벅스 사이트에서 추출한 범용 디자인 시스템 문서)를 웹 대시보드에 **토큰 레벨**로 적용. 프레임워크(AntD)·§1의 감사로그 4색·상승/하락 빨강파랑 관례는 그대로 두고, `web/src/lib/theme.ts`의 ConfigProvider 토큰만 교체했다.

| Design.md 토큰 | 값 | 적용처 |
|---|---|---|
| Green Accent | `#00754A` | `colorPrimary`(버튼·링크·차트선·포커스링), 로고 텍스트 — `BRAND_GREEN` 상수 |
| Neutral Warm | `#f2f0eb` | 라이트모드 페이지 캔버스 |
| Ceramic | `#edebe9` | 라이트모드 사이드바 배경 |
| House Green 파생 | `#0F1D19`/`#1E3932`/`#28483F`/`#152622` | 다크모드 캔버스/카드/엘리베이트/사이드바 — Design.md엔 전체앱 다크모드가 없어 House Green(`#1E3932`) 기준으로 직접 파생 |

버튼은 AntD `Button` 컴포넌트 토큰(`borderRadius: 999`)으로 50px 풀필 적용, `active` 시 `scale(0.95)`는 `index.css`에 `.ant-btn:active` 규칙으로 보강(AntD 기본엔 없음). 카드 그림자는 Design.md §6 스펙(`0 0 .5px rgba(0,0,0,.14), 0 1px 1px rgba(0,0,0,.24)`)을 `boxShadow`/`Card.boxShadowTertiary`에 반영.

**의도적으로 안 가져온 것**: 음수 자간(SoDoSans 라틴 전용 원칙 — 한글엔 부적합, Pretendard 유지), Frap 플로팅 버튼·Rewards 카드 등 FireWatch에 대응 개념 없는 컴포넌트, h1 헤딩 전역 색상 교체(가독성 리스크 + 토큰 레벨 범위 초과 판단).

**실측 이슈**: AntD `Layout.Sider`는 `theme="light"/"dark"` prop이 켜지면 `components.Layout.siderBg` 토큰을 무시하고 라이트 프리셋에서 흰색으로 고정한다(다크 프리셋은 토큰을 따름 — 비대칭). `AppShell.tsx`에서 Sider에 인라인 `style.background`로 직접 줘서 우회.
