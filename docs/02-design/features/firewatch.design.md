# firewatch Design Document

> **Summary**: Phase 1(backend + web) — Kotlin/Spring 스케줄러가 매일 08:00 KST에 Gemini/금융 API를 호출해 브리핑을 생성·저장하고, 전 과정을 AOP 감사로그로 자동 기록하며, React/AntD 웹 대시보드가 이를 시각화한다.
>
> **Project**: FireWatch
> **Version**: 0.1.0 (unreleased)
> **Author**: Project Owner
> **Date**: 2026-08-19
> **Status**: Draft
> **Planning Doc**: [firewatch.plan.md](../../01-plan/features/firewatch.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 (Schema) | `docs/01-plan/schema.md` | N/A — 이 Design 문서 §3에서 직접 정의 |
| Phase 2 (Convention) | `docs/01-plan/conventions.md` | N/A — 이 Design 문서 §10에서 직접 정의 |
| Phase 3 (Mockup) | — | N/A — Pencil MCP 미사용, `llm-wiki/design.md`가 디자인 토큰 정본 |
| Phase 4 (API Spec) | — | 이 Design 문서 §4 |

> 이 프로젝트는 bkit 9-phase Pipeline을 그대로 쓰지 않는다 — `CLAUDE.md`의 「bkit PDCA와 llm-wiki의 관계」 참고.

---

## Context Anchor

> Copied from Plan document.

| Key | Value |
|-----|-------|
| **WHY** | 매일 아침 지표를 직접 찾아보는 번거로움 + 무인 스케줄러의 실패를 아무도 추적할 수 없다는 문제 |
| **WHO** | 1인 사용자, 계정/로그인 없음(기기·서버 설정값으로 개인화) |
| **RISK** | 무료 등급 인프라(Gemini Free API, Oracle Cloud Always Free Tier, 비공식 금융 API)의 정책 변경·불안정성 |
| **SUCCESS** | 매일 08:00 KST 브리핑이 자동 생성되어 웹 대시보드에 반영되고, 성공/실패가 100% 감사로그로 추적됨 |
| **SCOPE** | **Phase 1**(이 Design): backend + web, FR-01·02·04·06·07 전체 + FR-03의 발송(백엔드)까지 + FR-05. **Phase 2**: mobile 앱(RN) |

---

## Design Anchor

> Pencil MCP는 이 환경에서 사용하지 않는다. 대신 `llm-wiki/design.md`가 디자인 토큰 정본이다 — 감사로그 상태 4색, AntD `darkAlgorithm`, Framer Motion 애니메이션 원칙. Web 구현 시 그 문서를 그대로 참조한다.

| Category | Tokens (근거: `llm-wiki/design.md`) |
|----------|--------------------------------------|
| **Colors** | SUCCESS `#10B981` · WARNING `#F59E0B` · FALLBACK `#6366F1` · FAILURE `#EF4444` (감사로그 전용, 브리핑 콘텐츠 색과 분리) |
| **UI Library** | Ant Design v5, `ConfigProvider` + `darkAlgorithm` |
| **Animation** | 수치 틱(Framer Motion), 스켈레톤 로딩, 카드 페이드인 — 3초 넘는 차트 드로잉·0.5초 넘는 페이지 전환 금지 |

---

## 1. Overview

### 1.1 Design Goals

- FR-07(감사로그)이 **모든 외부 호출·설정 변경에서 빠짐없이** 기록되도록 구조적으로 강제한다 — 개발자가 "깜빡하고 안 넣는" 경로를 없앤다.
- 명세서 5.1절의 4개 상태(SUCCESS/WARNING/FALLBACK/FAILURE)를 실제 코드 분기로 재현 가능하게 설계한다.
- 계정 없는 1인용 시스템이지만, 공개 배포되는 쓰기 API(설정 변경 등)를 무방비로 열어두지 않는다.
- 1인 개발 속도를 해치지 않는 선에서만 계층을 나눈다(Option C, Pragmatic Balance).

### 1.2 Design Principles

- **감사로그는 옵트인이 아니라 옵트아웃**: 서비스 계층 공개 메서드는 AOP 포인트컷으로 기본 대상이 되고, 제외하려면 명시적으로 표시한다(반대가 아니다).
- **저장·조회는 백엔드, 시각화만 프론트**: 지표 계산·FALLBACK 판단은 전부 백엔드에서 끝내고, 웹은 받은 데이터를 그리기만 한다.
- **없는 요구사항을 만들지 않는다**: 로그인·다중 사용자·구독 등은 설계하지 않는다([[../../01-plan/features/firewatch.plan]] §2.2).

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | 평평한 단일 모듈, 감사로그 수동 어노테이션 | domain/application/infrastructure 완전 분리 | FR 도메인별 3계층 + AOP 자동 감사로그 |
| **New Files (추정)** | ~25 | ~55 | ~35 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Low (감사로그 누락 위험) | High | High |
| **Effort** | Low | High | Medium |
| **Risk** | **High**(FR-07 핵심 기능 훼손 가능) | Medium(1인 개발엔 과설계, Phase 1 지연) | Low |
| **Recommendation** | — | — | **선택됨** |

**Selected**: Option C — **Rationale**: 이 프로젝트의 차별점은 기능 자체가 아니라 감사로그를 통한 신뢰성이다(Plan Executive Summary "Core Value"). AOP 포인트컷을 서비스 계층 공개 메서드에 일괄 적용하면 새 기능을 추가해도 감사로그가 "기본으로 켜져" 있어 Option A의 최대 리스크(누락)를 구조적으로 막으면서, Option B의 5계층 보일러플레이트 없이 1인 개발 속도를 유지한다.

### 2.1 Component Diagram (Phase 1)

```
┌───────────────────────────────────────────────────────────┐
│  Web (React 18 + Vite + AntD)  — Cloudflare Pages           │
│  Dashboard / Audit Log Viewer / Settings                    │
└───────────────────────────▲───────────────────────────────┘
                             │ REST (JSON), 쓰기는 X-API-Key
┌───────────────────────────┴───────────────────────────────┐
│  Backend (Kotlin + Spring Boot 3.2 + WebFlux)                │
│  — Oracle Cloud Always Free Tier                             │
│                                                               │
│  BriefingController / AuditLogController / SettingsController│
│           │                    │                    │        │
│  BriefingService      AuditLogService(조회)  SettingsService  │
│           │                    ▲                    │        │
│  ┌────────┴─────────┐          │           ┌────────┴──────┐│
│  │ SchedulerJob      │  AuditLogAspect(AOP, 모든 Service    ││
│  │ (@Scheduled 08:00)│  공개 메서드 가로채 자동 기록)         ││
│  └────────┬──────────┘          │                            │
│  GeminiClient(WebClient)  FinancialApiClient(WebClient)      │
│           │                    │                              │
│  PushService(Firebase Admin SDK, 발송만 — 수신은 Phase 2)     │
│                                                               │
│  BriefingRepository / AuditLogRepository / SettingsRepository│
│                        │ JPA                                  │
│                       DB(SQLite/H2 — 종류는 OpenQuestions)    │
└───────────────────────────┬───────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
  Gemini 3 Flash API   Yahoo Finance /      FCM (Firebase)
  (Search Grounding)   한국수출입은행 API    발송만(Phase 1)
```

### 2.2 Data Flow

**매일 08:00 KST 브리핑 생성(FR-01, FR-02, FR-03 발송부)**
```
SchedulerJob(@Scheduled) → AuditLogAspect(SCHEDULER 시작 기록)
  → GeminiClient.fetchBriefing() → 성공: 텍스트 파싱 → 실패/3초+지연: WARNING/FALLBACK 분기
  → FinancialApiClient.fetchRates() → 성공: 금/은/환율 저장 → 실패: FALLBACK(직전 성공값 재사용 또는 명세서 5.1절 기본값)
  → BriefingRepository.save(오늘자 브리핑 1건)
  → AuditLogAspect(GEMINI_API, FINANCIAL_API 결과 기록)
  → PushService.sendToRegisteredTokens() → AuditLogAspect(FCM_PUSH 발송 수·성공 수 기록)
  → SchedulerJob 종료 → AuditLogAspect(SCHEDULER 종료, 총 소요시간 기록)
```

**대시보드 조회(FR-04, FR-06)**
```
Web → GET /api/briefings/latest → BriefingController → BriefingService → BriefingRepository → 응답
```

**감사로그 조회(FR-07)**
```
Web → GET /api/audit-logs?eventType=&status=&from=&to= → AuditLogController → AuditLogRepository(페이지네이션) → 응답
```

**설정 변경(FR-05)**
```
Web → PUT /api/settings (X-API-Key 필요) → SettingsController → SettingsService.update()
  → AuditLogAspect(USER_SETTING 기록, client_ip 포함) → SettingsRepository.save()
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| SchedulerJob | GeminiClient, FinancialApiClient, BriefingRepository, PushService | 08:00 파이프라인 오케스트레이션 |
| AuditLogAspect | (모든 `*Service` 공개 메서드에 AOP로 결합) | 감사로그 자동 기록 — 명시적 의존이 아니라 횡단 관심사 |
| BriefingController | BriefingService | 대시보드 조회 API |
| SettingsController | SettingsService, API Key 검증 필터 | 설정 조회/변경 API |
| Web Dashboard | `GET /api/briefings/latest`, `GET /api/briefings` | FR-04 데이터 소스 |
| Web Audit Log Viewer | `GET /api/audit-logs` | FR-07 뷰어 |
| Web Settings | `GET/PUT /api/settings` | FR-05 화면 |

---

## 3. Data Model

### 3.1 Database Schema

```sql
-- 명세서 3.2절 스키마 그대로 (감사로그, 정본)
CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,     -- SCHEDULER, GEMINI_API, FINANCIAL_API, FCM_PUSH, USER_SETTING, ERROR
  action_name VARCHAR(100) NOT NULL,   -- MorningReportJob, FetchExchangeRate, SendFcmNotification 등
  status VARCHAR(20) NOT NULL,         -- SUCCESS, FAILURE, WARNING, FALLBACK
  execution_time_ms INT,
  request_payload TEXT,
  response_summary TEXT,
  client_ip VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 브리핑 이력 (FR-06) — 신규, 이 Design에서 정의
CREATE TABLE briefings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  briefing_date DATE NOT NULL UNIQUE,      -- 하루 1건
  market_summary TEXT NOT NULL,            -- 국내/미국 증시 요약 (FR-01, FR-02)
  recommended_stocks TEXT,                 -- 추천 종목 (JSON 문자열)
  gold_price DECIMAL(12,2),
  silver_price DECIMAL(12,2),
  usd_krw DECIMAL(10,2),
  jpy100_krw DECIMAL(10,2),
  cny_krw DECIMAL(10,2),
  data_source_status VARCHAR(20) NOT NULL, -- NORMAL, FALLBACK (금융 API 대체 여부 — Web에 그대로 노출)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 사용자 설정 (FR-05) — 계정이 없으므로 항상 단일 행(id=1)
CREATE TABLE user_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  push_time VARCHAR(5) NOT NULL DEFAULT '08:00',  -- HH:mm
  interest_keywords TEXT,                          -- JSON 배열, 예: ["반도체","AI","2차전지"]
  fcm_tokens TEXT,                                 -- JSON 배열 — Phase 1엔 테스트 토큰만, 실사용은 Phase 2(mobile)
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

> DB 엔진(SQLite/H2/PostgreSQL)은 아직 미정 — [[../../../llm-wiki/OpenQuestions]]. 위 스키마는 세 엔진 어디에도 이식 가능하게 표준 SQL 타입만 사용했다.

### 3.2 Entity Relationships

```
[briefings] — 독립 (외래키 없음, 날짜로만 구분)
[user_settings] — 독립, 단일 행
[audit_logs] — 독립, 다른 테이블 참조 없음(느슨한 결합 — 감사로그가 원본 데이터 삭제에 영향받지 않도록 의도적으로 FK 없음)
```

### 3.3 Kotlin Entity 매핑 (개요)

```kotlin
// domain 성격의 데이터 클래스 — JPA 어노테이션은 infrastructure 쪽 구현체에서 결합(9장 참고)
data class Briefing(
    val id: Long? = null,
    val briefingDate: LocalDate,
    val marketSummary: String,
    val recommendedStocks: List<String>,
    val goldPrice: BigDecimal?,
    val silverPrice: BigDecimal?,
    val usdKrw: BigDecimal?,
    val jpy100Krw: BigDecimal?,
    val cnyKrw: BigDecimal?,
    val dataSourceStatus: DataSourceStatus, // enum: NORMAL, FALLBACK
    val createdAt: Instant
)

enum class AuditEventType { SCHEDULER, GEMINI_API, FINANCIAL_API, FCM_PUSH, USER_SETTING, ERROR }
enum class AuditStatus { SUCCESS, WARNING, FALLBACK, FAILURE }
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/briefings/latest` | 최신 브리핑 1건 (대시보드 진입점) | None |
| GET | `/api/briefings?from=&to=` | 브리핑 이력 조회 (FR-06) | None |
| GET | `/api/audit-logs?eventType=&status=&from=&to=&page=` | 감사로그 조회, 페이지네이션 (FR-07) | None |
| GET | `/api/settings` | 현재 설정 조회 | None |
| PUT | `/api/settings` | 관심 키워드·수신 시간 변경 (FR-05) | **X-API-Key** |
| POST | `/api/scheduler/trigger` | 스케줄러 수동 실행(디버그·QA용) | **X-API-Key** |

> 읽기는 전부 공개(민감정보 없음 — 금융 뉴스·환율은 공개 정보). 쓰기(설정 변경, 수동 트리거)만 정적 API 키로 보호한다 — 7절 참고.

### 4.2 Detailed Specification

#### `GET /api/briefings/latest`

**Response (200 OK):**
```json
{
  "id": 42,
  "briefingDate": "2026-08-19",
  "marketSummary": "코스피는 반도체 강세에 힘입어...",
  "recommendedStocks": ["삼성전자", "SK하이닉스"],
  "goldPrice": 2412.50,
  "silverPrice": 28.90,
  "usdKrw": 1385.20,
  "jpy100Krw": 920.10,
  "cnyKrw": 190.55,
  "dataSourceStatus": "NORMAL",
  "createdAt": "2026-08-19T08:00:12Z"
}
```

**Error Responses:**
- `404 Not Found`: 오늘자 브리핑이 아직 생성되지 않음(스케줄러 미실행)

#### `GET /api/audit-logs`

**Query Params**: `eventType`(선택), `status`(선택), `from`/`to`(선택, ISO date), `page`(기본 0), `size`(기본 20)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 101,
      "eventType": "GEMINI_API",
      "actionName": "FetchMarketBriefing",
      "status": "SUCCESS",
      "executionTimeMs": 1820,
      "responseSummary": "200 OK",
      "createdAt": "2026-08-19T08:00:05Z"
    }
  ],
  "pagination": { "page": 0, "size": 20, "total": 134 }
}
```

#### `PUT /api/settings`

**Request Header**: `X-API-Key: {static key}`

**Request:**
```json
{
  "pushTime": "07:30",
  "interestKeywords": ["반도체", "AI", "2차전지"]
}
```

**Response (200 OK):** 변경된 설정 전체 반환

**Error Responses:**
- `400 Bad Request`: `pushTime` 형식 오류(HH:mm 아님) 또는 키워드 20개 초과 등
- `401 Unauthorized`: `X-API-Key` 누락·불일치 — 감사로그에 `USER_SETTING`/`FAILURE`로 기록, `client_ip` 포함

---

## 5. UI/UX Design

### 5.1 Screen Layout (공통 셸)

```
┌──────────────────────────────────────────────┐
│  Header: FireWatch 로고 · 다크모드 토글          │
├──────────────────────────────────────────────┤
│  Nav: 대시보드 | 감사로그 | 설정                │
├──────────────────────────────────────────────┤
│                                                │
│              페이지별 콘텐츠 영역                │
│                                                │
└──────────────────────────────────────────────┘
```

### 5.2 User Flow

```
대시보드(기본 진입) → (감사로그 탭) 오늘 스케줄러 성공 여부 확인
                    → (설정 탭) 관심 키워드·수신 시간 변경 → 저장
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `AppShell` | `web/src/components/` | Header+Nav+다크모드 토글 |
| `DashboardPage` | `web/src/features/dashboard/` | FR-04 지표 카드+차트 |
| `BriefingSummaryCard` | `web/src/features/dashboard/components/` | 증시 요약·추천 종목 텍스트 |
| `RateChart` | `web/src/features/dashboard/components/` | 금/은/환율 시계열(Recharts) |
| `AuditLogPage` | `web/src/features/audit-log/` | FR-07 뷰어 |
| `AuditStatusTag` | `web/src/features/audit-log/components/` | 상태별 색상 Tag(`llm-wiki/design.md` §1) |
| `SettingsPage` | `web/src/features/settings/` | FR-05 화면 |
| `KeywordInput` | `web/src/features/settings/components/` | 관심 키워드 추가/삭제 |

### 5.4 Page UI Checklist

#### Dashboard

- [ ] Card: 오늘의 증시 요약 텍스트 (`marketSummary`, 로딩 중 스켈레톤)
- [ ] Card: 추천 종목 리스트 (`recommendedStocks`, 태그 형태)
- [ ] Statistic×5: 금 시세, 은 시세, USD/KRW, JPY(100)/KRW, CNY/KRW — 전일 대비 상승/하락 화살표 + 수치 틱 애니메이션(Framer Motion)
- [ ] Chart: 환율·금은 시계열(Recharts), 기간 선택(7일/30일 토글)
- [ ] Badge: 데이터 소스 상태(`dataSourceStatus` — NORMAL은 표시 안 함, FALLBACK이면 Indigo 배지로 "대체 데이터" 표시)
- [ ] Empty state: 오늘자 브리핑 없음(404) — "아직 생성되지 않았습니다" 안내 + 마지막 성공 브리핑 날짜 표시

#### 감사로그(Audit Log)

- [ ] Table: id, event_type, action_name, status(색상 Tag), execution_time_ms, created_at 컬럼
- [ ] Filter: event_type 드롭다운(SCHEDULER/GEMINI_API/FINANCIAL_API/FCM_PUSH/USER_SETTING/ERROR, 전체 포함)
- [ ] Filter: status 드롭다운(SUCCESS/WARNING/FALLBACK/FAILURE, 전체 포함)
- [ ] Filter: 날짜 range picker
- [ ] Pagination: 20건 단위
- [ ] FAILURE 행은 시각적으로 즉시 식별(빨간 Tag, 행 강조)

#### 설정(Settings)

- [ ] Input: 관심 키워드 추가(텍스트 입력 + Enter, 최대 20개), 각 키워드 옆 삭제 버튼
- [ ] TimePicker: 푸시 수신 시간(HH:mm)
- [ ] Button: 저장 (누르면 `PUT /api/settings` 호출)
- [ ] Toast/Alert: 저장 성공/실패(401 시 "API 키 오류" 안내 — 8.5절 seed에 유효 키 포함)
- [ ] Info text: "모바일 앱은 Phase 2에서 제공됩니다" (FR-03 수신부가 아직 없음을 명시 — 사용자 혼란 방지)

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| 400 | Invalid input | 설정 값 형식 오류 | 클라이언트에서 재입력 유도 |
| 401 | Unauthorized | `X-API-Key` 누락/불일치 | 설정 화면에 안내, 감사로그에 FAILURE 기록 |
| 404 | Briefing not found | 오늘자 브리핑 미생성 | 대시보드 Empty State 표시 |
| 500 | Internal error | 백엔드 예외 | 감사로그 ERROR 이벤트 자동 기록, 사용자에게는 일반 오류 메시지만 노출(내부 스택트레이스 미노출) |
| 502(Gemini) | Upstream error | Gemini API 장애 | 스케줄러 내부에서 FALLBACK 처리 — API 응답이 아니라 브리핑 데이터의 `dataSourceStatus`로 사용자에게 전달 |

### 6.2 Error Response Format

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "API 키가 올바르지 않습니다.",
    "details": {}
  }
}
```

---

## 7. Security Considerations

- [x] **쓰기 API 최소 보호** — 계정 시스템은 없지만(Plan §2.2), `PUT /api/settings`·`POST /api/scheduler/trigger`는 정적 API 키(`X-API-Key` 헤더, 환경변수 `SETTINGS_API_KEY`)로 보호한다. **이것은 진짜 인증이 아니라 무작위 크롤러의 남용(설정 초기화, Gemini 무료 할당량 소진)을 막는 최소 방어선**이라는 점을 명시한다 — Web 프론트 번들에 키가 노출되므로 실제 비밀로 취급하지 않는다. 다중 사용자가 필요해지면 이 방식 전체를 재검토([[../../../llm-wiki/Decisions/0003-mvp-scope-and-user-model]] 재검토 트리거).
- [x] **입력 검증** — 설정 API의 `interestKeywords`(개수·길이 제한), `pushTime`(HH:mm 정규식) 서버 측 검증.
- [x] **시크릿 관리** — `GEMINI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `KOREA_EXIM_API_KEY`, `SETTINGS_API_KEY`는 전부 환경변수. 코드/커밋에 포함 금지(`.gitignore`에 `.env` 이미 반영).
- [x] **HTTPS** — Cloudflare Pages(웹)는 기본 HTTPS. 백엔드(Oracle Cloud)도 배포 시(BE-8) HTTPS 강제 — 리버스 프록시 또는 Spring Boot 내장 TLS.
- [ ] **감사로그 응답 본문 노출 범위** — `response_summary`에 외부 API 에러 메시지를 그대로 저장할 경우 시크릿이 섞여 들어갈 위험이 있는지 Do 단계에서 실제 에러 포맷 확인 필요(현재는 미검증 — Do 단계 체크리스트에 추가).

---

## 8. Test Plan

> 커버리지 수치보다 핵심 경로(감사로그 자동 기록, FALLBACK 분기, 스케줄러) 우선 — Plan §4.2.

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L1: API Tests | `/api/briefings/*`, `/api/audit-logs`, `/api/settings` | curl (수동) + JUnit5 `@WebFluxTest`/`MockMvc` | Do |
| Unit: 감사로그 AOP | `AuditLogAspect`가 서비스 메서드 성공/실패 모두 기록하는지 | JUnit5 + MockK | Do |
| Unit: FALLBACK 분기 | Gemini/금융 API 실패 시나리오 | JUnit5 + MockK (WebClient mock) | Do |
| L2: UI Action Tests | Dashboard/AuditLog/Settings 페이지 | Playwright (선택 — 설치돼 있으면) | Do |

### 8.2 L1: API Test Scenarios

| # | Endpoint | Method | Test Description | Expected Status | Expected Response |
|---|----------|--------|-------------------|:---:|---|
| 1 | `/api/briefings/latest` | GET | 오늘자 브리핑 존재 | 200 | `briefingDate`가 오늘 |
| 2 | `/api/briefings/latest` | GET | 오늘자 브리핑 없음 | 404 | `.error.code = "NOT_FOUND"` |
| 3 | `/api/audit-logs?status=FAILURE` | GET | 상태 필터링 | 200 | 모든 항목 `status="FAILURE"` |
| 4 | `/api/settings` | PUT | 유효한 키 + 유효한 값 | 200 | 변경값 반영 |
| 5 | `/api/settings` | PUT | 키 누락 | 401 | `.error.code = "UNAUTHORIZED"` |
| 6 | `/api/settings` | PUT | `pushTime` 형식 오류(`25:99`) | 400 | `.error.details.fieldErrors` 존재 |

### 8.3 Unit Test Scenarios — 감사로그 & FALLBACK

| # | 대상 | 시나리오 | 기대 결과 |
|---|------|----------|-----------|
| 1 | `AuditLogAspect` | 임의 Service 메서드 정상 실행 | `audit_logs`에 `SUCCESS` 1건, `execution_time_ms` > 0 |
| 2 | `AuditLogAspect` | Service 메서드가 예외 던짐 | `audit_logs`에 `FAILURE` 1건, `response_summary`에 예외 메시지 |
| 3 | `SchedulerJob` | Gemini 응답 3초 이상 지연(mock delay) | `audit_logs`에 `WARNING` |
| 4 | `SchedulerJob` | Gemini 완전 실패 | `dataSourceStatus = FALLBACK`, 금융 API 값만으로 브리핑 저장, `audit_logs`에 `FALLBACK` |

### 8.4 L2: UI Action Test Scenarios (Playwright, 선택)

| # | Page | Action | Expected Result |
|---|------|--------|------------------|
| 1 | Dashboard | 페이지 로드 | §5.4 체크리스트 요소 전부 표시, 목업 아닌 API 데이터 렌더 |
| 2 | Audit Log | status 필터를 FAILURE로 변경 | 목록이 FAILURE만 남고 개수 감소 |
| 3 | Settings | 키워드 추가 후 저장 | 성공 토스트 표시, 새로고침 후에도 값 유지 |
| 4 | Settings | API 키 없이 저장 시도(테스트 환경) | 401 에러 메시지 표시 |

### 8.5 Seed Data Requirements

| Entity | Minimum Count | Key Fields Required |
|--------|:-:|---|
| `briefings` | 3 (최근 3일) | `dataSourceStatus` 중 최소 1건은 `FALLBACK` (Empty/Fallback UI 검증용) |
| `audit_logs` | 10 | `status` 4종(SUCCESS/WARNING/FALLBACK/FAILURE) 각 최소 1건 |
| `user_settings` | 1 | 기본값(`push_time='08:00'`) |

---

## 9. Clean Architecture

### 9.1 Layer Structure — Backend (Kotlin/Spring)

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Controller** | REST 엔드포인트, 요청/응답 DTO 매핑, `X-API-Key` 검증 필터 | `backend/src/.../controller/` |
| **Service** | 비즈니스 로직(스케줄러 오케스트레이션, FALLBACK 판단) — **AuditLogAspect 대상** | `backend/src/.../service/` |
| **Repository** | JPA 리포지토리 | `backend/src/.../repository/` |
| **Client** | 외부 API 클라이언트(WebClient 기반) | `backend/src/.../client/` |
| **Aspect(횡단)** | `AuditLogAspect` — Service 계층 공개 메서드에 포인트컷 | `backend/src/.../audit/` |

### 9.2 Layer Structure — Web (React)

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Pages** | 라우트 단위 화면 | `web/src/features/{dashboard,audit-log,settings}/` |
| **Components** | 페이지 내 재사용 UI | `web/src/features/*/components/` |
| **API Client** | 백엔드 REST 호출(단일 client, Plan §7.2 결정) | `web/src/lib/api.ts` |
| **Shared** | 디자인 토큰·공용 훅 | `web/src/lib/` |

### 9.3 Dependency Rules

```
Backend:  Controller ──▶ Service ──▶ Repository/Client
                              ▲
                    AuditLogAspect (횡단 — Service를 감싸되 의존관계에는 나타나지 않음)

Web:      Pages ──▶ Components
            │
            └──▶ lib/api.ts ──▶ Backend REST
```

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `SchedulerJob` | Service(Backend) | `backend/.../service/SchedulerJob.kt` |
| `BriefingService` | Service(Backend) | `backend/.../service/BriefingService.kt` |
| `AuditLogAspect` | Aspect(Backend) | `backend/.../audit/AuditLogAspect.kt` |
| `GeminiClient`, `FinancialApiClient` | Client(Backend) | `backend/.../client/` |
| `DashboardPage` | Pages(Web) | `web/src/features/dashboard/DashboardPage.tsx` |
| `AuditLogPage` | Pages(Web) | `web/src/features/audit-log/AuditLogPage.tsx` |
| `SettingsPage` | Pages(Web) | `web/src/features/settings/SettingsPage.tsx` |
| `api.ts` | API Client(Web) | `web/src/lib/api.ts` |

---

## 10. Coding Convention Reference

### 10.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| Kotlin 클래스 | PascalCase | `BriefingService`, `AuditLogAspect` |
| Kotlin 함수 | camelCase | `fetchLatestBriefing()` |
| Kotlin 상수 | UPPER_SNAKE_CASE | `MAX_KEYWORD_COUNT` |
| React 컴포넌트 | PascalCase | `DashboardPage`, `AuditStatusTag` |
| React 함수/훅 | camelCase | `useLatestBriefing()` |
| 파일(React 컴포넌트) | PascalCase.tsx | `DashboardPage.tsx` |
| 파일(유틸) | camelCase.ts | `formatCurrency.ts` |
| 폴더 | kebab-case | `audit-log/` |

### 10.2 Import Order (Web)

```typescript
// 1. External libraries
import { useState } from 'react'
// 2. Internal absolute imports
import { AuditStatusTag } from '@/features/audit-log/components/AuditStatusTag'
// 3. Relative imports
import { useLatestBriefing } from './hooks'
// 4. Type imports
import type { Briefing } from '@/types'
// 5. Styles
import './DashboardPage.css'
```

### 10.3 Environment Variables

| Prefix/Name | Purpose | Scope |
|--------|---------|-------|
| `GEMINI_API_KEY` | Gemini API 인증 | Backend |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | FCM 발송 인증 | Backend |
| `KOREA_EXIM_API_KEY` | 환율 API 인증 | Backend |
| `SETTINGS_API_KEY` | 쓰기 API 보호(§7) | Backend + Web(빌드 타임) |
| `DATABASE_URL` | DB 접속 | Backend |
| `VITE_API_BASE_URL` | 백엔드 API 엔드포인트 | Web(Client) |
| `VITE_SETTINGS_API_KEY` | 설정 저장 시 `X-API-Key`로 전송(§7 — 진짜 비밀 아님) | Web(Client) |

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| 상태 관리(Web) | React Context + 로컬 상태만(Plan §7.2 — 전역 상태 라이브러리 없음) |
| 에러 처리(Backend) | 컨트롤러에서 `@ExceptionHandler`로 6.2절 포맷 통일, 내부 예외 메시지는 감사로그에만 남기고 응답엔 미노출 |
| 날짜/시간 | 전부 KST 기준, 백엔드는 `Instant`+타임존 변환, DB엔 UTC 저장 |

---

## 11. Implementation Guide

### 11.1 File Structure

```
backend/
├── src/main/kotlin/.../
│   ├── controller/  (BriefingController, AuditLogController, SettingsController)
│   ├── service/     (SchedulerJob, BriefingService, AuditLogService, SettingsService)
│   ├── client/       (GeminiClient, FinancialApiClient, PushService)
│   ├── audit/         (AuditLogAspect)
│   ├── repository/   (BriefingRepository, AuditLogRepository, SettingsRepository — JPA)
│   └── entity/        (Briefing, AuditLog, UserSettings)
└── src/test/kotlin/.../

web/
├── src/
│   ├── features/
│   │   ├── dashboard/    (DashboardPage + components + hooks)
│   │   ├── audit-log/     (AuditLogPage + components + hooks)
│   │   └── settings/       (SettingsPage + components + hooks)
│   ├── components/  (AppShell, 공용 컴포넌트)
│   └── lib/            (api.ts, theme.ts)
```

### 11.2 Implementation Order

1. [ ] Backend 스캐폴딩 + `user_settings`/`briefings`/`audit_logs` 스키마 (BE-1)
2. [ ] `AuditLogAspect` 인프라 — 다른 모든 기능의 전제조건 (BE-2)
3. [ ] 스케줄러 + Gemini 연동 (BE-3)
4. [ ] 금융 API + FALLBACK (BE-4)
5. [ ] FCM 발송(테스트 토큰) (BE-5)
6. [ ] 브리핑 이력 API + 설정 API(+`X-API-Key` 필터) (BE-6, BE-7)
7. [ ] Web 스캐폴딩 + Dashboard (WEB-1, WEB-2)
8. [ ] Audit Log Viewer (WEB-3)
9. [ ] Settings 화면 (WEB-4)
10. [ ] 배포 — Oracle Cloud(BE-8), Cloudflare Pages(WEB-5)

### 11.3 Session Guide

> `/pdca do firewatch --scope module-N`으로 세션별 분할 구현 가능. 모듈 번호는 `llm-wiki/Next-Tasks.md`의 BE-/WEB- 과제 번호와 1:1 대응한다.

#### Module Map

| Module | Scope Key | Description | 대응 Next-Task | Estimated Turns |
|--------|-----------|-------------|-----------------|:---:|
| 백엔드 스캐폴딩+감사로그 인프라 | `module-1` | Kotlin/Spring 프로젝트 생성, 3개 테이블 스키마, `AuditLogAspect` | BE-1, BE-2 | 40-50 |
| 스케줄러+Gemini 연동 | `module-2` | `@Scheduled` + `GeminiClient` + WARNING/FALLBACK 분기 | BE-3 | 35-45 |
| 금융 API+FALLBACK | `module-3` | `FinancialApiClient`(Yahoo/수출입은행), FALLBACK 데이터 소스 | BE-4 | 25-35 |
| FCM 발송 | `module-4` | `PushService`, 무효 토큰 정제 | BE-5 | 20-30 |
| 이력·설정 API | `module-5` | `BriefingController`, `SettingsController`+`X-API-Key` 필터 | BE-6, BE-7 | 25-35 |
| 백엔드 배포 | `module-6` | Oracle Cloud Always Free Tier 배포, cron 동작 확인 | BE-8 | 20-30 |
| Web 스캐폴딩+Dashboard | `module-7` | Vite+AntD 셸, `DashboardPage` | WEB-1, WEB-2 | 35-45 |
| Audit Log Viewer | `module-8` | `AuditLogPage`, 필터·페이지네이션 | WEB-3 | 20-30 |
| Settings 화면 | `module-9` | `SettingsPage`, `KeywordInput` | WEB-4 | 15-25 |
| Web 배포 | `module-10` | Cloudflare Pages 배포 | WEB-5 | 10-15 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:---:|
| Session 1 | Plan + Design | 전체(완료) | — |
| Session 2 | Do | `--scope module-1,module-2` (백엔드 뼈대+감사로그+스케줄러) | 40-50 |
| Session 3 | Do | `--scope module-3,module-4` (금융 API+FALLBACK, FCM 발송) | 30-40 |
| Session 4 | Do | `--scope module-5` (이력·설정 API) | 25-35 |
| Session 5 | Do | `--scope module-7,module-8,module-9` (Web 3화면) | 40-50 |
| Session 6 | Do | `--scope module-6,module-10` (배포 2건) | 20-30 |
| Session 7 | Check + Report | 전체 | 30-40 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-08-19 | Initial draft — Option C(Pragmatic Balance) 선택, Phase 1(backend+web) 범위 | Project Owner |
