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
- [[Decisions/0003-mvp-scope-and-user-model]] — MVP는 backend+web 우선(mobile은 Phase 2), 계정 없는 1인 모델, 백엔드는 Oracle Cloud Free Tier

## 상세 (Reference 정본)
- [[Reference/README]] — 요구사항 정본은 `docs/specs/`의 원본 명세서 3종

## bkit PDCA
- Plan 문서 작성 완료: `docs/01-plan/features/firewatch.plan.md` (Phase 1 = backend+web). 상태 확인: `/pdca status`. 다음: `/pdca design firewatch`.
- Plan/Design/Do/Check/Report 문서는 `docs/01-plan/`, `docs/02-design/` 등 bkit 표준 경로에 별도 생성된다(이 위키가 대체하지 않음).

최근 변화: [[log]]
