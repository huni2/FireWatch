---
source: "2026-08-19 bkit PDCA Plan 체크포인트(/pdca plan firewatch) 중 AskUserQuestion 확인 — [[log]] 2026-08-19"
verified: 2026-08-19
---

# 0003 — MVP는 backend+web 우선, 사용자는 계정 없는 1인 모델, 백엔드는 Oracle Cloud Free Tier

## 상태
채택

## 맥락

원본 명세서에는 로그인/회원가입이 없고(FR-05는 "사용자 설정"만 요구), 백엔드 배포처도 "Oracle Cloud Always Free Tier **또는** Render/Railway"로 복수 후보를 열어뒀다. bkit PDCA Plan 문서(`docs/01-plan/features/firewatch.plan.md`) 작성 중 Checkpoint 2(명세되지 않은 부분 확인)에서 세 가지를 사용자에게 직접 확인했다.

## 결정

1. **사용자 모델**: 계정/로그인 없는 1인용. 기기·서버 설정값 하나로 개인화(관심 키워드·수신 시간)를 관리한다.
2. **MVP 범위**: `backend/`+`web/`을 Phase 1로, `mobile/`(React Native)은 별도 Phase 2 Plan으로 분리한다. Phase 1에도 FR-03(FCM 푸시)은 포함하되 **백엔드 발송 로직까지만**(테스트 디바이스 토큰으로 검증) — 모바일 수신 UI·Expo 빌드·스토어 심사는 Phase 2.
3. **백엔드 배포처**: Oracle Cloud Always Free Tier로 확정(ARM 4 core/24GB, 24/7 상시 무료).

## 근거

- **사용자 모델** — 명세서 자체가 인증을 요구한 적이 없다. 없는 요구사항을 추측으로 만들어 넣으면(다중 사용자·로그인) 구현 범위가 불필요하게 커지고 명세서와 어긋난다. 1인용이 명세서에 가장 가깝고 무료 등급과도 잘 맞는다.
- **MVP 범위 분리** — 모바일 앱은 Expo 빌드·스토어 심사 등 backend/web과 원자재가 다른 별도 트랙이다. 하나의 Plan에 다 넣으면 Design 단계의 아키텍처 옵션 비교(3안)가 3개 서비스에 걸쳐 흐려진다. backend+web만으로도 FR-01·02·04·06·07 전체와 시스템의 핵심 가치(자동 브리핑 + 감사로그)를 증명할 수 있다.
- **Oracle Cloud Free Tier** — 명세서가 1순위로 제시했고, 사용자가 이 세션에서 바로 확정을 선택했다. Risk·비기능요구사항(가용성) 서술이 특정 인프라를 전제해야 구체화되므로 미룰수록 Plan 문서의 실용성이 떨어진다.

## 결과·트레이드오프

**얻는 것** — Plan 문서의 Scope·Risk·Architecture 섹션을 추측 없이 구체적으로 쓸 수 있다. Design 단계에서 다시 이 질문들로 돌아갈 필요가 없다.

**감수하는 것** — 다중 사용자가 필요해지면(예: 가족·지인과 공유) 인증·권한 모델을 나중에 통째로 추가해야 한다. Oracle Cloud Free Tier 정책이 바뀌면 배포 재작업이 필요하다(Risk로 이미 [[../../docs/01-plan/features/firewatch.plan]]에 기록).

## 재검토 트리거

- 여러 사람이 각자 설정을 갖고 싶다는 요구가 생길 때 → 인증 모델 재검토.
- Oracle Cloud Free Tier 리전 가용성·정책 문제 발생 시 → Render/Railway로 전환.
- Phase 1(backend+web)이 안정화된 후 Phase 2(mobile) Plan을 시작할 때 → 이 ADR의 "발송까지만" 경계를 재확인.
