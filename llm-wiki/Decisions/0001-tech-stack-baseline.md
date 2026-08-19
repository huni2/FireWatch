---
source: "docs/specs/프로젝트 기획 및 시스템 명세서.pdf (2026-08-19 프로젝트 착수 시점 원본 명세) — [[log]] 2026-08-19"
verified: 2026-08-19
---

# 0001 — 기술 스택은 원본 명세서를 그대로 채택한다

## 상태
채택

## 맥락

FireWatch 프로젝트는 이미 완성된 3개 문서(기획 및 시스템 명세서, UI 프레임워크 제안서, UI 참고·애니메이션 가이드)를 갖고 시작했다. 명세서는 계층별 기술 스택(2.1절)·기능 요구사항(3.1절)·감사로그 DB 스키마(3.2절)·아키텍처 구성도(4절)까지 구체적으로 지정하고 있어, bkit의 기본 Enterprise 템플릿(Turborepo + FastAPI + AWS EKS + Terraform)을 그대로 적용하면 명세서와 정면으로 어긋난다.

## 결정

프로젝트의 기술 스택은 **원본 명세서 2.1절을 그대로 정본으로 삼는다.**

| 계층 | 채택 |
|---|---|
| Backend 언어/프레임워크 | Kotlin(JVM 17/21) + Spring Boot 3.2+ + Spring WebFlux(WebClient) |
| 감사로그 | Spring AOP + Logback + JPA Audit |
| Push | Firebase Admin SDK → FCM |
| Mobile | React Native(Expo SDK 50+) + NativeWind |
| Web | React 18 + Vite + Ant Design v5 |
| AI | Gemini 3 Flash Free API(Google Search Grounding) |
| 금융 데이터 | Yahoo Finance(yfinance) / 한국수출입은행 API |
| DB | SQLite/H2(로컬) — 운영 DB는 [[../OpenQuestions|OpenQuestions]] 미결 |
| Web 호스팅 | Cloudflare Pages |
| Backend 호스팅 | Oracle Cloud Always Free Tier (또는 Render/Railway 무료 플랜) |

bkit `enterprise` 스킬의 `init` 액션(Turborepo, apps/packages/services/infra 4분할, K8s/Terraform 템플릿)은 **실행하지 않는다.** 대신 서비스 3분할(`backend/`, `web/`, `mobile/`)을 명세서 4절 아키텍처 구성도 그대로 따르고, bkit은 PDCA(Plan→Design→Do→Check→Report) 문서 워크플로만 사용한다.

## 근거

- 명세서가 이미 이 프로젝트를 위해 작성된 구체적 설계 문서이므로, 범용 템플릿보다 우선한다(SoR 우선순위: 이 프로젝트 한정 원본 명세서 > bkit 범용 템플릿).
- 비용 제약($0/월)이 명세서 1.3절에 이미 계층별로 검증되어 있다 — Gemini Free API 일 1,500회, FCM 무제한 무료, Cloudflare Pages 무제한 대역폭, Oracle Cloud Free Tier 상시 가동. bkit Enterprise 기본 스택(EKS/RDS/Terraform)은 이 제약과 정면으로 충돌한다.
- Kotlin/Spring Boot은 명세서가 "Null 안정성, 간결한 코드로 안정적인 스케줄러 개발"을 이유로 명시적으로 선택한 것이며, 대체(예: Node/Python)로 바꿀 근거가 없다.

## 결과·트레이드오프

**얻는 것** — 명세서·감사로그 스키마·아키텍처 구성도를 그대로 구현 대상으로 쓸 수 있어 별도 재설계가 불필요하다. bkit의 PDCA 문서화·감사·체크포인트 기능은 스택과 무관하게 그대로 활용 가능하다.

**감수하는 것** — bkit Enterprise 스킬이 기본 제공하는 Turborepo 통합 타입 공유, ArgoCD/K8s 배포 자동화, Sentry 통합 등은 이번 스택(Kotlin 백엔드 + 별도 웹/모바일)에서 그대로 재사용되지 않는다. 필요한 관측성(로깅·모니터링)은 감사로그 자체 구현으로 대체한다.

## 재검토 트리거

- 무료 등급 한도(Gemini 일 1,500회, Oracle Free Tier)를 실사용에서 초과할 조짐이 보일 때.
- Oracle Cloud Free Tier 리전 가용성 문제 등으로 Backend 호스팅을 바꿔야 할 때 → Render/Railway 무료 플랜으로 전환하며 이 ADR 갱신.
