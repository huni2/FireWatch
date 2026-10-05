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

## 6. 브랜드 컬러 리스킨 (2026-08-23, 웹만) — 2026-10-05 재설계로 대체됨

루트 `Design.md`(untracked — 스타벅스 사이트에서 추출한 범용 디자인 시스템 문서) 기반 1차 리스킨은 2026-10-05 재설계로 대체됐다. 아래 §7 참고. 이 절은 과거 기록으로만 남긴다.

**실측 이슈(계속 유효)**: AntD `Layout.Sider`는 `theme="light"/"dark"` prop이 켜지면 `components.Layout.siderBg` 토큰을 무시하고 라이트 프리셋에서 흰색으로 고정한다(다크 프리셋은 토큰을 따름 — 비대칭). §7에서 Sider 자체를 없애 이 이슈는 더 이상 해당 없음.

## 7. 2026-10-05 재설계 — 메뉴 중복 제거 + ECOS 참고 리스킨 (웹만)

2026-10-04 앱 리뷰에서 "디자인이 마음에 안 듬 ... 햄버거구성도"라는 지적을 받아, 실제 배포 화면을 스크린샷으로 캡처해 문제를 특정했다: ① 왼쪽 `Sider`와 상단 `Header`가 똑같은 5개 메뉴를 동시에 노출, ② 카드가 전부 흰 배경+얇은 테두리뿐인 AntD 기본값, ③ 다크모드에서 카드가 그림자만으로 배경과 구분돼 그림자 자체가 어두운 바탕 위에서 거의 안 보임, ④ 지수 페이지에서 전일 비교값이 있는 카드만 색이 있고 없는 카드는 테두리까지 안 보여 비일관적. Before/After 비교 Artifact로 사용자에게 먼저 제안해 승인받은 뒤 구현했다 — 사용자가 추가로 한국은행 ECOS(ecos.bok.or.kr) 사이트를 참고하라고 지정.

**ECOS에서 가져온 것(JS로 실측: `Noto Sans KR`, 큰 숫자 `font-weight: 300`, 선택 카드는 `#499AFF` 테두리+`#EDF3FF` 틴트 배경)**:
- 서체를 Pretendard Variable → **Noto Sans KR**로 교체(`index.html` Google Fonts 링크, `index.css`·`theme.ts`의 `FONT_FAMILY`).
- 핵심 수치(`MetricStat`)를 `font-weight: 700`→`300`, `22px`→`26px`로 — 가는 굵기의 큰 숫자가 더 또렷하게 읽힘.
- 대시보드 히어로 카드(`BriefingSummaryCard`)에 `var(--ant-color-primary-bg)` 틴트 배경 + `var(--ant-color-primary-border)` 테두리 — ECOS의 "선택된 카드" 패턴을 AntD의 colorPrimary 파생 토큰으로 구현해 다크모드에서도 자동으로 맞는 명암이 나온다.
- ECOS의 원형 카테고리 아이콘 그리드는 **의도적으로 안 가져옴** — FireWatch 상단 nav는 이미 4개 메뉴로 정리돼 있어, 똑같은 항목을 아이콘으로 또 넣으면 방금 없앤 메뉴 중복 문제가 재발한다.

**메뉴 중복 제거**: `AppShell.tsx`의 `Layout.Sider` 전체를 삭제, 상단 `Header` 하나로 통합. 사이드바 접기 토글(`MenuFoldOutlined`)도 함께 제거 — 더는 접을 사이드바가 없다. 좁은 화면에서는 기존 설계대로 헤더가 가로 스크롤된다(2026-08-23 결정 유지 — AntD `Menu mode="horizontal"`의 자동 "..." 숨김이 "메뉴가 안 보인다"는 불만으로 이어졌던 전례 때문에 항목을 절대 숨기지 않음).

**캔버스 색**: `#f2f0eb`(크림)는 AI 생성 디자인에서 흔히 나오는 클리셰 배색이라 채도를 낮춘 세이지그레이 `#EEF1ED`로 교체.

**다크모드 명암 버그 수정**: 기존엔 카드와 배경을 `boxShadow`(그림자)만으로 구분했는데, 어두운 바탕 위에서는 검은 그림자 자체가 안 보여 카드 경계가 사실상 사라졌다(실측 스크린샷으로 확인). `colorBgContainer`(`#17221C`)를 `colorBgLayout`(`#0E1512`)보다 뚜렷이 밝게, `colorBorderSecondary`를 명시적으로 `rgba(255,255,255,0.09)`로 줘서 테두리에도 기대게 함. `colorPrimary`도 다크 전용으로 `#35C080`(밝힌 그린)으로 올려 어두운 바탕에서의 가독성을 보강.

**지수 페이지 카드 비일관성 수정**: `MetricStat`의 `borderTop` 색이 trend 없을 때 `--ant-color-border-secondary`(거의 투명)였던 걸 `--ant-color-border`(또렷한 중립색)로 바꿔, 색이 있는 카드 옆에서 "테두리가 아예 없다"처럼 보이던 문제를 없앴다.

**범위 밖으로 남긴 것**: 종목/뉴스/설정/감사로그 페이지의 카드 eyebrow 라벨·헤더 밑줄 같은 세부 장식은 이번엔 손대지 않음 — 공통 토큰(폰트·다크모드·nav) 변경만으로 전 페이지에 자동 반영되는 부분까지만 하고, 페이지별 세부 조정은 다음 요청 때 범위를 좁혀 진행하기로.
