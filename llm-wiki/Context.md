# FireWatch — Context

Claude Code가 우선 읽는 구현 컨텍스트. "지금 무엇을 만드는가"를 한 장으로 유지한다.
낡으면 고친다 — 이 문서는 이력이 아니라 현재 상태다 (이력은 [[log]]).

## 무엇을 만드는가

- **FireWatch**: 매일 아침 8시, 국내/미국 증시 요약·호재/악재 뉴스·금/은 시세·원/달러(USD)·원/100엔(JPY)·원/위안(CNY) 환율을 Gemini API(Google Search Grounding)로 자동 수집·분석해 웹 대시보드와 모바일 푸시(FCM)로 전달하는 시스템. 스케줄러·AI 호출·푸시 발송 전 과정을 **감사로그(Audit Log)**로 기록해 대시보드에서 모니터링한다.
- 원본 명세: [[../docs/specs/프로젝트 기획 및 시스템 명세서.pdf|프로젝트 기획 및 시스템 명세서]] · [[../docs/specs/UI 디자인 프레임워크 추천 제안서.pdf|UI 프레임워크 제안서]] · [[../docs/specs/UI 디자인 참고 사이트 및 애니메이션 가이드.pdf|UI 참고·애니메이션 가이드]]. 문제 서술·기술 선택은 이 세 문서가 정본이며, 여기 없는 내용을 "요구사항"으로 새로 지어내지 않는다.
- 하드 제약: **월 $0**. 유료 등급으로 넘어갈 수 있는 결제 수단은 등록하지 않는다.

## 서비스 3분할

| 서비스 | 디렉터리(예정) | 역할 |
|---|---|---|
| Backend | `backend/` | Kotlin + Spring Boot. `@Scheduled(cron="0 0 8 * * *")`로 Gemini/금융 API 호출 → 분석 → FCM 발송 → 전 과정 AOP 감사로그 적재 |
| Web | `web/` | React 18 + Vite + Ant Design v5(다크 모드). 운영자/사용자가 브리핑·지표·감사로그를 보는 대시보드 |
| Mobile | `mobile/` | React Native(Expo SDK 50+) + NativeWind. FCM 수신, 모바일 브리핑 UI, 관심 키워드·수신 시간 설정 |

세 서비스는 아직 **스캐폴딩 전**이다(2026-08-19 기준). 이번 세션은 하네스(llm-wiki + .bkit)와 PDCA Plan 문서 생성까지만 진행한다 — [[Next-Tasks]] 참고.

## 스택 / 구조 (명세서 근거)

- **Backend**: Kotlin(JVM 17/21) · Spring Boot 3.2+ · Spring WebFlux(WebClient, Gemini/금융 API 비동기 호출) · Spring AOP + Logback + JPA(감사로그 자동 수집·영속화) · Firebase Admin SDK(FCM 트리거) · DB는 SQLite/H2(로컬)→PostgreSQL(운영 후보).
- **Web**: React 18 + Vite · Ant Design v5(`ConfigProvider` + `darkAlgorithm`) · Recharts/Ant Design Charts(환율·금/은 시계열, 감사로그 응답시간) · Framer Motion(수치 틱 애니메이션, 카드 페이드인) — 근거 [[Decisions/0002-ui-framework-selection]].
- **Mobile**: React Native(Expo) · NativeWind(Tailwind 클래스) · Expo Notifications/FCM · React Native Reanimated(60fps 모션).
- **AI/외부 데이터**: Gemini 3 Flash Free API(Google Search Grounding, 일 1,500회 무료) · Yahoo Finance(yfinance) / 한국수출입은행 API.
- **인프라(전부 무료 등급)**: Web은 Cloudflare Pages, Backend는 Oracle Cloud Always Free Tier(ARM 4 core/24GB) 또는 Render/Railway 무료 플랜, Push는 FCM.
- 상세 근거는 [[Decisions/0001-tech-stack-baseline]].

## 감사로그(Audit Log) — 이 프로젝트의 핵심 차별점

- 이벤트 타입: `SCHEDULER` · `GEMINI_API` · `FCM_PUSH` · `USER_SETTING` · `ERROR`.
- 상태: `SUCCESS`(Emerald #10B981) · `WARNING`(Amber #F59E0B, API 지연 3초 이상 등) · `FALLBACK`(Indigo #6366F1, Gemini 장애 시 Yahoo/수출입은행으로 대체) · `FAILURE`(Crimson #EF4444).
- 스키마 원안은 [[Decisions/0001-tech-stack-baseline]]과 원본 명세서 3.2절의 `audit_logs` 테이블 참고.

## 지금 단계

- **하네스 구축 완료**: `llm-wiki/`, 루트 `CLAUDE.md`, `.claude/settings.json` 훅(SessionStart/Stop) — 이 세션에 완료.
- **bkit PDCA Plan 완료**: `docs/01-plan/features/firewatch.plan.md` 작성 완료. **MVP는 backend+web을 Phase 1로, mobile은 별도 Phase 2 Plan**으로 분리했다([[Decisions/0003-mvp-scope-and-user-model]]). 사용자는 계정 없는 1인 모델, 백엔드는 Oracle Cloud Always Free Tier로 확정.
- **bkit PDCA Design 완료**: `docs/02-design/features/firewatch.design.md` 작성 완료. Option C(Pragmatic Balance) 채택 — AOP로 감사로그 자동 강제, 쓰기 API는 정적 API 키로 최소 보호([[Decisions/0004-write-api-protection]]). §11.3에 10개 모듈(BE-1~8, WEB-1~5 대응)과 세션 분할 계획 있음.
- **module-1~5, module-7~9 구현 완료(2026-08-19) — Phase 1(backend+web) 사실상 전부 완료, 배포(BE-8/WEB-5)만 남음**: `backend/`(Kotlin+Spring Boot 4.1.0, [[Decisions/0005-spring-boot-4]])는 감사로그 AOP+스케줄러(Gemini/금융API/FALLBACK)+FCM+REST API 6개 엔드포인트까지. `web/`(React 18+Vite+AntD v5, [[Decisions/0007-web-stack-and-cors]])는 대시보드·감사로그 뷰어·설정 3화면. 브라우저로 실제 열어서 다크모드 토글·차트 렌더링·설정 저장(실제 PUT→백엔드 반영→감사로그 기록)까지 왕복 확인. 개발 중 CORS 설정이 Design에서 누락된 걸 발견해 추가([[Decisions/0007-web-stack-and-cors]]).
- **단, 진짜 API 키(GEMINI_API_KEY/EXIM_API_KEY/FIREBASE_SERVICE_ACCOUNT_JSON)로는 아직 라이브 호출을 안 해봤다** — 전부 더미 값으로 검증([[Next-Tasks]] BE-3 진행 상황 참고).
- **남은 건 BE-8·WEB-5(배포)뿐** — 배포되면 Phase 1이 완전히 끝난다.
- 다음 세션: `/pdca do firewatch --scope module-6,module-10`(Oracle Cloud + Cloudflare Pages 배포) 또는 먼저 실제 API 키들을 넣고 BE-3·BE-4를 라이브로 수동 검증.
- `.bkit/` 자체(PDCA 상태·감사 로그 자동 축적)는 **Claude Code 세션의 작업 디렉터리에 스코프**된다 — 이번 세션은 `E:\`(상위 드라이브 루트)에서 시작되어 `.bkit` 자동 추적이 `E:\.bkit`에 잡힌다. FireWatch 전용 `.bkit` 상태를 원하면 **다음부터는 `E:\huni_private\FireWatch`를 작업 디렉터리로 Claude Code를 시작**해야 한다(sympo-studio가 그렇게 되어 있는 것과 동일한 이유).
- 다음 한 걸음: [[Next-Tasks]]의 열린 과제 확인 → `/pdca design firewatch`.
