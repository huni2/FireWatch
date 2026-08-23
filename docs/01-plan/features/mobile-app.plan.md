# mobile-app Planning Document

> **Summary**: Expo(React Native) + NativeWind로 FireWatch 모바일 앱을 만들어 FCM 푸시를 수신하고, 알림 터치 시 바텀시트로 오늘의 브리핑을 보여주며, 설정을 웹과 동일한 백엔드 API로 관리하는 Phase 2.
>
> **Project**: FireWatch
> **Version**: 0.1.0 (unreleased)
> **Author**: Project Owner
> **Date**: 2026-08-23
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 데스크톱 웹 대시보드는 매일 아침 브리핑을 "직접 열어봐야" 확인할 수 있고, FR-03(FCM 푸시 알림)의 발송 측(백엔드)은 Phase 1에서 이미 완료됐지만 수신할 모바일 앱이 없어 반쪽짜리로 남아있다. |
| **Solution** | Expo(React Native, SDK 50+) + NativeWind + Expo Router로 모바일 앱을 스캐폴딩하고, `expo-notifications`로 이미 완성된 백엔드 FCM 발송을 그대로 수신 — 알림 터치 시 바텀시트로 오늘의 요약·추천종목을 보여주고, 관심 키워드·수신 시간 설정은 웹과 동일한 API를 재사용한다. |
| **Function/UX Effect** | 사용자는 폰 알림만 확인해도 오늘 브리핑 핵심을 즉시 볼 수 있고, 오프라인 상태에서도 마지막으로 받은 브리핑이 남아있다. |
| **Core Value** | "웹에서 이미 검증된 백엔드(FCM 발송·설정·브리핑 API)를 한 줄도 안 바꾸고 재사용해, 최소 비용(개발 빌드까지만, 스토어 제출 없음)으로 모바일 수신 경험을 완성한다." |

---

## Context Anchor

> Auto-generated from Executive Summary. Propagated to Design/Do documents for context continuity.

| Key | Value |
|-----|-------|
| **WHY** | 데스크톱에서만 브리핑을 봐야 하는 불편함 + FR-03 수신 측(모바일)이 Phase 1에서 비어있던 문제 |
| **WHO** | 기존과 동일한 1인 사용자, 계정/로그인 없음([[../../llm-wiki/Decisions/0003-mvp-scope-and-user-model]] 유지) |
| **RISK** | Expo/RN 생태계의 빠른 버전 변화, 이 세션(Windows 개발환경)에서 iOS 시뮬레이터를 못 쓰는 실기기 검증 제약 |
| **SUCCESS** | Expo Go(또는 개발 빌드)로 실기기에서 푸시 수신 → 바텀시트 브리핑 확인, 설정 화면 왕복 확인 |
| **SCOPE** | **Phase 2 전체**(이번 Plan) — APP-1(스캐폴딩)·APP-2(푸시 수신)·APP-3(브리핑 UI)·APP-4(설정 화면). 앱스토어/플레이스토어 실제 제출은 Out of Scope(비용 발생, $0 원칙과 충돌). |

---

## 1. Overview

### 1.1 Purpose

FireWatch의 핵심 가치("매일 아침 자동 브리핑")를 실제로 소비하는 채널을 데스크톱 웹 하나에서 모바일 푸시 알림으로 확장한다. 백엔드는 Phase 1에서 이미 FCM 발송·브리핑 이력·사용자 설정 API를 전부 구현해뒀으므로, Phase 2는 순수하게 그 API들을 소비하는 모바일 클라이언트를 만드는 작업이다.

### 1.2 Background

원본 명세서(`docs/specs/프로젝트 기획 및 시스템 명세서.pdf`)의 FR-03(FCM 푸시 알림)은 발송(백엔드)과 수신(모바일)으로 나뉘는데, Phase 1 Plan([[firewatch.plan.md]]) §2.2에서 "모바일 앱(RN) 전체는 Out of Scope — 별도 `mobile-app` Plan으로 Phase 2에서 다룬다"고 명시적으로 미뤄뒀다. 이번이 그 Phase 2다. `mobile/` 디렉터리는 아직 없고, 의존하는 백엔드 과제(BE-5 FCM 발송, BE-6 브리핑 이력 API, BE-7 설정 API)는 모두 완료 상태다([[../../llm-wiki/Next-Tasks]] 종료 기록).

### 1.3 Related Documents

- Phase 1 Plan: `docs/01-plan/features/firewatch.plan.md` §2.2(Out of Scope), §9(Next Steps 3번)
- 위키 컨텍스트: `llm-wiki/design.md`(§2 Mobile=NativeWind, §3 애니메이션 원칙), `llm-wiki/Next-Tasks.md`(APP-1~4)
- ADR: `llm-wiki/Decisions/0003-mvp-scope-and-user-model.md`(계정 없는 1인 모델, 월 $0 원칙)

---

## 2. Scope

### 2.1 In Scope (Phase 2 — 이번 Plan)

- [ ] **APP-1**: `mobile/`에 Expo(React Native SDK 50+) + NativeWind + Expo Router 프로젝트 스캐폴딩
- [ ] **APP-2**: `expo-notifications`로 디바이스 토큰 등록(백엔드 `user_settings.fcm_tokens`에 저장) + 푸시 수신 핸들러
- [ ] **APP-3**: 알림 터치 시 바텀시트로 오늘의 브리핑(요약+추천종목) 표시, 오프라인 시 마지막 브리핑 로컬 캐시로 표시
- [ ] **APP-4**: 설정 화면(관심 키워드, 수신 시간) — 웹(WEB-4)과 동일한 `PUT /api/settings` 재사용
- [ ] Expo Go 또는 개발 빌드로 실기기 1회 이상 왕복 검증(토큰 등록 → 수동 트리거 → 알림 수신 → 상세 확인)

### 2.2 Out of Scope

- **Apple App Store / Google Play 실제 제출·심사** — Apple Developer Program 연 $99, Google Play 등록 $25(일회성)가 발생해 "월 $0 유지" 원칙([[../../llm-wiki/Decisions/0003-mvp-scope-and-user-model]])과 충돌.
- **iOS 설치형 빌드(스토어 미경유 사이드로드 포함)** — 2026-08-23 확인: Apple Developer Program 없이는 APNs 서명 자체가 안 돼 Expo Go 밖에서 못 씀. 연 $99를 낼지는 나중에 별도 결정 — 지금은 Android EAS Build(내부배포 APK)만 진행.
- **감사로그 뷰어 모바일 이식** — 감사로그는 운영자(개발자) 도구 성격이 강해 웹 전용으로 유지.
- **지수/뉴스/가이드/사용방법 등 웹에 있는 부가 화면** — 원본 명세서 FR-03의 모바일 범위는 "수신 UI"(브리핑 상세)뿐이었고, 나머지 화면들은 이번 세션 중 웹에만 추가된 확장 기능. 모바일까지 미러링할지는 이 Phase 2 완료 후 별도 판단.
- **다중 사용자·로그인** — 기존 결정([[../../llm-wiki/Decisions/0003-mvp-scope-and-user-model]]) 유지.
- **iOS/Android 스토어별 브랜딩 디테일**(전용 앱 아이콘 세트, 스플래시 화면 등) — 실제 스토어 제출이 Out of Scope이므로 Design 단계에서 필요한 최소한만 다룬다.

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-08 | 모바일 프로젝트 스캐폴딩 — Expo(RN)+NativeWind+Expo Router (APP-1) | High | Pending |
| FR-09 | FCM 디바이스 토큰 등록 + 푸시 수신 핸들러 (APP-2, BE-5 연동) | High | Pending |
| FR-10 | 알림 터치 시 바텀시트 브리핑 상세 표시, 오프라인 캐시 포함 (APP-3, BE-6 연동) | High | Pending |
| FR-11 | 관심 키워드·수신 시간 설정 화면(모바일) (APP-4, BE-7 연동) | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|--------------------|
| 비용 | 월 $0, Apple/Google 유료 계정 미등록 | Expo/Firebase 청구 대시보드 수동 확인 |
| 애니메이션 | 바텀시트 전환 0.5초 이내, 3D 회전/줌 금지([[../../llm-wiki/design]] §3) | 실기기 육안 확인 |
| 오프라인 대응 | 네트워크 없이도 마지막 수신 브리핑이 로컬(AsyncStorage)에서 표시됨 | 비행기 모드로 실기기 검증 |
| 호환성 | 기존 백엔드 API(브리핑/설정/FCM 발송)를 한 글자도 안 바꾸고 그대로 소비 | 코드 리뷰 — `backend/` 변경 diff가 0이어야 함 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-08~11 전체 구현
- [ ] 실기기(Expo Go 또는 개발 빌드)에서 알림 권한 요청 → 토큰이 백엔드 `user_settings.fcm_tokens`에 저장됨을 확인
- [ ] 수동 트리거(`/api/scheduler/trigger`) 후 실기기에 실제 푸시 알림 도착 확인
- [ ] 알림 터치 → 바텀시트로 오늘의 브리핑 상세가 0.5초 이내 애니메이션으로 열림
- [ ] 비행기 모드에서 앱을 열어도 마지막 브리핑이 표시됨(오프라인 캐시)
- [ ] 설정 화면에서 키워드/시간 변경 → 웹 설정 화면에도 동일하게 반영됨(같은 API 왕복 확인)

### 4.2 Quality Criteria

- [ ] `npx expo-doctor` 또는 `npx tsc --noEmit` 통과(타입 에러 0)
- [ ] Zero lint errors(ESLint)
- [ ] 핵심 경로(토큰 등록, 알림 수신, 오프라인 캐시) 수동 검증 — 1인 프로젝트 특성상 E2E 자동화보다 실기기 수동 검증 우선(Phase 1과 동일 원칙)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Expo SDK/RN 버전이 자주 바뀌어 스캐폴딩 시점 최신 버전과 튜토리얼이 어긋날 수 있음 | Medium | Medium | `npx create-expo-app`로 항상 최신 템플릿 그대로 생성, 버전은 스캐폴딩 직후 실측해 문서에 기록 |
| 이 세션(Windows 개발환경)은 iOS 시뮬레이터를 못 쓰고, Android 에뮬레이터도 별도 설치 필요 | High | High | 사용자 실기기 + Expo Go 앱으로 QR 스캔하는 방식을 기본 검증 경로로 삼는다 — 사용자 협조 필요 |
| 알림 권한을 거부하면 푸시를 아예 못 받음 | Medium | Medium | 권한 거부 상태에서도 앱을 열면 `GET /api/briefings/latest`로 직접 조회해 보여주는 폴백 마련(APP-3에 포함) |
| FCM 토큰이 기기 재설치·재설정마다 바뀜 | Low | Medium | 이미 백엔드에 무효 토큰 자동 정제 로직이 있음(BE-5 완료, `MessagingErrorCode.UNREGISTERED` 처리) — 모바일은 앱 시작 시 토큰을 매번 재등록하면 충분 |

---

## 6. Impact Analysis

> 대부분은 `backend/`·`web/`를 전혀 건드리지 않는다. 단, Design 단계에서 실제 코드를 확인하니 **`fcm_tokens` 컬럼은 있지만 이를 등록할 API가 없다**는 걸 발견했다(`SettingsUpdateRequest`에 `fcmToken` 필드 자체가 없음, `PushService`는 저장된 토큰을 읽고 정리만 함) — APP-2(푸시 수신)가 성립하려면 최소한 이 필드 하나는 백엔드에 추가해야 한다. "0 diff" 가정을 소폭 수정.

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `mobile/` | 신규 디렉터리 | Expo 프로젝트 전체 신설 |
| `PUT /api/settings` | API 확장(소폭) | `SettingsUpdateRequest`에 선택적 `fcmToken: String?` 필드 추가 — 있으면 기존 `fcmTokensRaw` 목록에 병합(중복 제거). 새 엔드포인트가 아니라 기존 것 확장. |

### 6.2 Current Consumers

N/A — `backend/` API를 읽기만 하는 새 소비자 추가, 기존 API 스펙 변경 없음.

### 6.3 Verification

- [ ] `backend/` 디렉터리에 diff가 없는지 확인(이 Plan 완료 시점)

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

> **주의**: 이 표는 bkit 기본 웹앱 템플릿(Next.js+bkend.ai) 기준이라 FireWatch 모바일(Expo+자체 Kotlin 백엔드)에는 그대로 맞지 않는다. 참고용으로만 표시.

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites, portfolios | ☐ |
| **Dynamic** | Feature-based modules, BaaS 연동 | Web/모바일 + 백엔드 | ☐(BaaS 미사용) |
| **Enterprise** | 계층 분리, DI, 마이크로서비스 | 대규모 시스템 | ☐(불필요) |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 프레임워크 | Expo(RN) / bare RN / Flutter | **Expo(React Native) SDK 50+** | 이미 [[../../llm-wiki/design]] §2에서 확정, Expo Go로 실기기 검증이 쉬움 |
| 스타일링 | NativeWind / StyleSheet / Tamagui | **NativeWind**(Tailwind for RN) | [[../../llm-wiki/design]] §2에서 이미 확정 |
| 네비게이션 | Expo Router / React Navigation | **Expo Router**(파일 기반) | 이번 세션 체크포인트에서 확정 — 웹의 react-router와 개념이 비슷해 컨텍스트 전환 비용이 낮음 |
| 상태 관리 | Context / Zustand / Redux | **로컬 상태 + AsyncStorage**(오프라인 캐시) | 웹과 동일 원칙(Plan §7.2) — 화면 규모상 전역 상태 라이브러리는 과설계 |
| 푸시 알림 | expo-notifications / react-native-firebase | **expo-notifications** | Expo 관리형 워크플로와 가장 잘 맞음. **APP-2 진행 중 갱신(2026-08-23)**: 백엔드가 원래 쓰던 Firebase Admin SDK 직접 발송은 iOS(APNs)·Android(FCM) 토큰 형식이 달라 react-native-firebase+커스텀 빌드 없이는 iOS를 못 받아, Expo Push Service(`getExpoPushTokenAsync`+백엔드가 `exp.host` 호출)로 전환 — 두 플랫폼 다 Expo Go로 커버 |
| API 클라이언트 | fetch / axios | **fetch** | 웹(`web/src/lib/api.ts`)과 동일 스타일 유지 |
| 배포 | Expo Go만 / EAS Build로 설치형 빌드 | **Android: EAS Build 내부배포(APK 직접 다운로드)** / **iOS: 보류** | 2026-08-23 갱신 — 스토어 제출은 여전히 Out of Scope지만, "폰에 앱으로 설치해서 쓰고 싶다"는 요청으로 EAS Build 무료 티어 내부배포(스토어 미경유)까지는 범위에 포함. iOS 사이드로드는 Apple Developer Program 연 $99가 필요해 $0 원칙([[../../llm-wiki/Decisions/0003-mvp-scope-and-user-model]])과 충돌 — Android만 진행, iOS는 가입 여부를 나중에 별도 결정 |

### 7.3 Clean Architecture Approach

```
Selected: 자체 구조 (웹의 features/ 패턴을 모바일에 맞게 이식)

mobile/
  app/            (Expo Router — 파일 기반 라우트: index, settings 등)
  src/features/   (briefing/, settings/ — 웹의 features/ 패턴과 동일 철학)
  src/lib/        (api.ts — 웹과 거의 동일한 fetch 래퍼 재사용/이식)
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md` — llm-wiki 연동 규칙(모바일도 동일 적용, `[APP]` 태그 사용)
- [ ] `mobile/` ESLint/TypeScript 설정 — 스캐폴딩 시 Expo 기본값으로 생성
- [ ] `mobile/.env` 관례 — 8.3절

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | 미정 | 웹의 `features/{name}/{Name}Page.tsx` 패턴을 모바일 화면 컴포넌트에도 적용할지 | Medium |
| **Folder structure** | 미정(7.3절 초안만 있음) | `mobile/app/`·`mobile/src/` 내부 구조 확정 | High |
| **Error handling** | 미정 | 오프라인/네트워크 실패 시 폴백 UX(Design 단계 핵심 과제) | High |

### 8.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `EXPO_PUBLIC_API_BASE_URL` | 모바일 → 백엔드 API 엔드포인트(웹의 `VITE_API_BASE_URL`과 동일 값) | Client | ☐ |
| `EXPO_PUBLIC_SETTINGS_API_KEY` | 설정 저장 API 인증(웹의 `VITE_SETTINGS_API_KEY`와 동일 값, ADR 0004) | Client | ☐ |
| Firebase 설정(`google-services.json`/`GoogleService-Info.plist`) | FCM 수신용 — Firebase 콘솔에서 iOS/Android 앱 등록 후 다운로드 | Client | ☐ |

### 8.4 Pipeline Integration

Phase 1과 동일 — bkit 9-phase Development Pipeline은 쓰지 않는다. llm-wiki + PDCA(Plan→Design→Do→Check→Report)만 사용(`CLAUDE.md`「bkit PDCA와 llm-wiki의 관계」).

---

## 9. Next Steps

1. [ ] `/pdca design mobile-app` — 아키텍처 설계 확정(폴더 구조·화면 목록·API 연동 지점 구체화)
2. [ ] Design 승인 후 `mobile/` 스캐폴딩(APP-1) 착수
3. [ ] APP-2→APP-3→APP-4 순서로 구현(각 단계 실기기 검증 포함)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-08-23 | Initial draft — Phase 1 Plan §2.2/§9에서 예고된 Phase 2, 이번 세션 체크포인트에서 스토어 배포 범위/네비게이션 방식 확정 | Project Owner |
