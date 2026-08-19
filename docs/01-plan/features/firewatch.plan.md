# firewatch Planning Document

> **Summary**: 매일 아침 8시(KST) 증시·원자재·환율 브리핑을 Gemini API로 자동 생성해 웹 대시보드에 표시하고, 전 과정을 감사로그로 추적하는 무료 등급 개인용 시스템.
>
> **Project**: FireWatch
> **Version**: 0.1.0 (unreleased)
> **Author**: Project Owner
> **Date**: 2026-08-19
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 바쁜 개인 투자자가 매일 아침 개장 전 글로벌 증시·뉴스·금/은 시세·환율을 직접 찾아봐야 하는 번거로움. 동시에, 이를 자동화하는 24/7 무인 스케줄러는 실행 성공 여부·API 호출 이력·푸시 발송률을 추적할 수단이 없으면 조용히 죽어도 아무도 모른다. |
| **Solution** | Kotlin/Spring Boot 스케줄러가 매일 08:00 Gemini API(Search Grounding)와 금융 API를 호출해 브리핑을 생성하고, React/AntD 웹 대시보드로 지표를 시각화하며, 전 과정(SCHEDULER/GEMINI_API/FCM_PUSH/USER_SETTING/ERROR)을 감사로그로 자동 기록한다. |
| **Function/UX Effect** | 사용자는 매일 아침 대시보드 하나만 열면 증시 요약·추천 종목·금/은/환율 추이를 확인할 수 있다. 스케줄러가 실패해도 감사로그 뷰어에서 즉시 원인(지연/장애/인증 실패)을 알 수 있다. |
| **Core Value** | "완전 무료 등급으로 운영되는, 스스로를 관측하는 자동화 시스템" — 기능 자체보다 **감사로그를 통한 무인 운영 신뢰성**이 이 프로젝트의 차별점이다. |

---

## Context Anchor

> Auto-generated from Executive Summary. Propagated to Design/Do documents for context continuity.

| Key | Value |
|-----|-------|
| **WHY** | 매일 아침 지표를 직접 찾아보는 번거로움 + 무인 스케줄러의 실패를 아무도 추적할 수 없다는 문제 |
| **WHO** | 1인 사용자, 계정/로그인 없음(기기·서버 설정값으로 개인화) |
| **RISK** | 무료 등급 인프라(Gemini Free API, Oracle Cloud Always Free Tier, 비공식 금융 API)의 정책 변경·불안정성 |
| **SUCCESS** | 매일 08:00 KST 브리핑이 자동 생성되어 웹 대시보드에 반영되고, 성공/실패가 100% 감사로그로 추적됨 |
| **SCOPE** | **Phase 1**(이번 Plan): backend + web, FR-01·02·04·06·07 전체 + FR-03의 발송(백엔드)까지 + FR-05. **Phase 2**(별도 Plan): mobile 앱(RN), FR-03의 수신 UI |

---

## 1. Overview

### 1.1 Purpose

매일 아침 개장 전 증시·원자재·환율 동향을 자동으로 수집·분석해 전달하고, 이 자동화 파이프라인 자체의 신뢰성(성공/실패 이력)을 감사로그로 증명하는 시스템을 만든다.

### 1.2 Background

원본 명세서(`docs/specs/프로젝트 기획 및 시스템 명세서.pdf`)가 이미 기능 요구사항·감사로그 DB 스키마·아키텍처 구성도·기술 스택을 구체적으로 정의한 상태에서 시작했다. 이 Plan 문서는 그 명세를 bkit PDCA 워크플로 형식으로 옮기고, 명세서가 비워둔 부분(사용자 모델, MVP 범위, 배포처)을 이번 세션의 체크포인트에서 확정한 결과를 반영한다.

### 1.3 Related Documents

- 원본 명세: `docs/specs/프로젝트 기획 및 시스템 명세서.pdf`, `docs/specs/UI 디자인 프레임워크 추천 제안서.pdf`, `docs/specs/UI 디자인 참고 사이트 및 애니메이션 가이드.pdf`
- 위키 컨텍스트: `llm-wiki/Context.md`, `llm-wiki/design.md`, `llm-wiki/Next-Tasks.md`
- ADR: `llm-wiki/Decisions/0001-tech-stack-baseline.md`, `llm-wiki/Decisions/0002-ui-framework-selection.md`, `llm-wiki/Decisions/0003-mvp-scope-and-user-model.md`

---

## 2. Scope

### 2.1 In Scope (Phase 1 — 이번 Plan)

- [ ] **BE**: 백엔드 스캐폴딩(Kotlin+Spring Boot+WebFlux), 감사로그 AOP 인프라, 스케줄러+Gemini 연동, 금융 API 연동+FALLBACK, FCM 발송 서비스(발송까지 — 수신 UI는 Phase 2), 브리핑 이력 저장 API, 사용자 설정 API(계정 없는 단일 설정값), Oracle Cloud Always Free Tier 배포
- [ ] **WEB**: 웹 스캐폴딩(React+Vite+AntD), 실시간 지표 대시보드, 감사로그 뷰어, 설정 화면, Cloudflare Pages 배포
- [ ] FR-01, FR-02, FR-04, FR-05, FR-06, FR-07 전체 구현
- [ ] FR-03은 **백엔드 발송 로직까지**(테스트 디바이스 토큰으로 검증) — 모바일 수신 UI는 Out of Scope

### 2.2 Out of Scope

- **모바일 앱(RN) 전체** — UI, Expo 빌드, 스토어 심사·배포. 별도 `mobile-app` Plan으로 Phase 2에서 다룬다.
- **다중 사용자·로그인/회원가입** — 이번 Plan은 계정 없는 1인용 모델을 전제([[Decisions/0003-mvp-scope-and-user-model]]). 여러 사용자를 지원해야 할 필요가 생기면 별도 Plan.
- **Kubernetes/Terraform 등 엔터프라이즈 인프라** — bkit Enterprise 기본 템플릿은 사용하지 않는다([[Decisions/0001-tech-stack-baseline]]).
- **결제/구독** — 무료 등급 전제, 과금 로직 없음.

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 스케줄러 기반 데이터 수집 — 매일 08:00 KST, Gemini/금융 API 호출 | High | Pending |
| FR-02 | AI 분석 — 뉴스·종목 브리핑 생성 (Gemini Search Grounding) | High | Pending |
| FR-03 | FCM 푸시 알림 전송 (백엔드 발송부만; 모바일 수신은 Phase 2) | High | Pending |
| FR-04 | 대시보드 실시간 지표 시각화 (AntD, 금/은/USD/JPY/CNY) | High | Pending |
| FR-05 | 사용자 관심사 관리 (키워드 추가/삭제, 수신 시간 설정 — 계정 없는 단일 설정값) | Medium | Pending |
| FR-06 | 브리핑 데이터 이력 저장·조회 | High | Pending |
| FR-07 | 종합 감사로그(Audit Log) 추적 — SCHEDULER/GEMINI_API/FCM_PUSH/USER_SETTING/ERROR | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| 비용 | 월 $0, 유료 결제수단 미등록 | Oracle Cloud/Cloudflare/Firebase 청구 대시보드 수동 확인 |
| 신뢰성(가용성) | 스케줄러가 08:00 KST ±5분 내 실행 | 감사로그 `SCHEDULER` 이벤트 `created_at` 확인 |
| 신뢰성(장애 대응) | Gemini API 장애 시 3초 이상 지연은 WARNING, 완전 실패는 FALLBACK(금융 API 기본 지표로 대체) 전환 | 감사로그 status 분포 확인 |
| 관측성 | 모든 외부 호출(Gemini/금융/FCM)이 감사로그에 성공/실패·소요시간(ms)으로 기록 | 감사로그 커버리지 수동 점검 |
| 보안 | API 키·Firebase 서비스 계정 등 시크릿을 코드에 하드코딩하지 않음 | 코드 리뷰 + `.gitignore`(.env) 확인 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01·02·04·06·07 전체, FR-03 발송부, FR-05 구현 완료
- [ ] 스케줄러가 실 서버(Oracle Cloud Free Tier)에서 최소 1회 자동 실행되고 웹 대시보드에 결과가 반영됨
- [ ] 감사로그 뷰어에서 SUCCESS/WARNING/FALLBACK/FAILURE 4개 상태가 실제로 재현·확인됨
- [ ] 웹이 Cloudflare Pages에, 백엔드가 Oracle Cloud Free Tier에 배포되어 공개 URL로 접근 가능

### 4.2 Quality Criteria

- [ ] 감사로그 AOP·스케줄러·FALLBACK 분기 등 핵심 경로에 단위 테스트(JUnit5+MockK) — 커버리지 수치보다 **핵심 경로 커버**를 우선한다(1인 프로젝트, 과도한 커버리지 목표는 비현실적)
- [ ] Web 빌드(`npm run build`)·백엔드 빌드(`./gradlew build`) 통과
- [ ] Zero lint errors (ESLint/ktlint)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Gemini Search Grounding 무료 등급 정책 변경(요청 한도·기능 축소) | High | Medium | 하루 1회 호출로 한도(1,500회/일) 대비 사용량이 극히 낮음 — 감사로그로 실제 사용량 모니터링, 정책 변경 시 즉시 감지 |
| Oracle Cloud Always Free Tier 계정 정지·리소스 회수 | High | Low-Medium | 결제 수단 미등록으로 예상외 과금은 없으나, Oracle이 Free Tier 정책을 바꾸면 Render/Railway로 이전 필요 — [[../../llm-wiki/OpenQuestions]]에 트리거 기록 |
| 비공식 금융 API(Yahoo Finance 등) 스펙 변경으로 파싱 실패 | Medium | Medium | FALLBACK 경로가 이미 설계에 포함(명세서 5.1절) — 실패 시 감사로그 FAILURE로 드러나며 조용히 죽지 않음 |
| FCM 무효 토큰 누적 | Low | Medium | 명세서 요구사항대로 무효 토큰 자동 정제 로직(FR-03) 포함 |
| 1인 개발·검증 리소스 한계로 테스트 커버리지가 얕을 위험 | Medium | Medium | 핵심 경로(감사로그·스케줄러·FALLBACK) 우선순위화, 나머지는 수동 검증으로 대체(4.2절) |

---

## 6. Impact Analysis

> 이 프로젝트는 **신생 프로젝트**이며 기존 운영 중인 리소스가 없다. 6.2·6.3의 "기존 소비자" 점검은 해당 없음 — 이 절은 향후 FireWatch에 기능을 추가할 때(Phase 2 이후) 채운다.

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `audit_logs` | DB Schema (신규) | 명세서 3.2절 스키마 그대로 생성 |
| 브리핑 이력 테이블(명명 미정) | DB Schema (신규) | FR-06 — Design 단계에서 확정 |
| 사용자 설정 테이블(명명 미정) | DB Schema (신규) | FR-05 — Design 단계에서 확정 |

### 6.2 Current Consumers

N/A — 신규 프로젝트.

### 6.3 Verification

- [ ] N/A (신규 프로젝트)

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

> **주의**: 이 표는 bkit 기본 웹앱 템플릿(Next.js + bkend.ai BaaS) 기준이라 FireWatch(Kotlin 백엔드 + React 웹 + RN 모바일, 자체 인프라)에는 그대로 들어맞지 않는다. 참고용으로만 표시하며, 실제 구조 결정은 [[../../llm-wiki/Decisions/0001-tech-stack-baseline]]을 따른다.

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure (`components/`, `lib/`, `types/`) | Static sites, portfolios, landing pages | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration (bkend.ai) | Web apps with backend, SaaS MVPs, fullstack apps | ☐(BaaS 미사용이라 완전 부합 아님) |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems, complex architectures | ☐(K8s/Terraform 불필요) |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Backend 언어/프레임워크 | Kotlin+Spring / Node / Python | **Kotlin + Spring Boot 3.2+** | 명세서 지정, Null 안정성·안정적 스케줄러 |
| Backend 비동기 HTTP | WebFlux(WebClient) / RestTemplate | **WebFlux(WebClient)** | Gemini/금융 API 비동기 호출 |
| Web 프레임워크 | Next.js / React+Vite / Vue | **React 18 + Vite** | 명세서 지정, 빠른 번들링 |
| Web UI 라이브러리 | Ant Design / Shadcn+Tailwind / Mantine | **Ant Design v5** | [[../../llm-wiki/Decisions/0002-ui-framework-selection]] |
| Web 상태 관리 | Context / Zustand / Redux | **React Context + 로컬 상태** (Phase 1) | 대시보드·설정 화면 규모에서 전역 상태 라이브러리는 과설계 — Design 단계에서 재검토 |
| API 클라이언트(Web→Backend) | fetch / axios | Design 단계에서 결정 | — |
| Backend | BaaS(bkend.ai) / **Custom Server** / Serverless | **Custom Server(Kotlin/Spring)** | bkit Dynamic 기본 권장(bkend.ai)과 다름 — 명세서가 이미 Kotlin 백엔드를 요구, [[../../llm-wiki/Decisions/0001-tech-stack-baseline]] |
| Backend 호스팅 | Oracle Cloud Free Tier / Render / Railway | **Oracle Cloud Always Free Tier** | 이번 세션 체크포인트에서 확정([[../../llm-wiki/Decisions/0003-mvp-scope-and-user-model]]) |
| Testing(Backend) | JUnit5+MockK / Kotest | Design 단계에서 결정 | — |
| Testing(Web) | Jest / Vitest / Playwright | Design 단계에서 결정 | — |

### 7.3 Clean Architecture Approach

```
Selected: 자체 구조 (bkit 표준 3단계 어느 것도 그대로 맞지 않음)

backend/  (Kotlin/Spring Boot — 계층형: controller → service → repository, AuditLogAspect는 횡단 관심사로 AOP 분리)
web/      (React+Vite — components/, features/, lib/ 정도의 단순 구조로 시작, 과설계 지양)
mobile/   (Phase 2 — 이번 Plan 범위 밖)
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section (llm-wiki 연동 규칙 — 코드 컨벤션 자체는 미정, Design 단계에서 추가)
- [ ] `docs/01-plan/conventions.md` exists (Phase 2 output) — 아직 없음
- [ ] `CONVENTIONS.md` exists at project root — 아직 없음
- [ ] ESLint configuration — web 스캐폴딩 시 생성
- [ ] ktlint/detekt configuration — backend 스캐폴딩 시 생성
- [ ] TypeScript configuration — web 스캐폴딩 시 생성

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | 미정 | Kotlin 패키지 구조, React 컴포넌트 네이밍 | High |
| **Folder structure** | 미정(7.3절 초안만 있음) | `backend/`·`web/` 내부 구조 확정 | High |
| **Import order** | 미정 | Design 단계에서 lint 설정으로 강제 | Medium |
| **Environment variables** | 미정 | 8.3절 | High |
| **Error handling** | 미정 | 감사로그와 연동되는 예외 처리 컨벤션(Design 핵심 과제) | High |

### 8.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `GEMINI_API_KEY` | Gemini 3 Flash Free API 인증 | Backend | ☐ |
| `FIREBASE_SERVICE_ACCOUNT_JSON` (또는 경로) | Firebase Admin SDK(FCM 발송) 인증 | Backend | ☐ |
| `KOREA_EXIM_API_KEY` | 한국수출입은행 환율 API 인증 | Backend | ☐ |
| `DATABASE_URL` | 감사로그·브리핑 DB 접속 정보 | Backend | ☐ ([[../../llm-wiki/OpenQuestions]] — DB 종류 미정) |
| `VITE_API_BASE_URL` | Web → Backend API 엔드포인트 | Web(Client) | ☐ |

### 8.4 Pipeline Integration

이 프로젝트는 bkit 9-phase Development Pipeline을 그대로 따르지 않는다 — llm-wiki + PDCA(Plan→Design→Do→Check→Report)만 사용한다. 근거: `CLAUDE.md`의 「bkit PDCA와 llm-wiki의 관계」.

---

## 9. Next Steps

1. [ ] `/pdca design firewatch` — Phase 1(backend+web) 아키텍처 설계, 3개 옵션(Minimal/Clean/Pragmatic) 중 선택
2. [ ] Design 승인 후 `backend/`·`web/` 스캐폴딩(BE-1, WEB-1) 착수
3. [ ] Phase 2 별도 Plan: `/pdca plan mobile-app` (모바일 앱 범위)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-08-19 | Initial draft — 원본 명세서 3종 기반, 체크포인트에서 사용자 모델/MVP 범위/배포처 확정 | Project Owner |
