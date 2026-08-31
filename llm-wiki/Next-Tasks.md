# FireWatch — 다음 과제

> **형식 계약 (훅이 파싱한다)**: 열린 과제 제목은 `### BE-N. 제목` / `### WEB-N. 제목` / `### APP-N. 제목`.
> `.claude/settings.json`의 SessionStart 훅이 `### BE-`·`### WEB-`·`### APP-`로 시작하는 줄만 추출해 세션에 주입한다. 섹션 헤더는 주입되지 않으므로 **제목의 접두사가 유일한 구분자**다.
> 계약은 접두사뿐이라 섹션 제목은 자유롭게 바꿔도 되고, 추출이 0건이면 훅이 형식 오류 문구를 대신 주입한다.
> 새 과제는 `무엇 → 왜 → 완료 기준`으로 추가하고, 종료되면 아래 종료 기록 표로 옮긴 뒤 지운다. 번호는 재사용하지 않는다(로그·ADR 참조가 깨진다).

**BE는 번호가 곧 의존 순서**(스케줄러·감사로그 인프라가 먼저 서야 나머지가 그 위에 쌓인다).
**WEB·APP은 서로 독립**이지만 대부분 특정 BE 과제에 의존한다 — 각 과제의 `무엇`에 명시.

**진행 상황(2026-08-23)**: BE-1·BE-2·BE-4·BE-5·BE-6·BE-7·BE-8·BE-9·WEB-1~5 전부 완료. Phase 1(BE+WEB) 종료. **남은 건 BE-3(Gemini 성공 응답 재확인, 현재 무료 티어 레이트리밋으로 FALLBACK만 확인됨)·BE-10(한국국채 수익률 데이터 소스).** Phase 2(APP-1~4)는 **코드 전부 완료** — 남은 건 사용자의 EAS 프로젝트 연결(`npx eas login && npx eas init`)과 실기기 왕복 검증뿐(세션이 대신 못 하는 계정 행동).

**Phase 1(현재 Plan) = BE 전체 + WEB 전체. Phase 2(별도 Plan) = APP 전체.** 근거는 [[Decisions/0003-mvp-scope-and-user-model]] — 모바일 앱은 Expo 빌드·스토어 심사 등 원자재가 달라 `docs/01-plan/features/firewatch.plan.md`의 범위 밖이다. 아래 APP 섹션은 Phase 2 착수 시점에 별도 Plan 문서로 옮겨질 예정이며, 그 전까지는 백로그로만 유지한다.

**Design 완료(2026-08-19)**: `docs/02-design/features/firewatch.design.md`, Option C(Pragmatic Balance) 채택. 아래 BE/WEB 과제 순서는 Design §11.3 Module Map과 1:1 대응하며, `/pdca do firewatch --scope module-N`으로 세션별 구현 가능.

## 열린 과제 — 백엔드(BE)

### BE-11. 관심 키워드 추천 + 핫이슈용 트렌드 키워드 API
**무엇** — 최근 수집된 관련 뉴스(`NewsArticle`, 브리핑 생성 시 이미 저장 중)에서 자주 등장하는 키워드를 추출해 반환하는 신규 API. 설정 화면의 "키워드 추천"과 대시보드 "핫이슈" 섹션(WEB-7)이 공유해서 쓸 데이터 소스.
**왜** — 사용자 요청(2026-08-31) — "설정에 관심 키워드 추천 기능", "매일 그날그날 핫이슈도 보이게". 사용자가 원하는 방식은 ① 최근 뉴스 기반 트렌드 키워드 제안(소셜/타 사용자 트렌드 아님 — 싱글유저 앱), ② 관심 키워드 기반 별도 핫이슈 섹션(기존 브리핑 딸림 뉴스와는 별개).
**완료 기준** — 신규 GET 엔드포인트가 최근 뉴스 기반 트렌드 키워드 목록(및 키워드별 관련 기사)을 반환. 감사로그 기록. 키워드 추출 방식(단순 빈도 집계 vs Gemini 활용)은 Design 단계에서 결정 — Gemini 활용 시 BE-3에서 이미 겪은 무료 티어 쿼터 제약([[Decisions/0011-gemini-no-grounding]]) 재확인 필요.

### BE-10. 한국국채 10년물 수익률 데이터 소스 확보
**무엇** — 한국 국고채 10년물 수익률(%)을 매일 브리핑 지표에 추가. **BE-9(완료, 종료 기록 참고) 후속.**
**왜** — 사용자가 "금,은,환율,국채,국장,미장 다 볼 수 있고"라고 요청(2026-08-23)했는데, Yahoo Finance 비공식 API(`/v1/finance/search`, `/v8/finance/chart/`)로 여러 티커·검색어(`KR10YT=RR`, `KR10Y.B`, `098U`, `^KR10Y`, "Korea 10Y" 등)를 실측했지만 실제 수익률(%) 시계열을 주는 소스가 없었음(ETF 상품 가격만 검색됨 — `365780.KS`/`289670.KS`) — [[log]] 2026-08-23.
**완료 기준** — 한국 국채(10년) 수익률이 브리핑에 실제 % 값으로 채워짐. 한국은행 ECOS Open API(가입·키 발급 필요) 등 대체 소스 조사부터 시작.

### BE-3. 스케줄러 + Gemini API 연동 (부분 완료)
**무엇** — `@Scheduled` 잡 + Gemini API(Google Search Grounding) 호출로 국내/미국 증시 요약·추천 종목 텍스트 생성(FR-01, FR-02). **BE-2 의존.**
**왜** — 시스템의 핵심 파이프라인.
**완료 기준** — 수동 트리거로 잡 실행 → Gemini 응답 텍스트 생성 → `audit_logs`에 SCHEDULER/GEMINI_API 이벤트 기록.
**진행 상황** — `SchedulerJob`·`GeminiBriefingService`·`GeminiClient` 구현 완료, 단위테스트(Mock) 통과. 코드 자체는 완성, **막힌 건 Google 쪽 무료 티어 모델 가용성**(2026-08-21 Google AI Studio 쿼터 화면 실측):
  - `gemini-3.7-flash`(최초 선택) — Gemini 3 계열(3/3.1/3.5/3.6/3.7 전부) 자체가 무료 티어에서 Search Grounding 일일 할당량 **0건**. 429는 "너무 많이 써서"가 아니라 애초에 0건 허용이라 항상 실패.
  - `gemini-2.5-flash`(1차 대체) — 이번엔 **404 Not Found**. 공식 단종은 2026년 10월인데 이미 조기 404 사례가 다수 보고됨(2.0 계열도 예정보다 일찍 6월에 완전 종료된 전례).
  - `gemini-3.5-flash`(2차 확인) — 사용자가 "Flash-Lite 계열은 할당량이 넉넉하다"는 일반 정보를 근거로 재확인 요청 → 실측 결과 **역시 429**. Search Grounding 도구의 무료 할당량은 세부 모델(Flash/Flash-Lite, 3.1/3.5/3.6/3.7)이 아니라 **"Gemini 3" 메이저 버전 단위로 묶여 0**이라, 계열 안에서 어떤 걸 골라도 결과는 같음 — "일부러 빡센 모델을 고른 것" 아님을 실측 3종(3.7/2.5/3.5)으로 확정.
  - **결론: 현재 무료 티어로 Search Grounding이 되는 Gemini 모델이 사실상 없음(추정이 아니라 3종 실측으로 확정)** — Google이 세대 전환 중 무료 그라운딩 자체를 걷어낸 것으로 보임. FALLBACK(금/은/환율만 정상 제공)으로 당분간 운영하기로 사용자와 합의, 모델명은 엔드포인트가 살아있는(404 아닌) `gemini-3.5-flash`로 고정(재검토 시 aistudio.google.com/rate-limit의 "도구 > 검색 그라운딩" 섹션에서 모델 계열별 RPD를 먼저 확인하되, 대시보드 표시와 실제가 다를 수 있어(2.5 사례) 반드시 실측 재확인).
  - **결제(빌링) 활성화는 옵션에서 완전히 제외**(사용자 확정, 2026-08-21) — [[Decisions/0003-mvp-scope-and-user-model]]의 월 $0 하드 제약을 그대로 유지. Gemini 그라운딩이 계속 막혀 있어도 결제로 우회하지 않는다 — 재검토는 Google이 무료 티어 정책을 바꾸거나 대체 무료 수단(다른 검색 그라운딩 제공자 등)이 생겼을 때만.
  - 이 조사 과정에서 **별개의 진짜 버그 2개**를 더 발견해 수정함 — 스케줄러 날짜가 컨테이너 기본(UTC) 타임존을 써서 매일 자동 실행마다 스킵될 뻔한 버그, 한국수출입은행 API가 08:00(영업일 11시 이전) 요청이라 항상 빈 응답이던 버그. 둘 다 재배포 후 프로덕션에서 왕복 확인 완료 — 자세한 내용은 [[log]] 2026-08-21.

## 열린 과제 — 웹(WEB)

### WEB-7. 설정 화면 키워드 추천 UI + 대시보드 핫이슈 섹션
**무엇** — 설정 `KeywordInput` 옆에 추천 키워드 후보를 태그로 노출(클릭 시 바로 추가), 대시보드에 관심 키워드 기반 "오늘의 핫이슈" 카드/리스트 신설. **BE-11 의존.**
**왜** — 사용자 요청(2026-08-31), BE-11과 세트.
**완료 기준** — 추천 키워드 클릭으로 관심 키워드에 추가됨. 대시보드에 그날 수신 시간 기준 핫이슈가 표시되고, 관심 키워드가 비어 있을 때의 빈 상태 처리도 됨.

### WEB-6. 웹 푸시(Web Push) 알림 배포 (코드 완료, 사용자의 Render 설정 + 실사용자 클릭 대기)
**무엇** — 앱 설치 없이 브라우저로 알림 받는 채널. **BE 무의존(자체 완결), 코드는 끝났고 배포·검증만 남음.**
**왜** — 모바일 APK 사이드로드가 Play Protect에 막혀 대안으로 도입(2026-08-24). `nl.martijndwars:web-push`로 VAPID 서명+RFC 8291 암호화, `UserSettings.web_push_subscriptions`(JSON 배열)에 구독 저장, `PushService`가 FCM과 독립적으로 발송. 설정 화면에 "브라우저 알림 켜기" 카드+`public/sw.js` 구현 완료.
**완료 기준** — 실제 브라우저에서 구독 → 브리핑 발송 시 알림 도착. **아직 미충족** — ① Render 대시보드에 `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` 입력 후 재배포(계정 행동, 세션이 대신 못 함), ② `web/.env`의 `VITE_VAPID_PUBLIC_KEY` 채워서 Cloudflare Pages 재배포, ③ 실제 사용자가 "브라우저 알림 켜기" 클릭 → 브라우저 네이티브 권한 팝업에서 "허용" — 이 마지막 클릭은 브라우저 자동화로 못 해(실측 확인, CDP eval로 직접 호출 시 사람 입력 대기하며 탭이 멈춤).

## 열린 과제 — 모바일(APP)

### APP-2. FCM 푸시 수신 핸들러 (코드 완료, 사용자의 EAS 연결 대기)
**무엇** — Expo Notifications로 디바이스 토큰 등록·FCM 수신(FR-03). **BE-5 의존, 코드는 끝났고 완료 기준만 미충족.**
**왜** — 모바일이 브리핑을 받는 유일한 경로. Design 단계에 없던 발견 2건으로 범위가 커짐 — ① `fcm_tokens` 컬럼은 있는데 등록 API가 없어 `PUT /api/settings`에 `fcmToken` 필드 추가(완료). ② 실기기 플랫폼을 "둘 다 열어두고 싶다"고 답해와, 기존 Firebase Admin SDK 직접 발송(iOS·Android 토큰 형식 차이로 react-native-firebase+커스텀 빌드가 필요해 Expo Go 원칙과 충돌)을 Expo Push Service(`exp.host`)로 전환(완료) — `FcmSender` 인터페이스 덕에 `PushService`는 무변경. 코드·`useNotificationRegistration` 훅·백엔드 `ExpoPushSender`까지 전부 구현·테스트 완료.
**완료 기준** — 테스트 발송이 실제 기기에 도착. **아직 미충족** — `getExpoPushTokenAsync()`가 EAS `projectId`(`app.json`의 `extra.eas.projectId`)를 필요로 하는데, 무료 Expo 계정으로 `mobile/`에서 `npx eas login && npx eas init`을 한 번 실행해야 채워짐(계정 행동이라 세션이 대신 못 함, `mobile/README.md`에 절차 기록). 연결 전엔 앱이 콘솔 경고만 남기고 조용히 토큰 등록을 건너뜀(크래시 아님).

### APP-3. 모바일 브리핑 UI (코드 완료, 사용자의 실기기 검증 대기)
**무엇** — 알림 터치 시 바텀시트로 상세 브리핑 카드가 올라오는 UI([[design]] §5). **BE-6 의존, 코드는 끝났고 완료 기준만 미충족.**
**왜** — 모바일에서의 핵심 소비 경험. `useLatestBriefing` 훅(조회 실패 시 AsyncStorage 캐시 폴백)+`BriefingScreen`(요약 카드·추천종목 칩)+`BriefingSheet`(`@gorhom/bottom-sheet`, 알림 탭 시 `useLastNotificationResponse`로 자동 오픈) 구현 완료. `@gorhom/bottom-sheet` v5가 RN 0.86/reanimated 4와 호환되는지 `npm info`로 먼저 확인 후 설치(Design이 "Do 단계에서 확인 후 확정"으로 미뤄뒀던 부분).
**완료 기준** — 알림 → 상세 화면 전환이 매끄럽고, 오프라인에서도 마지막 브리핑이 보임. **아직 미충족** — APP-2와 마찬가지로 EAS 프로젝트 연결(`npx eas init`)과 실기기 검증이 필요(세션이 대신 못 함).

### APP-4. 설정 화면(모바일) (코드 완료, 사용자의 실기기 검증 대기)
**무엇** — 관심 키워드·수신 시간 설정 UI. **BE-7 의존, 코드는 끝났고 완료 기준만 미충족.**
**왜** — WEB-4와 동일 기능의 모바일 대응. `@react-native-community/datetimepicker`로 수신 시간, 웹의 `KeywordInput`과 동일 동작(추가/삭제, 최대 20개)의 RN 버전으로 관심 키워드 — 관심 종목은 이 화면에서 안 건드리고 그대로 넘김(web과 동일 원칙). 구현 중 이 SDK의 React Compiler 린트(`react-hooks/set-state-in-effect`)가 "서버 값을 로컬 편집 상태로 동기화"하는 정당한 effect 패턴(web에 이미 문서화된 것과 동일)을 에러로 잡아, `eslint-disable-next-line`으로 명시 처리.
**완료 기준** — WEB-4와 동일 API로 왕복, 값이 양쪽에서 일치. **아직 미충족** — APP-2/APP-3와 마찬가지로 EAS 프로젝트 연결과 실기기 검증이 필요(세션이 대신 못 함). **이걸로 Phase 2(APP-1~4) 코드는 전부 완료 — 남은 건 실기기 검증 하나뿐.**

## 종료 기록

| # | 과제 | 결과 | 정본·근거 |
|---|---|---|---|
| APP-1 | 모바일 프로젝트 스캐폴딩 | 완료. `npx create-expo-app`(SDK 57 기본 템플릿)으로 `mobile/` 생성 후 데모 콘텐츠 전부 제거, NativeWind v4(babel/metro/tailwind config) 설치. 라우터 루트가 `mobile/app/`이 아니라 `mobile/src/app/`인 건 이 SDK 버전 템플릿의 최신 관례라 Design 문서 경로에서 소폭 벗어남(계층 분리 의도는 동일). `tsc --noEmit`·`expo lint`·`expo export --platform web`(정적 라우트 `/`·`/settings` 정상 생성) 통과. 실기기 Expo Go 검증은 사용자가 `npx expo start`로 직접 진행 필요 | `mobile/`, `docs/02-design/features/mobile-app.design.md` (2026-08-23 [[log]]) |
| BE-9 | 국내외 지수 + 미국채 수익률 브리핑 지표 추가 | 완료. 사용자가 리스킨 직후 "금,은,환율,국채,국장,미장 다 볼 수 있고 AI가 관련 뉴스보고 추천하는걸 원했음"이라고 지적 — 실제로 백엔드엔 금/은/환율 3종만 있고 지수·채권은 아예 미구현이었음. Yahoo Finance로 코스피(`^KS11`)·코스닥(`^KQ11`)·S&P500(`^GSPC`)·나스닥(`^IXIC`)·다우(`^DJI`)·미국채10년물(`^TNX`) 6종 실측 확인 후 `FinancialApiClient.fetchMarketIndices()` 신설, `FinancialSnapshot`→`GeminiClient`(프롬프트에 [오늘의 지수·채권] 섹션 추가)→`Briefing` 엔티티→DB 스키마(`ALTER TABLE ADD COLUMN IF NOT EXISTS`)→`BriefingResponse`까지 전체 파이프라인 관통. 웹 대시보드에 "국내외 지수 · 채권" 구분 라벨로 새 Row(MetricStat 6개) 추가, `RateChart` 지표 선택에도 6종 추가. 한국국채10년물은 Yahoo에 수익률 데이터가 없어 제외(→BE-10). `./gradlew build`/`test`, `npm run build` 전체 통과 | `backend/.../client/FinancialApiClient.kt`, `web/src/features/dashboard/DashboardPage.tsx` (2026-08-23 [[log]]) |
| BE-1 | 백엔드 프로젝트 스캐폴딩 | 완료. Spring Initializr로 Kotlin+Spring Boot 4.1.0(+Boot 3.2 대신 채택, [[Decisions/0005-spring-boot-4]])+WebFlux+JPA+H2+Validation 생성, gradle wrapper 포함. `./gradlew build` 통과, `java -jar`로 기동 확인(Netty on port) | `backend/build.gradle.kts`, [[Decisions/0005-spring-boot-4]] (2026-08-19 [[log]]) |
| BE-2 | 감사로그 AOP 인프라 | 완료. `AuditLogAspect`가 `service` 패키지 전체를 포인트컷으로 자동 감사(옵트아웃). SUCCESS/WARNING(임계값 초과)/FALLBACK(`AuditContext.markFallback`)/FAILURE(예외) 4개 상태 전부 단위테스트로 재현·확인(`AuditLogAspectTest`, 4 tests pass). response_summary는 반환값 요약(예: FCM 발송 건수)이 자동으로 남음 | `backend/.../audit/AuditLogAspect.kt`, `docs/02-design/features/firewatch.design.md` §2.0 (2026-08-19 [[log]]) |
| BE-4 | 금융 API 연동 + FALLBACK 처리 | 완료. `FinancialApiClient`(한국수출입은행 exchangeJSON + Yahoo Finance 비공식 v8 chart) + `FinancialDataService`. 실측 확인: 수출입은행 위안화 cur_unit은 "CNY"가 아니라 **"CNH"**, Yahoo는 User-Agent 없으면 429. FALLBACK 범위는 "Gemini 실패 시만" 적용, 금융 API 단독 실패는 NORMAL+null 필드로 처리 — [[Decisions/0006-fallback-scope]]. `SchedulerJobTest` 4개 시나리오(둘 다 성공/Gemini만 실패/금융만 실패/둘 다 실패)로 검증. **실제 EXIM_API_KEY/Yahoo 라이브 호출 확인함(2026-08-20, Render 프로덕션)** — 금/은/환율(USD·JPY·CNY) 전부 실제 값으로 채워짐 | `backend/.../client/FinancialApiClient.kt`, [[Decisions/0006-fallback-scope]] (2026-08-19 [[log]]) |
| BE-8 | Render 배포 | 완료. Oracle Cloud 가입이 막혀 Render(무료, 카드 불필요) + GitHub Actions 예약 워크플로(매일 08:00 KST에 `/api/scheduler/trigger` 호출해 깨움)로 전환 — [[Decisions/0008-deployment-render-github-actions]]. `backend/Dockerfile`(멀티스테이지)·`render.yaml`(Blueprint)·`.github/workflows/daily-trigger.yml` 작성. GitHub Actions 시크릿(`SETTINGS_API_KEY`·`RENDER_BACKEND_URL`) 등록. 로컬 Docker 빌드 검증 중 C: 드라이브가 100% 차 Docker Desktop이 응답 없어져(사용자가 정리) 로컬 검증은 보류, Render 서버 측 빌드로 대신 검증. Render Blueprint 배포 자체(계정 생성·GitHub 연동·API 키 3종 입력)는 카드 미등록 등 사용자만 할 수 있는 단계라 사용자가 브라우저에서 직접 진행, 브라우저 자동화로 동행. 배포 URL `https://firewatch-backend-q3cv.onrender.com` — `curl`로 `/api/settings` 200 확인, **`/api/scheduler/trigger` 수동 트리거로 실제 브리핑 1건 생성 확인**(금/은/환율 실데이터, Gemini는 무료 티어 레이트리밋으로 FALLBACK — BE-3 참고), GitHub Actions 워크플로 수동 실행도 12초 만에 성공(`gh run list`로 확인). **후속: 배포 직후 H2 파일 DB가 슬립→재기동 한 번만으로 통째로 비어버리는 걸 실제로 발견해 Supabase Postgres로 전환**([[Decisions/0009-persistent-db-supabase]]) — Supabase Table Editor에서 실제 데이터 적재까지 확인 | `backend/Dockerfile`, `render.yaml`, `.github/workflows/daily-trigger.yml`, `DEPLOY.md`, [[Decisions/0008-deployment-render-github-actions]], [[Decisions/0009-persistent-db-supabase]] (2026-08-20 [[log]]) |
| WEB-5 | Cloudflare Pages 배포 | 완료. `https://firewatch-eqp.pages.dev`("firewatch" 이름 충돌로 "-eqp" 접미사 자동 부여)에 배포. Cloudflare 대시보드가 2026-08 기준 대개편(Pages가 "Workers & Pages"로 흡수, Compute 하위 메뉴로 이동)되어 있었고 기본 Account API 토큰엔 Pages 편집 권한이 없어 `Pages:Edit` 권한을 추가한 새 토큰을 발급해야 배포됨(`DEPLOY.md` 3번). BE-8 완료 후 `web/.env`의 `VITE_API_BASE_URL`을 실제 Render URL로 바꿔 재빌드+재배포, `render.yaml`의 `FIREWATCH_ALLOWED_ORIGINS`도 실제 Pages URL로 맞춤. **브라우저로 실제 왕복 확인** — 대시보드가 뜨고 `/api/briefings/latest`·`/api/briefings?from&to` 정상 호출(CORS 문제 없음, 데이터 없을 때의 빈 상태 UI도 정상 렌더) | `web/.env`, `render.yaml`, [[Decisions/0007-web-stack-and-cors]] (2026-08-20 [[log]]) |
| WEB-1 | 웹 프로젝트 스캐폴딩 | 완료. Vite로 생성 시 기본값이 React 19+antd 6이라 명세서·Design 문서(darkAlgorithm)에 맞춰 **React 18 / antd v5로 명시 고정**([[Decisions/0007-web-stack-and-cors]]). `AppShell`(Header+Nav+다크토글) + react-router 3라우트. 브라우저로 다크모드 토글까지 실제 확인 | `web/src/components/AppShell.tsx`, [[Decisions/0007-web-stack-and-cors]] (2026-08-19 [[log]]) |
| WEB-2 | 실시간 지표 대시보드 | 완료. `MetricStat`(Framer Motion 틱 애니메이션, 한국 증시 관례대로 상승=빨강/하락=파랑), `RateChart`(Recharts, 지표 선택+7/30일 토글), `BriefingSummaryCard`(FALLBACK 배지·스켈레톤). H2에 직접 시드한 실데이터로 브라우저 확인(카드·차트·상승 화살표 전부 정상 렌더) | `web/src/features/dashboard/` (2026-08-19 [[log]]) |
| WEB-3 | 감사로그 뷰어 | 완료. `AuditLogPage` — event_type/status/날짜 필터, FAILURE 행 배경 강조(`.audit-row-failure`), 상태별 색상 태그. 브라우저에서 실제 감사로그 6건(우리가 만든 USER_SETTING 포함) 렌더 확인 | `web/src/features/audit-log/` (2026-08-19 [[log]]) |
| WEB-4 | 설정 화면 | 완료. `SettingsPage` — TimePicker, `KeywordInput`(태그 추가/삭제, 최대 20개), 저장 시 `X-API-Key` 포함 PUT 호출, 401/성공 메시지 처리. **브라우저로 실제 저장→백엔드 반영→감사로그(USER_SETTING) 기록까지 왕복 확인**(curl로 재검증) | `web/src/features/settings/`, [[Decisions/0004-write-api-protection]] (2026-08-19 [[log]]) |
| BE-6 | 브리핑 이력 저장 API | 완료. `BriefingController`(`GET /latest`, `GET ?from=&to=`). 함께 `AuditLogController`(`GET /api/audit-logs`, 원래 Next-Tasks에 독립 항목이 없었는데 Design §4.1이 요구해 이번에 같이 구현 — WEB-3의 전제조건)와 `SchedulerController`(`POST /api/scheduler/trigger`, 디버그용 수동 실행)도 이 모듈에서 함께 만듦. `ApiIntegrationTest`(WebTestClient, 실제 내장 서버 기동)로 확인 | `backend/.../web/BriefingController.kt` (2026-08-19 [[log]]) |
| BE-7 | 사용자 설정 API | 완료. `SettingsController` + `SettingsService`(USER_SETTING 이벤트). API 키 검증을 컨트롤러가 아니라 **Service 메서드 안에서** 해 인증 실패도 감사로그에 남게 함([[Decisions/0004-write-api-protection]]). `ApiIntegrationTest`로 401/200/400(fieldErrors) 전부 확인, 실제 서버 기동해 curl로도 재확인 | `backend/.../service/SettingsService.kt` (2026-08-19 [[log]]) |
| BE-5 | FCM 푸시 발송 서비스 | 완료. `FirebaseFcmSender`(Firebase Admin SDK `sendEachForMulticast`) + `PushService`, 무효 토큰(`MessagingErrorCode.UNREGISTERED`) 자동 정제해 `user_settings.fcm_tokens`에서 제거. `PushSendResult(tokenCount, successCount)`를 반환해 감사로그 response_summary에 발송 통계가 그대로 남음(FR-07 요건). `PushServiceTest` 3개 시나리오 통과. **Phase 1엔 등록 토큰이 없는 게 정상**(모바일 앱은 Phase 2) — 실기기 발송은 Phase 2에서 검증 | `backend/.../service/PushService.kt` (2026-08-19 [[log]]) |
