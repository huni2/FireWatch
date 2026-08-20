# FireWatch — 다음 과제

> **형식 계약 (훅이 파싱한다)**: 열린 과제 제목은 `### BE-N. 제목` / `### WEB-N. 제목` / `### APP-N. 제목`.
> `.claude/settings.json`의 SessionStart 훅이 `### BE-`·`### WEB-`·`### APP-`로 시작하는 줄만 추출해 세션에 주입한다. 섹션 헤더는 주입되지 않으므로 **제목의 접두사가 유일한 구분자**다.
> 계약은 접두사뿐이라 섹션 제목은 자유롭게 바꿔도 되고, 추출이 0건이면 훅이 형식 오류 문구를 대신 주입한다.
> 새 과제는 `무엇 → 왜 → 완료 기준`으로 추가하고, 종료되면 아래 종료 기록 표로 옮긴 뒤 지운다. 번호는 재사용하지 않는다(로그·ADR 참조가 깨진다).

**BE는 번호가 곧 의존 순서**(스케줄러·감사로그 인프라가 먼저 서야 나머지가 그 위에 쌓인다).
**WEB·APP은 서로 독립**이지만 대부분 특정 BE 과제에 의존한다 — 각 과제의 `무엇`에 명시.

**진행 상황(2026-08-20)**: BE-1·BE-2·BE-4·BE-5·BE-6·BE-7·BE-8·WEB-1~5 전부 완료. Phase 1(BE+WEB) 종료. **남은 건 BE-3(Gemini 성공 응답 재확인, 현재 무료 티어 레이트리밋으로 FALLBACK만 확인됨)뿐.** APP은 Phase 2.

**Phase 1(현재 Plan) = BE 전체 + WEB 전체. Phase 2(별도 Plan) = APP 전체.** 근거는 [[Decisions/0003-mvp-scope-and-user-model]] — 모바일 앱은 Expo 빌드·스토어 심사 등 원자재가 달라 `docs/01-plan/features/firewatch.plan.md`의 범위 밖이다. 아래 APP 섹션은 Phase 2 착수 시점에 별도 Plan 문서로 옮겨질 예정이며, 그 전까지는 백로그로만 유지한다.

**Design 완료(2026-08-19)**: `docs/02-design/features/firewatch.design.md`, Option C(Pragmatic Balance) 채택. 아래 BE/WEB 과제 순서는 Design §11.3 Module Map과 1:1 대응하며, `/pdca do firewatch --scope module-N`으로 세션별 구현 가능.

## 열린 과제 — 백엔드(BE)

### BE-3. 스케줄러 + Gemini API 연동 (부분 완료)
**무엇** — `@Scheduled` 잡 + Gemini API(Google Search Grounding) 호출로 국내/미국 증시 요약·추천 종목 텍스트 생성(FR-01, FR-02). **BE-2 의존.**
**왜** — 시스템의 핵심 파이프라인.
**완료 기준** — 수동 트리거로 잡 실행 → Gemini 응답 텍스트 생성 → `audit_logs`에 SCHEDULER/GEMINI_API 이벤트 기록.
**진행 상황** — `SchedulerJob`·`GeminiBriefingService`·`GeminiClient` 구현 완료, 단위테스트(Mock) 통과. **실제 `GEMINI_API_KEY`로 라이브 호출 확인함(2026-08-20)** — Render 프로덕션에서 수동 트리거 결과 Gemini가 `429 Too Many Requests`(무료 티어 레이트리밋) 반환, 인증·요청 형식 자체는 정상(키가 유효함을 확인). FALLBACK 분기가 설계대로 작동해 금/은/환율은 정상 채워지고 `marketSummary`만 대체 문구로 채워짐. **아직 실제 성공 응답(텍스트 생성 성공)은 못 봄** — 나중에 재시도해서 확인 필요.

## 열린 과제 — 웹(WEB)

_(현재 없음 — WEB-5까지 전부 완료)_

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
| BE-4 | 금융 API 연동 + FALLBACK 처리 | 완료. `FinancialApiClient`(한국수출입은행 exchangeJSON + Yahoo Finance 비공식 v8 chart) + `FinancialDataService`. 실측 확인: 수출입은행 위안화 cur_unit은 "CNY"가 아니라 **"CNH"**, Yahoo는 User-Agent 없으면 429. FALLBACK 범위는 "Gemini 실패 시만" 적용, 금융 API 단독 실패는 NORMAL+null 필드로 처리 — [[Decisions/0006-fallback-scope]]. `SchedulerJobTest` 4개 시나리오(둘 다 성공/Gemini만 실패/금융만 실패/둘 다 실패)로 검증. **실제 EXIM_API_KEY/Yahoo 라이브 호출 확인함(2026-08-20, Render 프로덕션)** — 금/은/환율(USD·JPY·CNY) 전부 실제 값으로 채워짐 | `backend/.../client/FinancialApiClient.kt`, [[Decisions/0006-fallback-scope]] (2026-08-19 [[log]]) |
| BE-8 | Render 배포 | 완료. Oracle Cloud 가입이 막혀 Render(무료, 카드 불필요) + GitHub Actions 예약 워크플로(매일 08:00 KST에 `/api/scheduler/trigger` 호출해 깨움)로 전환 — [[Decisions/0008-deployment-render-github-actions]]. `backend/Dockerfile`(멀티스테이지)·`render.yaml`(Blueprint)·`.github/workflows/daily-trigger.yml` 작성. GitHub Actions 시크릿(`SETTINGS_API_KEY`·`RENDER_BACKEND_URL`) 등록. 로컬 Docker 빌드 검증 중 C: 드라이브가 100% 차 Docker Desktop이 응답 없어져(사용자가 정리) 로컬 검증은 보류, Render 서버 측 빌드로 대신 검증. Render Blueprint 배포 자체(계정 생성·GitHub 연동·API 키 3종 입력)는 카드 미등록 등 사용자만 할 수 있는 단계라 사용자가 브라우저에서 직접 진행, 브라우저 자동화로 동행. 배포 URL `https://firewatch-backend-q3cv.onrender.com` — `curl`로 `/api/settings` 200 확인, **`/api/scheduler/trigger` 수동 트리거로 실제 브리핑 1건 생성 확인**(금/은/환율 실데이터, Gemini는 무료 티어 레이트리밋으로 FALLBACK — BE-3 참고), GitHub Actions 워크플로 수동 실행도 12초 만에 성공(`gh run list`로 확인) | `backend/Dockerfile`, `render.yaml`, `.github/workflows/daily-trigger.yml`, `DEPLOY.md`, [[Decisions/0008-deployment-render-github-actions]] (2026-08-20 [[log]]) |
| WEB-5 | Cloudflare Pages 배포 | 완료. `https://firewatch-eqp.pages.dev`("firewatch" 이름 충돌로 "-eqp" 접미사 자동 부여)에 배포. Cloudflare 대시보드가 2026-08 기준 대개편(Pages가 "Workers & Pages"로 흡수, Compute 하위 메뉴로 이동)되어 있었고 기본 Account API 토큰엔 Pages 편집 권한이 없어 `Pages:Edit` 권한을 추가한 새 토큰을 발급해야 배포됨(`DEPLOY.md` 3번). BE-8 완료 후 `web/.env`의 `VITE_API_BASE_URL`을 실제 Render URL로 바꿔 재빌드+재배포, `render.yaml`의 `FIREWATCH_ALLOWED_ORIGINS`도 실제 Pages URL로 맞춤. **브라우저로 실제 왕복 확인** — 대시보드가 뜨고 `/api/briefings/latest`·`/api/briefings?from&to` 정상 호출(CORS 문제 없음, 데이터 없을 때의 빈 상태 UI도 정상 렌더) | `web/.env`, `render.yaml`, [[Decisions/0007-web-stack-and-cors]] (2026-08-20 [[log]]) |
| WEB-1 | 웹 프로젝트 스캐폴딩 | 완료. Vite로 생성 시 기본값이 React 19+antd 6이라 명세서·Design 문서(darkAlgorithm)에 맞춰 **React 18 / antd v5로 명시 고정**([[Decisions/0007-web-stack-and-cors]]). `AppShell`(Header+Nav+다크토글) + react-router 3라우트. 브라우저로 다크모드 토글까지 실제 확인 | `web/src/components/AppShell.tsx`, [[Decisions/0007-web-stack-and-cors]] (2026-08-19 [[log]]) |
| WEB-2 | 실시간 지표 대시보드 | 완료. `MetricStat`(Framer Motion 틱 애니메이션, 한국 증시 관례대로 상승=빨강/하락=파랑), `RateChart`(Recharts, 지표 선택+7/30일 토글), `BriefingSummaryCard`(FALLBACK 배지·스켈레톤). H2에 직접 시드한 실데이터로 브라우저 확인(카드·차트·상승 화살표 전부 정상 렌더) | `web/src/features/dashboard/` (2026-08-19 [[log]]) |
| WEB-3 | 감사로그 뷰어 | 완료. `AuditLogPage` — event_type/status/날짜 필터, FAILURE 행 배경 강조(`.audit-row-failure`), 상태별 색상 태그. 브라우저에서 실제 감사로그 6건(우리가 만든 USER_SETTING 포함) 렌더 확인 | `web/src/features/audit-log/` (2026-08-19 [[log]]) |
| WEB-4 | 설정 화면 | 완료. `SettingsPage` — TimePicker, `KeywordInput`(태그 추가/삭제, 최대 20개), 저장 시 `X-API-Key` 포함 PUT 호출, 401/성공 메시지 처리. **브라우저로 실제 저장→백엔드 반영→감사로그(USER_SETTING) 기록까지 왕복 확인**(curl로 재검증) | `web/src/features/settings/`, [[Decisions/0004-write-api-protection]] (2026-08-19 [[log]]) |
| BE-6 | 브리핑 이력 저장 API | 완료. `BriefingController`(`GET /latest`, `GET ?from=&to=`). 함께 `AuditLogController`(`GET /api/audit-logs`, 원래 Next-Tasks에 독립 항목이 없었는데 Design §4.1이 요구해 이번에 같이 구현 — WEB-3의 전제조건)와 `SchedulerController`(`POST /api/scheduler/trigger`, 디버그용 수동 실행)도 이 모듈에서 함께 만듦. `ApiIntegrationTest`(WebTestClient, 실제 내장 서버 기동)로 확인 | `backend/.../web/BriefingController.kt` (2026-08-19 [[log]]) |
| BE-7 | 사용자 설정 API | 완료. `SettingsController` + `SettingsService`(USER_SETTING 이벤트). API 키 검증을 컨트롤러가 아니라 **Service 메서드 안에서** 해 인증 실패도 감사로그에 남게 함([[Decisions/0004-write-api-protection]]). `ApiIntegrationTest`로 401/200/400(fieldErrors) 전부 확인, 실제 서버 기동해 curl로도 재확인 | `backend/.../service/SettingsService.kt` (2026-08-19 [[log]]) |
| BE-5 | FCM 푸시 발송 서비스 | 완료. `FirebaseFcmSender`(Firebase Admin SDK `sendEachForMulticast`) + `PushService`, 무효 토큰(`MessagingErrorCode.UNREGISTERED`) 자동 정제해 `user_settings.fcm_tokens`에서 제거. `PushSendResult(tokenCount, successCount)`를 반환해 감사로그 response_summary에 발송 통계가 그대로 남음(FR-07 요건). `PushServiceTest` 3개 시나리오 통과. **Phase 1엔 등록 토큰이 없는 게 정상**(모바일 앱은 Phase 2) — 실기기 발송은 Phase 2에서 검증 | `backend/.../service/PushService.kt` (2026-08-19 [[log]]) |
