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
