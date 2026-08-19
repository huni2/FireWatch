# FireWatch — 다음 과제

> **형식 계약 (훅이 파싱한다)**: 열린 과제 제목은 `### BE-N. 제목` / `### WEB-N. 제목` / `### APP-N. 제목`.
> `.claude/settings.json`의 SessionStart 훅이 `### BE-`·`### WEB-`·`### APP-`로 시작하는 줄만 추출해 세션에 주입한다. 섹션 헤더는 주입되지 않으므로 **제목의 접두사가 유일한 구분자**다.
> 계약은 접두사뿐이라 섹션 제목은 자유롭게 바꿔도 되고, 추출이 0건이면 훅이 형식 오류 문구를 대신 주입한다.
> 새 과제는 `무엇 → 왜 → 완료 기준`으로 추가하고, 종료되면 아래 종료 기록 표로 옮긴 뒤 지운다. 번호는 재사용하지 않는다(로그·ADR 참조가 깨진다).

**BE는 번호가 곧 의존 순서**(스케줄러·감사로그 인프라가 먼저 서야 나머지가 그 위에 쌓인다).
**WEB·APP은 서로 독립**이지만 대부분 특정 BE 과제에 의존한다 — 각 과제의 `무엇`에 명시.

**진행 상황(2026-08-19)**: BE-1·BE-2·BE-4·BE-5·BE-6·BE-7 완료. BE-3은 Gemini 연동까지 완료(실 API 키 검증 대기). **BE-8(배포)만 남음.** WEB·APP은 스캐폴딩 전.

**Phase 1(현재 Plan) = BE 전체 + WEB 전체. Phase 2(별도 Plan) = APP 전체.** 근거는 [[Decisions/0003-mvp-scope-and-user-model]] — 모바일 앱은 Expo 빌드·스토어 심사 등 원자재가 달라 `docs/01-plan/features/firewatch.plan.md`의 범위 밖이다. 아래 APP 섹션은 Phase 2 착수 시점에 별도 Plan 문서로 옮겨질 예정이며, 그 전까지는 백로그로만 유지한다.

**Design 완료(2026-08-19)**: `docs/02-design/features/firewatch.design.md`, Option C(Pragmatic Balance) 채택. 아래 BE/WEB 과제 순서는 Design §11.3 Module Map과 1:1 대응하며, `/pdca do firewatch --scope module-N`으로 세션별 구현 가능.

## 열린 과제 — 백엔드(BE)

### BE-3. 스케줄러 + Gemini API 연동 (부분 완료)
**무엇** — `@Scheduled` 잡 + Gemini API(Google Search Grounding) 호출로 국내/미국 증시 요약·추천 종목 텍스트 생성(FR-01, FR-02). **BE-2 의존.**
**왜** — 시스템의 핵심 파이프라인.
**완료 기준** — 수동 트리거로 잡 실행 → Gemini 응답 텍스트 생성 → `audit_logs`에 SCHEDULER/GEMINI_API 이벤트 기록.
**진행 상황** — `SchedulerJob`·`GeminiBriefingService`·`GeminiClient` 구현 완료, 단위테스트(Mock) 통과, 앱 기동 확인. **실제 `GEMINI_API_KEY`로 라이브 호출은 아직 검증 안 됨**(더미 키로만 부팅 테스트) — 사용자가 키를 발급해 `.env`에 넣고 최소 1회 수동 트리거해봐야 진짜 완료. BE-4 완료로 금/은/환율·FALLBACK 분기까지 `SchedulerJob`에 통합됨(단, 이쪽도 실제 `EXIM_API_KEY` 라이브 검증은 아직).

### BE-8. Oracle Cloud Free Tier 배포
**무엇** — Oracle Cloud Always Free Tier(ARM 4 core/24GB) 또는 Render/Railway 무료 플랜에 배포, 24/7 가동 확인.
**왜** — 무료 등급 제약 안에서 실제로 매일 아침 8시에 동작해야 시스템으로서 의미가 있다.
**완료 기준** — 스케줄러가 실 서버에서 최소 1회 자동 실행되고 푸시가 도착함. **결제 수단 미등록 확인.**

## 열린 과제 — 웹(WEB)

### WEB-1. 웹 프로젝트 스캐폴딩
**무엇** — `web/`에 React 18 + Vite + Ant Design v5(`ConfigProvider` + `darkAlgorithm`) 프로젝트 생성. **BE 의존 없음** — 목업 데이터로 먼저 시작 가능.
**왜** — 나머지 WEB 과제의 기반.
**완료 기준** — 빈 대시보드 셸이 다크 모드로 뜬다.

### WEB-2. 실시간 지표 대시보드
**무엇** — 금·은·USD·JPY·CNY 시계열 차트(Recharts/Ant Design Charts) + AntD `Statistic`/`Card` 지표 뷰(FR-04). 수치 변경 시 Framer Motion 틱 애니메이션([[design]] 3절). **금융 API가 부분 실패하면 개별 필드가 null일 수 있다** — [[Decisions/0006-fallback-scope]]. null 필드는 카드에 "—"로 표시(에러로 취급하지 않음). **BE-6 완료 후 실데이터 연결, 그 전엔 목업으로 개발 가능.**
**왜** — 이 시스템의 메인 화면.
**완료 기준** — 5개 지표가 카드+차트로 표시되고, 새로고침 시 변경분이 시각적으로 드러남. null 필드가 있어도 화면이 깨지지 않음.

### WEB-3. 감사로그 뷰어
**무엇** — AntD `Table`/`Timeline`/`Tag`로 감사로그 대시보드(FR-07). 상태별 색상은 [[design]] 1절 고정값 그대로. **BE-6 완료로 `GET /api/audit-logs` 준비됨 — 바로 실데이터 연결 가능.**
**왜** — 명세서가 강조하는 핵심 차별 기능이자 24/7 무인 스케줄러의 유일한 관측 창구.
**완료 기준** — event_type/status/실행시간 필터링 가능, 실패 건이 빨간 태그로 즉시 식별됨.

### WEB-4. 설정 화면
**무엇** — 관심 키워드 추가/삭제, 푸시 수신 시간 변경 UI(FR-05). **BE-7 의존.**
**왜** — 사용자 맞춤 커스텀 기능.
**완료 기준** — 변경 사항이 저장되고 새로고침 후에도 유지됨.

### WEB-5. Cloudflare Pages 배포
**무엇** — Cloudflare Pages에 정적/React 호스팅 배포.
**왜** — 무료·무제한 대역폭 조건 충족(명세서 1.3절).
**완료 기준** — 공개 URL에서 대시보드가 뜨고 BE-8 배포 서버와 통신됨.

## 열린 과제 — 모바일(APP)

### APP-1. 모바일 프로젝트 스캐폴딩
**무엇** — `mobile/`에 React Native(Expo SDK 50+) + NativeWind 프로젝트 생성. **BE 의존 없음.**
**왜** — 나머지 APP 과제의 기반.
**완료 기준** — Expo Go에서 빈 앱 실행 확인.

### APP-2. FCM 푸시 수신 핸들러
**무엇** — Expo Notifications로 디바이스 토큰 등록·FCM 수신(FR-03). **BE-5 의존.**
**왜** — 모바일이 브리핑을 받는 유일한 경로.
**완료 기준** — 테스트 발송이 실제 기기(또는 시뮬레이터)에 도착.

### APP-3. 모바일 브리핑 UI
**무엇** — 알림 터치 시 바텀시트로 상세 브리핑 카드가 올라오는 UI([[design]] 3절). **BE-6 의존.**
**왜** — 모바일에서의 핵심 소비 경험.
**완료 기준** — 알림 → 상세 화면 전환이 매끄럽고(피해야 할 애니메이션 목록 제외), 오프라인에서도 마지막 브리핑이 보임.

### APP-4. 설정 화면(모바일)
**무엇** — 관심 키워드·수신 시간 설정 UI. **BE-7 의존.**
**왜** — WEB-4와 동일 기능의 모바일 대응.
**완료 기준** — WEB-4와 동일 API로 왕복, 값이 양쪽에서 일치.

## 종료 기록

| # | 과제 | 결과 | 정본·근거 |
|---|---|---|---|
| BE-1 | 백엔드 프로젝트 스캐폴딩 | 완료. Spring Initializr로 Kotlin+Spring Boot 4.1.0(+Boot 3.2 대신 채택, [[Decisions/0005-spring-boot-4]])+WebFlux+JPA+H2+Validation 생성, gradle wrapper 포함. `./gradlew build` 통과, `java -jar`로 기동 확인(Netty on port) | `backend/build.gradle.kts`, [[Decisions/0005-spring-boot-4]] (2026-08-19 [[log]]) |
| BE-2 | 감사로그 AOP 인프라 | 완료. `AuditLogAspect`가 `service` 패키지 전체를 포인트컷으로 자동 감사(옵트아웃). SUCCESS/WARNING(임계값 초과)/FALLBACK(`AuditContext.markFallback`)/FAILURE(예외) 4개 상태 전부 단위테스트로 재현·확인(`AuditLogAspectTest`, 4 tests pass). response_summary는 반환값 요약(예: FCM 발송 건수)이 자동으로 남음 | `backend/.../audit/AuditLogAspect.kt`, `docs/02-design/features/firewatch.design.md` §2.0 (2026-08-19 [[log]]) |
| BE-4 | 금융 API 연동 + FALLBACK 처리 | 완료. `FinancialApiClient`(한국수출입은행 exchangeJSON + Yahoo Finance 비공식 v8 chart) + `FinancialDataService`. 실측 확인: 수출입은행 위안화 cur_unit은 "CNY"가 아니라 **"CNH"**, Yahoo는 User-Agent 없으면 429. FALLBACK 범위는 "Gemini 실패 시만" 적용, 금융 API 단독 실패는 NORMAL+null 필드로 처리 — [[Decisions/0006-fallback-scope]]. `SchedulerJobTest` 4개 시나리오(둘 다 성공/Gemini만 실패/금융만 실패/둘 다 실패)로 검증. **실제 EXIM_API_KEY 라이브 호출은 미검증** | `backend/.../client/FinancialApiClient.kt`, [[Decisions/0006-fallback-scope]] (2026-08-19 [[log]]) |
| BE-6 | 브리핑 이력 저장 API | 완료. `BriefingController`(`GET /latest`, `GET ?from=&to=`). 함께 `AuditLogController`(`GET /api/audit-logs`, 원래 Next-Tasks에 독립 항목이 없었는데 Design §4.1이 요구해 이번에 같이 구현 — WEB-3의 전제조건)와 `SchedulerController`(`POST /api/scheduler/trigger`, 디버그용 수동 실행)도 이 모듈에서 함께 만듦. `ApiIntegrationTest`(WebTestClient, 실제 내장 서버 기동)로 확인 | `backend/.../web/BriefingController.kt` (2026-08-19 [[log]]) |
| BE-7 | 사용자 설정 API | 완료. `SettingsController` + `SettingsService`(USER_SETTING 이벤트). API 키 검증을 컨트롤러가 아니라 **Service 메서드 안에서** 해 인증 실패도 감사로그에 남게 함([[Decisions/0004-write-api-protection]]). `ApiIntegrationTest`로 401/200/400(fieldErrors) 전부 확인, 실제 서버 기동해 curl로도 재확인 | `backend/.../service/SettingsService.kt` (2026-08-19 [[log]]) |
| BE-5 | FCM 푸시 발송 서비스 | 완료. `FirebaseFcmSender`(Firebase Admin SDK `sendEachForMulticast`) + `PushService`, 무효 토큰(`MessagingErrorCode.UNREGISTERED`) 자동 정제해 `user_settings.fcm_tokens`에서 제거. `PushSendResult(tokenCount, successCount)`를 반환해 감사로그 response_summary에 발송 통계가 그대로 남음(FR-07 요건). `PushServiceTest` 3개 시나리오 통과. **Phase 1엔 등록 토큰이 없는 게 정상**(모바일 앱은 Phase 2) — 실기기 발송은 Phase 2에서 검증 | `backend/.../service/PushService.kt` (2026-08-19 [[log]]) |
