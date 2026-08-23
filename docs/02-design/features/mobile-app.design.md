# mobile-app Design Document

> **Project**: FireWatch
> **Version**: 0.1.0 (unreleased)
> **Author**: Project Owner
> **Date**: 2026-08-23
> **Status**: Draft
> **Plan Reference**: `docs/01-plan/features/mobile-app.plan.md`

### Pipeline References

이 프로젝트는 bkit 9-phase Development Pipeline 대신 llm-wiki + PDCA(Plan→Design→Do→Check→Report)만 사용한다(`CLAUDE.md`「bkit PDCA와 llm-wiki의 관계」). BaaS/Next.js 전제 섹션은 해당 시 N/A로 표시한다.

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 데스크톱에서만 브리핑을 봐야 하는 불편함 + FR-03 수신 측(모바일)이 Phase 1에서 비어있던 문제 |
| **WHO** | 기존과 동일한 1인 사용자, 계정/로그인 없음([[../../llm-wiki/Decisions/0003-mvp-scope-and-user-model]] 유지) |
| **RISK** | Expo/RN 생태계의 빠른 버전 변화, Windows 개발환경에서 iOS 시뮬레이터를 못 쓰는 실기기 검증 제약 |
| **SUCCESS** | Expo Go(또는 개발 빌드)로 실기기에서 푸시 수신 → 바텀시트 브리핑 확인, 설정 화면 왕복 확인 |
| **SCOPE** | Phase 2 전체 — APP-1(스캐폴딩)·APP-2(푸시 수신)·APP-3(브리핑 UI)·APP-4(설정 화면). 스토어 실제 제출은 Out of Scope |

---

## Design Anchor

N/A — Pencil MCP 미사용. 색상·타이포는 웹의 `web/src/lib/theme.ts`(스타벅스 그린 계열)를 모바일에도 그대로 이식한다(브랜드 일관성, [[../../llm-wiki/design]] §1).

---

## 1. Overview

### 1.1 Design Goals

- 백엔드 API를 **한 글자도 바꾸지 않고** 소비하되, Plan §6에서 발견한 FCM 토큰 등록 API 누락 하나만 최소한으로 확장한다.
- 웹의 `features/{name}/{Name}Page.tsx` 패턴을 모바일에 그대로 이식해, 두 클라이언트를 오갈 때 컨텍스트 전환 비용을 낮춘다.
- 오프라인에서도 마지막 브리핑을 볼 수 있게 해, "알림이 와도 인터넷이 안 되면 아무것도 못 본다"는 상황을 없앤다.

### 1.2 Design Principles

- **재사용 우선**: 웹의 `lib/api.ts` fetch 패턴, DTO 타입, 애니메이션 원칙([[../../llm-wiki/design]] §3 — 3D 회전/줌 금지, 0.5초 이내)을 그대로 따른다.
- **오프라인 폴백**: 네트워크 실패 시 에러 화면 대신 AsyncStorage 캐시를 먼저 보여준다.
- **최소 백엔드 변경**: Plan §6에서 확정된 `fcmToken` 필드 하나만 추가하고, 새 엔드포인트는 만들지 않는다(기존 `PUT /api/settings` 확장).

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| | Option A — Minimal | Option B — Clean Architecture | **Option C — Pragmatic (선택)** |
|---|---|---|---|
| 설명 | `app/` 라우트 파일에 로직 전부 인라인 | features/domain/infra 계층 완전 분리 + DI 컨테이너 | 웹과 동일한 `features/{name}/` 패턴, 계층은 얕게(컴포넌트+훅+lib) |
| 복잡도 | 낮음 | 높음 | 중간 |
| 유지보수성 | 낮음(화면 늘면 파일 비대화) | 높음(과설계 위험) | 화면 4개 규모에 적당 |
| 리스크 | 화면 늘어나면 리팩터 필요 | 1인 프로젝트에 오버엔지니어링 | 웹 컨벤션과 일치, 학습비용 최소 |

Plan §7.3에서 이미 "웹의 features/ 패턴을 모바일에 맞게 이식"으로 방향이 잡혔고, 이번 세션 체크포인트에서 사용자가 **Option C(웹과 동일한 features/ 패턴)**를 명시적으로 선택했다.

### 2.1 Component Diagram (Phase 2)

```
mobile/
├── app/                        (Expo Router — 파일 기반 라우트)
│   ├── _layout.tsx             (루트 레이아웃 — 알림 리스너 등록, 폰트/테마 초기화)
│   ├── index.tsx                (→ features/briefing/BriefingScreen)
│   └── settings.tsx             (→ features/settings/SettingsScreen)
├── src/
│   ├── features/
│   │   ├── briefing/
│   │   │   ├── BriefingScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── BriefingSheet.tsx      (바텀시트)
│   │   │   │   └── RecommendedStockChip.tsx
│   │   │   └── hooks/useLatestBriefing.ts
│   │   ├── settings/
│   │   │   ├── SettingsScreen.tsx
│   │   │   └── hooks/useSettings.ts
│   │   └── notifications/
│   │       └── hooks/useNotificationRegistration.ts  (권한 요청+토큰 등록+수신 리스너)
│   └── lib/
│       ├── api.ts               (fetch 래퍼 — web/src/lib/api.ts와 동일 스타일)
│       ├── theme.ts              (web/src/lib/theme.ts 색상 토큰 이식)
│       └── offlineCache.ts       (AsyncStorage 읽기/쓰기)
├── app.json / app.config.ts
└── package.json
```

### 2.2 Data Flow

```
[백엔드 스케줄러] --FCM 발송(기존, 무변경)--> [expo-notifications 리스너]
                                                      │
                                          알림 터치 시 app/index.tsx 진입
                                                      ▼
                                    useLatestBriefing → GET /api/briefings/latest
                                                      │
                                    성공 시 AsyncStorage에 캐시 저장 후 표시
                                    실패 시 AsyncStorage 캐시를 먼저 표시("오프라인" 배지)
                                                      ▼
                                          BriefingSheet(바텀시트)로 상세 표시

[앱 시작 시] useNotificationRegistration → expo-notifications 권한 요청
                                          → 토큰 발급 → PUT /api/settings { fcmToken } (신규 필드)
```

### 2.3 Dependencies

| Package | Purpose |
|---------|---------|
| `expo`, `expo-router` | 스캐폴딩 + 파일 기반 라우팅 |
| `nativewind`, `tailwindcss` | 스타일링 |
| `expo-notifications` | FCM 토큰 발급/권한/수신 리스너 |
| `@react-native-async-storage/async-storage` | 오프라인 캐시 |
| `@gorhom/bottom-sheet` (또는 `react-native-modal` 대체 검토) | 바텀시트 — Do 단계에서 실제 설치 가능 여부 확인 후 확정 |

---

## 3. Data Model

### 3.1 Database Schema

새 테이블·컬럼 신설 없음. 기존 `user_settings.fcm_tokens`(콤마 구분 문자열, `UserSettings.kt`의 `fcmTokensRaw`)를 그대로 재사용한다. 변경은 이 컬럼에 값을 **쓸 수 있는 API 경로**를 추가하는 것뿐(3.2 참조).

### 3.2 Backend DTO 변경 (최소)

```kotlin
// backend/src/main/kotlin/com/firewatch/backend/web/dto/SettingsDtos.kt
data class SettingsUpdateRequest(
    val pushTime: String? = null,
    val interestKeywords: List<String>? = null,
    val watchedStocks: List<String>? = null,
    val fcmToken: String? = null,   // 추가 — 있으면 기존 토큰 목록에 병합(중복 제거)
)
```

`SettingsService.update()`에서 `fcmToken`이 non-null이면 기존 `fcmTokensRaw` 파싱 결과에 추가 후 콤마join으로 재저장(이미 있는 `PushService`의 파싱 로직과 동일한 방식 재사용 — 신규 파싱 로직 작성 안 함).

### 3.3 로컬(모바일) 캐시 모델

```ts
// AsyncStorage key: "firewatch:lastBriefing"
type CachedBriefing = {
  briefingDate: string
  marketSummary: string
  recommendedStocks: string[]
  cachedAt: string   // ISO — "마지막 갱신: N분 전" 표시용
}
```

`BriefingResponse`(백엔드 DTO, `BriefingDtos.kt`)의 부분집합만 캐시한다 — 오프라인 표시에 필요한 필드만.

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | 변경 여부 | Description |
|--------|------|:---:|--------------|
| GET | `/api/briefings/latest` | 무변경(재사용) | 오늘의 브리핑 조회 |
| PUT | `/api/settings` | **확장**(`fcmToken` 필드 추가) | 관심 키워드/수신 시간 저장 + 이번에 FCM 토큰 등록 겸용 |
| GET | `/api/settings` | 무변경(재사용) | 현재 설정 조회 |

새 엔드포인트는 만들지 않는다 — Plan §6에서 정한 "기존 것 확장" 원칙.

### 4.2 Detailed Specification

#### `PUT /api/settings` (확장분만 기술 — 나머지는 웹과 동일, `firewatch.design.md` §4.2 참조)

```
Request Body (추가 필드):
{
  "fcmToken": "eXaMpLeDeviceToken..."   // optional, 앱 시작 시마다 재등록
}

Response: 기존과 동일(변경 없음)
```

- 인증: 웹과 동일하게 `EXPO_PUBLIC_SETTINGS_API_KEY`를 헤더로 전달(ADR 0004 — 공개 저장소이므로 진짜 비밀은 아님, 정본 참조).
- 실패 시(401 등): 웹과 동일한 에러 포맷(§6 참조), 토큰 등록 실패는 조용히 재시도(다음 앱 실행 시)하고 사용자에게 에러 UI를 띄우지 않는다 — 토큰 등록은 백그라운드 관심사이므로.

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
┌─────────────────────────┐     ┌─────────────────────────┐
│  🔥 FireWatch      ⚙️   │     │  ← 뒤로          설정    │
├─────────────────────────┤     ├─────────────────────────┤
│ 오늘의 증시 요약          │     │ 관심 키워드              │
│ (날짜)                   │     │ [칩] [칩] [+추가]        │
│                          │     │                          │
│ 추천종목                  │     │ 브리핑 수신 시간          │
│ [칩][칩][칩]              │     │ [TimePicker]             │
│                          │     │                          │
│ (오프라인 시) 🔌 마지막    │     │        [저장]           │
│  갱신 N분 전               │     │                          │
└─────────────────────────┘     └─────────────────────────┘
     app/index.tsx                    app/settings.tsx

알림 터치 시 index.tsx 위에 바텀시트가 아래에서 위로 슬라이드(0.5초 이내):
┌─────────────────────────┐
│  ▬▬▬ (드래그 핸들)        │
│  오늘의 증시 요약          │
│  (전체 텍스트)             │
│  추천종목 상세             │
└─────────────────────────┘
```

### 5.2 User Flow

1. 앱 최초 실행 → 알림 권한 요청 → 허용 시 토큰을 `PUT /api/settings`로 등록
2. (스케줄러가 매일 아침 발송) 알림 도착 → 터치 → 앱 열림 → `BriefingSheet` 바텀시트 자동 오픈
3. 앱을 알림 없이 직접 열면 → `app/index.tsx`가 `GET /api/briefings/latest` 조회 → 실패 시 AsyncStorage 캐시 표시
4. 설정 아이콘 → `app/settings.tsx` → 키워드/시간 변경 → 저장 → 웹에서도 동일하게 반영 확인 가능

### 5.3 Component List

| Component | Path | Description |
|-----------|------|--------------|
| `BriefingScreen` | `features/briefing/BriefingScreen.tsx` | 홈 화면 컨테이너 |
| `BriefingSheet` | `features/briefing/components/BriefingSheet.tsx` | 바텀시트 상세 |
| `RecommendedStockChip` | `features/briefing/components/RecommendedStockChip.tsx` | 추천종목 칩 |
| `SettingsScreen` | `features/settings/SettingsScreen.tsx` | 설정 화면 컨테이너 |
| `useLatestBriefing` | `features/briefing/hooks/useLatestBriefing.ts` | 조회+캐시 폴백 훅 |
| `useSettings` | `features/settings/hooks/useSettings.ts` | 설정 조회/저장 훅 |
| `useNotificationRegistration` | `features/notifications/hooks/useNotificationRegistration.ts` | 권한+토큰 등록+리스너 |

### 5.4 Page UI Checklist

#### 홈 화면(`app/index.tsx`)
- [ ] 카드: 오늘의 증시 요약(날짜 포함)
- [ ] 추천종목 칩 목록
- [ ] Empty state: "오늘자 브리핑이 아직 생성되지 않았습니다"
- [ ] 오프라인 배지: "🔌 마지막 갱신 N분 전" (캐시 표시 중임을 안내)
- [ ] 설정 아이콘(우상단) → `/settings` 이동

#### 바텀시트(`BriefingSheet`)
- [ ] 드래그 핸들
- [ ] 브리핑 요약 전체 텍스트
- [ ] 추천종목 상세
- [ ] 아래로 스와이프 또는 배경 탭으로 닫기

#### 설정 화면(`app/settings.tsx`)
- [ ] 관심 키워드 입력(추가/삭제 칩)
- [ ] 수신 시간 TimePicker
- [ ] 저장 버튼 + 저장 성공/실패 토스트

---

## 6. Error Handling

### 6.1 Error Code Definition

웹과 동일한 백엔드 에러 포맷을 그대로 재사용(`firewatch.design.md` §6.1 참조, 신규 에러 코드 없음).

### 6.2 Error Response Format

```json
{ "error": { "code": "UNAUTHORIZED", "message": "..." } }
```

### 6.3 모바일 특화 처리

| 상황 | 처리 |
|------|------|
| 네트워크 실패(오프라인) | AsyncStorage 캐시로 폴백, 에러 토스트 대신 "🔌 마지막 갱신 N분 전" 배지만 표시 |
| 캐시도 없음(최초 실행 + 오프라인) | Empty state: "인터넷 연결 후 다시 열어주세요" |
| FCM 토큰 등록 실패 | 조용히 무시, 다음 앱 실행 시 재시도(사용자에게 에러 UI 노출 안 함 — 백그라운드 관심사) |
| 알림 권한 거부 | 홈 화면에 배너: "알림을 켜면 매일 아침 브리핑을 받아볼 수 있어요" + 설정 앱으로 이동 버튼 |

---

## 7. Security Considerations

- `EXPO_PUBLIC_SETTINGS_API_KEY`는 웹과 동일하게 클라이언트에 노출되는 값 — 실제 비밀이 아님을 전제([[../../llm-wiki/Decisions/0004-...]] 정본 참조, 웹과 동일 원칙).
- FCM 디바이스 토큰 자체는 민감정보가 아니며, 무효화된 토큰은 백엔드가 이미 자동 정리(`MessagingErrorCode.UNREGISTERED` 처리, BE-5 완료분).
- Firebase 설정 파일(`google-services.json`/`GoogleService-Info.plist`)은 클라이언트 배포용이라 API 키 자체는 공개돼도 무방하나, 저장소에 커밋할지는 Do 단계에서 `.gitignore` 여부를 실제 파일 내용 확인 후 판단한다.

---

## 8. Test Plan

### 8.1 Test Scope

1인 프로젝트 특성상(Phase 1과 동일 원칙) 자동화 E2E보다 실기기 수동 검증을 우선한다. RN 환경이라 Playwright(L2/L3)는 적용 불가.

### 8.2 L1: API Test Scenarios

기존 `GET /api/briefings/latest`, `GET/PUT /api/settings`는 웹에서 이미 검증됨 — 재검증 불필요. 신규 검증 대상은 `fcmToken` 필드 왕복뿐:

```bash
curl -X PUT $API_BASE/api/settings \
  -H "X-Settings-Api-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"fcmToken": "test-token-123"}'
# 기대: 200, 이후 GET /api/settings 또는 DB 조회로 fcm_tokens에 병합 확인
```

### 8.3 실기기 수동 검증 시나리오(핵심)

- [ ] 앱 최초 실행 → 알림 권한 허용 → 토큰이 백엔드에 저장됨(DB 또는 감사로그로 확인)
- [ ] `/api/scheduler/trigger` 수동 트리거 → 실기기에 푸시 알림 도착
- [ ] 알림 터치 → 바텀시트가 0.5초 이내로 열림
- [ ] 비행기 모드 → 앱 재실행 → 마지막 캐시된 브리핑 표시
- [ ] 설정 화면에서 키워드 변경 → 웹 설정 화면 새로고침 시 동일하게 반영

### 8.4 Seed Data Requirements

없음 — 기존 브리핑 데이터를 그대로 사용.

---

## 9. Clean Architecture

### 9.1 Layer Structure — Mobile (Expo/React Native)

```
Presentation   : app/*.tsx, src/features/*/*.tsx, src/features/*/components/
Application    : src/features/*/hooks/*.ts
Domain(공유 타입): src/lib/api.ts 내 타입 정의(웹과 동일 관례 — 별도 domain/ 계층 안 둠)
Infrastructure : src/lib/api.ts(fetch), src/lib/offlineCache.ts(AsyncStorage)
```

### 9.2 Dependency Rules

- `app/*.tsx`는 라우팅 진입점 역할만 하고 실제 로직은 `src/features/*`에 위임(웹의 `App.tsx` → `features/*` 패턴과 동일).
- `hooks/`는 `lib/api.ts`·`lib/offlineCache.ts`에만 의존, 화면 컴포넌트를 import하지 않는다.
- 웹과 마찬가지로 별도 DI 컨테이너나 Repository 추상화는 두지 않는다(Option C — 과설계 회피).

### 9.3 This Feature's Layer Assignment

| 코드 | Layer |
|------|-------|
| `app/index.tsx`, `app/settings.tsx`, `app/_layout.tsx` | Presentation(라우트 진입점) |
| `features/briefing/*.tsx`, `features/settings/*.tsx` | Presentation |
| `features/*/hooks/*.ts` | Application |
| `lib/api.ts`, `lib/offlineCache.ts` | Infrastructure |
| `backend` `SettingsDtos.kt`/`SettingsService.kt` 확장분 | 기존 계층 구조 그대로(웹과 동일 백엔드) |

---

## 10. Coding Convention Reference

### 10.1 Naming Conventions

웹과 동일(`firewatch.design.md` §10.1) — PascalCase 컴포넌트, camelCase 함수/훅(`use` 접두사), `{Name}Screen.tsx` 파일명(웹의 `{Name}Page.tsx`에 대응).

### 10.2 Import Order

웹과 동일(`firewatch.design.md` §10.2).

### 10.3 Environment Variables

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | 웹의 `VITE_API_BASE_URL`과 동일 값 |
| `EXPO_PUBLIC_SETTINGS_API_KEY` | 웹의 `VITE_SETTINGS_API_KEY`와 동일 값 |

### 10.4 This Feature's Conventions

- 화면 컴포넌트는 `{Name}Screen.tsx`(웹의 `{Name}Page.tsx`에 대응), 나머지는 웹과 동일.
- 바텀시트/칩 등 재사용 UI는 `features/briefing/components/`에 두고, 다른 feature에서 필요해지면 그때 `src/components/`로 승격(웹과 동일 원칙 — 미리 공용화하지 않음).

---

## 11. Implementation Guide

### 11.1 File Structure

```
mobile/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   └── settings.tsx
├── src/
│   ├── features/
│   │   ├── briefing/
│   │   │   ├── BriefingScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── BriefingSheet.tsx
│   │   │   │   └── RecommendedStockChip.tsx
│   │   │   └── hooks/
│   │   │       └── useLatestBriefing.ts
│   │   ├── settings/
│   │   │   ├── SettingsScreen.tsx
│   │   │   └── hooks/
│   │   │       └── useSettings.ts
│   │   └── notifications/
│   │       └── hooks/
│   │           └── useNotificationRegistration.ts
│   └── lib/
│       ├── api.ts
│       ├── theme.ts
│       └── offlineCache.ts
├── app.json
├── tailwind.config.js
└── package.json

backend/  (확장분만)
└── src/main/kotlin/com/firewatch/backend/
    ├── web/dto/SettingsDtos.kt      (fcmToken 필드 추가)
    └── service/SettingsService.kt   (fcmToken 병합 로직 추가)
```

### 11.2 Implementation Order

1. **APP-1**: `npx create-expo-app`으로 `mobile/` 생성, NativeWind+Expo Router 세팅, 빈 화면이 Expo Go에서 뜨는지 확인
2. **(APP-2 사전조건)** 백엔드 `SettingsDtos.kt`/`SettingsService.kt`에 `fcmToken` 필드 추가 — 소규모 변경이므로 APP-2 세션 안에서 함께 진행
3. **APP-2**: `expo-notifications` 설치, 권한 요청 훅, 토큰 등록(위 백엔드 변경 호출), 수신 리스너
4. **APP-3**: `useLatestBriefing` 훅 + `BriefingScreen` + `BriefingSheet` + `offlineCache.ts`
5. **APP-4**: `SettingsScreen` + `useSettings` 훅

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Est. Turns |
|--------|-----------|--------------|:---:|
| 스캐폴딩 | module-1 | APP-1 — Expo+NativeWind+Router 생성, 빈 앱 Expo Go 실행 확인 | 15-20 |
| 푸시 수신 | module-2 | APP-2 — 백엔드 fcmToken 필드 추가 + 토큰 등록 + 수신 핸들러 | 20-25 |
| 브리핑 UI | module-3 | APP-3 — 홈 화면 + 바텀시트 + 오프라인 캐시 | 25-30 |
| 설정 화면 | module-4 | APP-4 — 키워드/시간 설정 | 15-20 |

#### Recommended Session Plan

- Session 1: module-1(스캐폴딩) — 독립적으로 완결 가능
- Session 2: module-2(푸시 수신) — module-1 완료 후 착수, 백엔드 소폭 변경 포함
- Session 3: module-3(브리핑 UI) — module-2의 리스너/데이터 흐름에 의존
- Session 4: module-4(설정 화면) — 나머지와 독립적, 아무 때나 가능

각 세션은 `/pdca do mobile-app --scope module-N` 형태로 시작한다.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-08-23 | Initial draft — Option C(웹과 동일한 features/ 패턴) 선택, Plan §6 발견사항(fcmToken 필드 추가 필요) 반영 | Project Owner |
