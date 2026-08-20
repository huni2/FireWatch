# FireWatch — Index

이 프로젝트의 진입 지도. 전체를 읽지 말고 여기서 필요한 곳으로 이동한다.

## Core
- [[Context]] — 지금 무엇을 만드는가 (Claude Code 우선 읽기)
- [[design]] — 디자인 컨셉 정본 (감사로그 색상·UI 프레임워크·애니메이션 원칙)
- [[Next-Tasks]] — 다음 과제 (BE/WEB/APP 3분할 — 열린 과제 / 종료 기록)
- [[OpenQuestions]] — 미결정·미검증 질문 (사용자 인증 모델 등)

## Summaries (요약층)
- (없음 — 주제별 요약이 생기면 `Summaries/`에 추가하고 여기 링크)

## Decisions (ADR)
- [[Decisions/0001-tech-stack-baseline]] — 기술 스택은 원본 명세서를 그대로 채택(bkit Enterprise 기본 템플릿 미사용)
- [[Decisions/0002-ui-framework-selection]] — Web은 Ant Design v5, Mobile은 NativeWind (제안서 조합 A)
- [[Decisions/0003-mvp-scope-and-user-model]] — MVP는 backend+web 우선(mobile은 Phase 2), 계정 없는 1인 모델
- [[Decisions/0004-write-api-protection]] — 쓰기 API는 정적 API 키로 최소 보호(진짜 인증 아님)
- [[Decisions/0005-spring-boot-4]] — 명세서의 "3.2+"를 만족하는 Spring Boot 4.1.0 채택(Initializr가 3.x 미제공)
- [[Decisions/0006-fallback-scope]] — FALLBACK은 "Gemini 실패" 전용, 금융 API 단독 실패는 NORMAL+null 필드
- [[Decisions/0007-web-stack-and-cors]] — Web은 React 18+antd v5 고정, CORS 설정 추가(Design 누락분)
- [[Decisions/0008-deployment-render-github-actions]] — 백엔드는 Oracle Cloud 대신 Render, GitHub Actions가 매일 외부에서 깨움
- [[Decisions/0009-persistent-db-supabase]] — H2 파일 DB가 Render 슬립 사이클마다 초기화되는 걸 겪은 뒤 Supabase Postgres로 전환

## 상세 (Reference 정본)
- [[Reference/README]] — 요구사항 정본은 `docs/specs/`의 원본 명세서 3종

## bkit PDCA
- Plan 완료: `docs/01-plan/features/firewatch.plan.md` (Phase 1 = backend+web)
- Design 완료: `docs/02-design/features/firewatch.design.md` (Option C, 10-모듈 Session Guide)
- Do: module-1~10 전부 완료, 배포까지 끝남 — **Phase 1(backend+web) 완전 종료**. 남은 건 Gemini 라이브 성공 재확인(BE-3, 레이트리밋 해소 후)과 Phase 2(모바일) 착수뿐.
- 상태 확인: `/pdca status`.
- Plan/Design/Do/Check/Report 문서는 `docs/01-plan/`, `docs/02-design/` 등 bkit 표준 경로에 별도 생성된다(이 위키가 대체하지 않음).

최근 변화: [[log]]
