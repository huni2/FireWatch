# FireWatch — 다음 과제

최신 점검: **2026-10-09**. 코드·배포·CI·사용자 확인을 대조해 완료된 개발 과제를 종료 기록으로 옮겼다. **구현 완료와 실기기 확인은 구분**하며 이관된 확인 항목은 아래 APP-21/BE-30/WEB-19에 남긴다. 과제 번호는 재사용하지 않는다.

> **형식 계약**: 열린 과제만 `### BE-N. 제목` / `### WEB-N. 제목` / `### APP-N. 제목`을 쓴다. 완료·이관 기록에는 이 접두사 제목을 쓰지 않는다.

## 상태 요약

| 상태 | 범위 |
|---|---|
| 개발·배포 완료 | 기본 포트폴리오/계정/기업 탐색/뉴스/수집 제어/운영 권한/가상게임/웹 공지·문의. 기존 종료 기록 참조 |
| 이번 목록 정리로 종료 | BE-12/18/19/20/23/24/25/27, WEB-17/26. BE-23/25/27의 운영 확인 후속은 BE-30에 분리 |
| 구현 완료·설치 확인 이관 | APP-2/3/4/6/11/12/20/22/23/24/25 → APP-21. 설치 성공으로 표시한 것이 아님 |
| 계속 개발/점검 | BE-28 게임 기업 확대, BE-22 검색 확대, BE-21 출시 범위/운영 정책 |
| 운영/사용자 확인 | BE-30 수집 복구·운영자 실수신, WEB-19 실제 세션 권한·로그아웃, WEB-38 첫 이용자·접근성 실사용, APP-21 Android 설치·제출, BE-17 선택형 이전 |
| 비필수 보류 | 모바일 선택형 다크 모드. 기본 라이트 요구 구현은 완료 |

최신 게임 상세 클라이언트 소스 `5f77550`·PR#18 main313696e의 CI37888258358/37888266815/main37888674589 전체 성공·Cloudflare83abd689 공개4폭 검증을 확인했다. WEB-40/APP-32는 종료했다. CI는 실제 제공처 수집 성공·휴대폰 알림 수신·운영 게임 지연 측정을 대체하지 않는다.

## 열린 과제 — 백엔드(BE)

### BE-17. 기존 소유자 기록의 선택형 이전 확인
**구현 완료** — 클라이언트 고정 신원 시드 제거·서버 공개 legacy 신원 차단·운영자 인증 기반 1회 이전 경로 구현/배포. 기존 데이터는 보존한다.
**남은 일** — 사용자가 기존 기록을 새 기기에 이전할 필요가 있는지 결정하고 필요할 때 실제 사용 브라우저에서 수행/확인한다. 자동 이전하지 않는다.
**완료 기준** — 사용자의 이전 수행·보존 확인 또는 이전 불필요 결정 기록. 신규 사용자 노출 차단을 미구현으로 표시하지 않는다.

### BE-21. 출시 전 투자 정보 범위·데이터 운영 정책 정리
**처리 대조 완료(2026-10-09)** — Issue#13 종료·PR#14 main4fe4d6e·Cloudflaredeb8ae64. docs/product/privacy-deletion-review/data-processing.md에 실제 수집/삭제/외부 전달과 누락 정정을 기록했다. WEB-39/APP-31 개발 종료, 실제 운영 이행/법률 검토는 남는다.
**구현 완료** — 포트폴리오 저장/이력/버전 충돌, 집중·분야/통화·ETF 지수명 중복 분석, 계정 세션·관리 권한·수집 lease·실패 기록·최소 상품 카탈로그. 전체 및 PostgreSQL CI 통과·운영 배포.
**진행(2026-10-08)** — docs/product/release-scope.md로 현재 출시 범위·수집 시각/확정 종가 구분을 정리하고 docs/deployment/data-preservation.md에 보관·무료 백업·복구 절차를 작성했다. 별도 PostgreSQL DB 복원/행 서명 대조를 CI에 추가했다. 실제 운영 백업 확보·법률/개인정보 처리 대조는 미확인.
**남은 일** — 개인별 구성 초안 제공의 출시 적법성 검토, 계정 연관 기기 게임/익명 기록의 삭제 요청 절차·처리기간, 감사로그/백업 보관기간·삭제 이행, 국외 처리 계약/국가 및 Data Safety 대조, 실제 운영 백업 확보와 복구 전환 확인. CI37704342437의 실제 PostgreSQL 별도 복원·행 서명/시퀀스 대조 성공은 확인했다. 운영 백업과 전환은 별도다.
**완료 기준** — 필수 출시 범위와 보류 기능을 명시하고 개인정보/투자 이용안내와 실제 처리를 대조. 정책/복구 절차 검증. 실제 외부 수집 복구는 BE-30, Android 설치 확인은 APP-21.
**근거** — docs/product/portfolio-mvp.md, docs/product/investment-information-boundary.md, docs/reviews/2026-10-07-release-hardening.md.

### BE-22. 종목·ETF 카탈로그 확대와 PostgreSQL 검색 검증
**구현 완료** — 기업26/ETF5 시작 목록의 영속 카탈로그·별칭/지수/종류/국가/분야 필터, 저장 시세/기준 시각, 최대50결과, 미등재 외부 검색, 웹/모바일 연결. CI·운영 확인 완료.
**진행(2026-10-08)** — 페이지 범위/안정 정렬/hasMore를 구현하고 합성3,000종목·한 글자 한국어·분야·정확 일치·페이지 경계 검사를 추가했다. PostgreSQL에서 같은 규모 검사와 실행 계획 수집이 CI37704342437에서 통과했다. 로컬 H2의 합성3,000건/6검색99ms는 운영 지연 측정이 아니다. BE-32로 시작 목록이 기업26·ETF5로 확대됐다. 전체 시장 수입은 아직 완료되지 않았다.
**남은 일** — 전체 카탈로그 출처/갱신/별칭 정책과 수입, 실제 자료 규모의 유사 검색/pg_trgm·DB 용량/요청 예산 검증.
**완료 기준** — 필요한 검색 확대를 구현·측정하거나 출시 필수 범위에서 명시적으로 보류한다. OpenSearch는 사용자 결정으로 계속 보류.
**근거** — docs/product/catalog-data.md. 기존 '아직 구현하지 않았다' 표기는 시작 목록 검색 구현 완료로 정정한다.

### BE-28. 실제 기업명 기반 게임 종목 확대와 필요한 데이터만 조회
**구현 완료** — 그래프 누적 계산 최적화와 5시드·모든 턴 가격 회귀. 로컬13자산 그래프 구성 약4배 개선이며 운영 턴 응답 측정이 아님.
**진행(2026-10-09)** — BE-33의 저장 규칙 버전1·기존 결과 보존·미지원 변경 차단을 PR#8로 머지했다. 서버 전체/H2·PostgreSQL/복원·웹/앱 CI 성공. Render 운영 반영은 확인 전이다.
**진행 추가** — 출시 전 단일26기업 게임·단일 순위의 BE-34/WEB-37/APP-30은 PR#10 main1ebb59a·Cloudflare941ff8a5·전체 CI 성공으로 구현 종료했다. 시험 기록은 보관한다.
**남은 일** — BE-36 계측 소스를 Render에 배포하고 FIREWATCH_GAME_TIMING_ENABLED=true 적용 후 게임 행동별 서버 로그와 HTTP 시간을 대조한다. DB 왕복·잠금·첫 시작 원인 자료에 따라 최적화한다. 실제26기업/픽 주문/24턴과 HTTP 관측은 완료했다. 전 시장 출처/갱신·수입/서버 페이지 탐색은 BE-22의 전체 카탈로그 후속에 연결한다. 출시 후 시즌은 추후다.
**진행 추가** — BE-35 소스ae38501·PR#16 maina954514·Issue#15 종료·전체 CI 성공. 기본 전체 응답을 보존한 compact 최대2점과 세션/턴/자산 상세 GET 구현. HTTP 시험49,397B→23,006B·단일975B는 운영 지연이 아니다. WEB-40/APP-32에서 클라이언트 연결을 완료했다.
**진행 추가** — WEB-40/APP-32·Issue#17 종료·PR#18 main313696e·소스5f77550·CI37888258358/37888266815 전체 성공·Cloudflare83abd689. Render 새 상세 경로의 기기별404로 API 반영 확인. 공개4폭 요약/전체 그래프·실패/재시도/캐시/이전 응답 차단/새 턴/주문 보존과 기업/픽/매수 회귀 성공. 모바일 타입/lint·오프라인 Android export 성공, 실제 설치는 APP-21.
**진행 추가(운영 실측 완료)** — Issue#19 종료·소스d80b3e2·PR#20 main1f818ea·CI37890731426/37890763678/main37891156616 전체 성공·격리 세션28 한 판·43요청 PASS. 실제26기업/출처/가상 픽·매수/매도/멱등·24턴 평가/원장·compact/전체·상세/미래400/타기기404·종료 보존 확인. 다음 턴23회 중앙값1,293ms, 첫 시작13,960.8ms. 현재compact/전체 각5회791.6/801.2ms·본문23,425/49,815B. HTTP 관측은 DB 실행 시간을 대체하지 않는다. docs/product/game-live-verification/result.md 참조. 운영 시험 게임은 ENDED로 보관했고 순위 요청/기존 사용자 변경/EAS0.
**계측 개발 완료** — BE-36 소스7cb6865·PR#22 maind980cc7·Issue#21 종료·CI37892862048/37892900448/main37893278103(재실행2) 전체 성공. 기본 꺼짐 게임 큐/서버/Hibernate 연결·준비·SQL/횟수/uptime을 비식별 서버 로그로 기록한다. 실제 H2/전용 PostgreSQL 이벤트와 전체190검사·스레드/예외 정리 검증. 사용자가 Render 배포 완료를 확인했고 재배포 후 격리 세션29/43요청은 PASS했다. 첫 시작23,799.7ms·다음 턴23회 중앙값1,388.6ms. 계측 플래그 활성·서버 로그4줄 요청은 응답 대기이며 원인/속도 개선은 확정하지 않는다. docs/product/game-server-timing/operations.md 참조.
**완료 기준** — 기업 출처/갱신·가상 자료 구분, 기존 세션 호환, 분야/검색/픽/직접 매수와 필요한 그래프 조회, 성능 측정.
**근거** — docs/product/game-universe-performance.md.

### BE-30. 금융 수집 실제 복구와 운영자 장애 푸시 확인
**구현 완료** — BE-23/25/27의 수집 기록·제한 재시도·outbox·운영 권한·예약 운영 키 적용. 일반/운영 역할 통합 검사 및 익명 운영 API 거절 확인.
**진행(2026-10-08)** — 지수/금속 묶음의 단일 실패로 정상값을 버리던 문제와 선택 국채 실패 전파를 수정했다. 누락 지표를 안전한 감사 코드로 남기고 전부 빈/0값을 성공으로 처리하지 않는다. KST 조회일·ECOS 최신 날짜 선택·환율 HTTP 오류의 키/URL 비노출을 보강했다. 로컬 제공처 회귀 통과·9991091 서버 page 경계 반영 확인. 공개 당일 브리핑 금융12필드 존재 확인은 별도 수집 작업 성공 증거와 구분. 실제 운영 장애 해소/수신은 별도.
**남은 일** — 새 서버 배포 뒤 실제 정상 수집/복구 확인, 운영자 등록과 기기 알림 실수신 확인, 운영 일반 계정403 실세션 점검.
**완료 기준** — 정상 관측/수집 작업/감사로그를 대조하고 장애 해결 상태 확인, 실제 기기 수신 기록. 제공처 발송 수락·triggered:true·진단 숨김을 복구로 처리하지 않는다. 기록 삭제나 재시도 한도 우회 없음.
**근거** — docs/deployment/operator-access.md, CollectionJobRunnerIntegrationTest, CollectionAlertAccessIntegrationTest. 기존 BE-23/25/27의 미확인 운영 항목을 이관했다.

## 열린 과제 — 웹(WEB)

### WEB-19. 실제 로그인 세션의 운영 권한·로그아웃 최종 확인
**구현·배포 완료** — GIS 공식 버튼·세션·연결 기기 관리·운영자 메뉴/서버 인증. 사용자가 웹 실제 Google 로그인 성공 확인. 일반/운영/만료/충돌/SDK/로그아웃 실패 fixture 검증 완료.
**남은 일** — 실제 운영자 세션의 감사로그 접근과 실제 일반 계정 제한, 로그아웃/재로그인 후 계정 기록 보존을 사용자 기기에서 확인.
**완료 기준** — 실제 계정 확인 결과 기록. Android 로그인은 APP-21. 웹 로그인 자체가 없거나 OAuth ID 등록 전이라고 표시하지 않는다.
**근거** — docs/deployment/google-web-login.md, AccountSessionIntegrationTest, 2026-10-07 사용자 로그인 성공 확인.

### WEB-38. 실제 첫 이용자 관찰과 접근성 실사용 확인
**운영 확인** — WEB-30에서 이관. 처음 등록→집중/중복 발견→회사/근거 뉴스 확인을 처음 쓰는 사람에게 수행하게 하고 막힌 단계와 발견까지 걸린 시간을 기록한다. 실제 브라우저 확대 설정·스크린리더의 읽기 순서/폼/키보드를 확인한다.
**완료 기준** — 관찰 기록과 발견한 문제의 수정/재확인. 자동 fixture·CSS 텍스트 확대 성공을 실제 사용자 만족도나 스크린리더 검증으로 대체하지 않는다.
**근거** — docs/product/web30-support-design/context-notes.md. Android 실기기 접근성은 APP-21이다.

## 열린 과제 — 모바일(APP)

### APP-21. 최신 Android 설치·실수신·출시 제출 검증
**사용자 결정(2026-10-09)** — APK 빌드·배포는 과제와 디자인 후속조치 모두 완료 후 진행한다. 그전 EAS 추가 요청·사용자 대상 APK 배포는 보류하고 코드/화면 검증을 진행한다. 이미 접수된 versionCode5를 다시 빌드하지 않는다.
**구현·설정 완료** — Android OAuth ID·운영 API·Firebase 파일·EAS 프로젝트/preview/production 설정 연결. 사용자 FCM V1 등록 확인. 출시 검사·타입/lint·Android export·CI 통과.
**진행(2026-10-08)** — 소스9991091·versionCode2의 bf7a706a FINISHED/APK 생성 확인. 이후 마스코트 로비·설명 하단 메뉴·짧은 버튼을 구현해 타입/lint·Android export 성공. Free 사용2/30·비용0 확인 후 소스3855eac·versionCode3의 preview fb0c49b4-39da-4e0a-9b67-328dfa4a8f95 빌드 접수. https://expo.dev/accounts/huni2/projects/mobile/builds/fb0c49b4-39da-4e0a-9b67-328dfa4a8f95
**남은 일** — 새 APK 완료/설치, Google 서명 SHA-1과 실제 로그인 왕복, 아래 통합 체크리스트, production AAB 테스트 트랙·실제 target SDK·Play 제출 양식 대조.
**최신 설치본** — 개별 버튼·공통 메뉴 수정은 이전 versionCode3에 포함되지 않는다. Free 사용3/30·비용0 확인 후6cedd8e/versionCode4의 preview3c4b54ea-4233-49ff-af39-feefd05c85f1 접수. https://expo.dev/accounts/huni2/projects/mobile/builds/3c4b54ea-4233-49ff-af39-feefd05c85f1
**추가 UI** — 전용 FireWatch 메뉴 SVG는 웹/앱 공유 원본으로 구현하고 앱 타입/lint·Android export를 확인했다. 기존6cedd8e/versionCode4 APK에는 포함되지 않아 새 빌드·설치/TalkBack 확인이 필요하다. 앱 구현 APP-26/27/28과 실제 설치를 구분한다.
**마지막 상태(2026-10-09)** — versionCode4·소스6cedd8e의 FINISHED/APK 생성 확인. 최신 아이콘·자산 등록을 포함할 versionCode5를 준비한다. EAS Free4/30·비용0 확인. 실제 설치 확인은 미완료다. docs/product/android-preview-20261009/checklist.md 참조.
**최신 접수** — 소스7594daa/versionCode5·preview fefb17ae-ce86-417f-9016-c9230010c1b3 업로드 완료. 타입/lint·출시 검사8개·Android export 통과. https://expo.dev/accounts/huni2/projects/mobile/builds/fefb17ae-ce86-417f-9016-c9230010c1b3 . 공식 무료 한도는 월 Android15회+iOS15회이며 총 BUILDS30 조회와 구분한다. APK 완료/설치는 미확인이다.
**빌드 주의** — 과거 cde6e85의 preview3a953867은 현재 소스가 아니며 설치 검증 완료로 사용할 수 없다. 2026-10-08 EAS 조회에서 과거 preview3a953867의 FINISHED·APK 생성 확인. 소스 cde6e85라 최신 설치 확인을 대신하지 않는다.
**완료 기준** — 설치 기기에서 아래 항목을 확인·기록하고 AAB/테스트 트랙 검증. JS 번들·설정 검사 성공만으로 종료하지 않는다.

| 이전 과제 | 코드 상태 | 남은 실제 설치 확인 |
|---|---|---|
| APP-2 | 푸시 등록/수신 구현 완료, EAS/Firebase 연결 완료 | 실제 수신·알림 탭 이동·기기 해제 |
| APP-3 | 브리핑 화면·캐시/오프라인 처리 구현 완료 | 알림 → 상세·오프라인 화면 |
| APP-4 | 관심/수신 설정 저장 구현 완료 | 저장 후 재실행 복원·KST 표시 |
| APP-6 | Google 계정 연결·세션 구현 완료 | 로그인 성공/취소/실패·계정 기록 |
| APP-11 | 동의 화면·동의 전 등록 차단 구현 완료 | 첫 실행·재실행·정책 링크·삭제 |
| APP-12 | 저장 실패 시 목록/선택 롤백·Toast 구현 완료 | 실제 실패 시 복원/안내 |
| APP-14 | 기본 라이트·주요 화면 개편 구현 완료 | 키보드·폰트 확대·시트·라이트 대비 |
| APP-20 | 문의/공지·초기 모달·오늘 숨김 구현 완료 | 접수·본인 조회·재진입/KST 숨김 |
| APP-22 | 선택 등록/순위/우승자/철회 구현 완료 | 로그인·동의·등록/거절·철회 |
| APP-23 | 관심 기업/내 보유/뉴스 연결 구현 완료 | 탭 이동·새로고침·추천 근거 상태 |
| APP-24 | 주문 초기화·보조 버튼 정리 구현 완료 | 입력만 초기화·체결 장부 보존 |
| 게임·공통 메뉴 | 장식 마스코트·개별 순위/규칙·짧은 버튼·4개 주요 탭/보조 탭 구현 완료 | 새 설치본 터치·폰트 확대·거래/종료·관련 종목/뉴스 및 푸시 탭 이동. versionCode3 이전 소스에는 이번 분리가 없음 |
| APP-25 | 수집 진단 직접 펼침 구현 완료 | 초기 비노출·직접 펼침/접기 |

**스토어 게시 후** — Play 평가 링크 연결은 실제 게시 뒤 수행한다. 앱 내 별점 팝업 추가만으로 출시 준비 완료 처리하지 않는다.
**근거** — mobile/PLAY_STORE.md, docs/deployment/android-release-check.md. 위 기능의 구현 과제는 종료 기록으로 이관하되 실기기 완료는 주장하지 않는다.

## 비필수 보류

- 모바일 선택형 다크 모드: 기본 라이트 요구는 구현 완료. 선택형 다크 전환/저장은 미구현이며 필요 시 별도 과제로 등록.

## 종료 기록

| 과제 | 작업 | 완료 근거 |
|---|---|---|
| WEB-40 | 게임 compact 응답·선택 그래프 | PR#18 main313696e·Issue#17 종료·CI37888258358/37888266815 전체 성공·Cloudflare83abd689. 공개4폭 실패/재시도·캐시·이전 응답 차단·새 턴/응답 식별·주문 보존, 기업/픽/직접 매수 회귀 성공. 운영 쓰기0. |
| APP-32 | 게임 compact·별도 상세 조회 | 타입/lint·오프라인 Android 로컬export·CI 성공. 로딩/재시도·32개 캐시·닫힘/턴/종목 변경의 이전 응답 차단·공유 응답 식별. 실제 설치APP-21·APK0. |
| BE-36 | 옵션형 게임 서버·JDBC 계측 | 소스7cb6865·PR#22 maind980cc7·Issue#21 종료·CI37892862048/37892900448/main37893278103(재실행2) 전체 성공. 로컬190검사 실패0·기존 제외1, 실제 H2/전용 PostgreSQL 이벤트·비활성/예외/스레드 격리·비식별 로그. 기본false, 운영 배포/플래그/로그 대조·원인 기반 최적화는 BE-28에 유지. APK0. |
| BE-35 | 선택형 compact 턴과 상세 그래프 API | 소스ae38501·PR#16 maina954514·Issue#15 종료·CI37881821700/37881830823 전체 성공. 로컬185검사 실패0·기존 제외1, 고정 출력·H2 HTTP/소유/턴/자산/종료/이전 규칙 보존. Render 확인·웹/앱 연결/운영 측정은 BE-28, APK0. |
| WEB-39 | 웹 계정 삭제와 공개 요청 경로 | Issue#13 종료·PR#14 main4fe4d6e·전체 CI 성공·Cloudflaredeb8ae64. 공개4폭 취소/실패/재시도/성공과 계정6시나리오·웹 build/lint 검증. H2 API 삭제/타계정 보존 검사, 운영 삭제0. |
| APP-31 | 계정 삭제 안내의 실제 범위 | FireWatch/Google 계정 구분·공유 자료 삭제와 별도 기기 게임/로그/백업 처리 안내. 타입/lint·CI 성공, 실제 설치는 APP-21·APK 빌드0. |
| WEB-30 | 첫 이용 흐름·접근성 및 보조 화면 마무리 | Issue#11 종료·PR#12 main5b17f9d·CI37875515100/37875544652 전체 성공·Cloudflare24b19ca7. 계정/설정/공지 밀도·공개24화면/선택 텍스트 확대6화면·설정 실패4폭·계정6시나리오·로컬 첫 등록→발견→기업/뉴스 재검증 성공. 실제 이용자/실제 확대/스크린리더는 WEB-38로 이관. 운영 쓰기0·EAS0. |
| BE-34 | 출시 전 단일 게임의 실제 기업 시작 목록 | 구현 종료. PR#10 main1ebb59a·전체/H2·PostgreSQL·복원 CI 성공, 웹 배포·4폭 fixture 성공. 실제 Render 반영은 확인하지 않았으며 BE-28에 이관. Issue#9 종료. |
| WEB-37 | 게임 기업 검색·분야·간결한 목록 | PR#10 main1ebb59a·전체 CI 성공·Cloudflare941ff8a5 배포. 공개1366/1024/390/360px의 검색/별칭/분야/페이지/상세 출처·직접 매수/픽 주문·버튼 표시/넘침0 검증. API fixture이며 운영 쓰기0, 서버 반영 확인은 BE-34. |
| APP-30 | 게임 기업 검색·분야·선택 흐름 | 구현 완료. 서버26기업 메타데이터·별칭/분야·6개씩 탐색·픽/주문/보유/복기·공식 자료 링크 연결. 타입/lint·로컬 Android export 성공. 실제 설치는 APP-21, EAS 추가 빌드0. |
| BE-33 | 게임 확대 전 저장 규칙 버전 고정 | Issue#7 종료·PR#8 main d8331b7 머지. CI37810110339/37810148762 전체 성공. 5시드24턴 고정 결과·H2/PostgreSQL 비파괴 이전/반복 실행·API 저장 버전·미지원 무변경·백업 복원 검증. Render 운영 반영은 확인 전이며 실제 기업 확대는 BE-28에 유지. |
| BE-32 | 공식 자료 기반 시작 기업 목록 확대 | Issue#5 종료·PR#6 main6f0f8da 머지·전체 CI 성공·Cloudflare f00592b2 공개4폭·Render 신규4기업 검색/확인일 및 ETF5 유지 확인. 운영 쓰기0·EAS0. |

2026-10-07 게임 UX 보완을 웹·백엔드에 배포했다. 웹·앱 가상 픽에 시나리오 이유/위험/뉴스와 직접 생성한 불꽃 마스코트를 적용했고, 다음 턴 요청과 병행하는 직전 거래 복기·응답 후 지표/가격 영향/넘긴 포지션 손익/지난 픽 비교·건너뛰기/메모리 다시보기를 제공한다. 실제 가격 규칙/픽 정합성 및 롱·숏·매도 후 관찰 계산, 360/1280px 브라우저, 웹 빌드·앱 타입/린트/Android 번들 검증을 완료했다. 운영 배포 후 실제 픽 매수·다음 턴·복기·모바일 체결 그래프를 확인했다. 네이티브 실기기 확인과 운영자 수신자 등록·기존 운영자 신원 이전은 남아 있다. ADR 0018 참조.

| 과제 | 제목 | 결과 | 근거 |
|---|---|---|---|
| WEB-36 | 설정 입력 보존·공지 상태 | Issue#3·PR#4, CI37804420353 전체 성공·main fccfd85 머지·Cloudflare06781638 배포. 공개1366/390px 가상 API 회귀 성공·운영 쓰기0·EAS0. 실제 이용자/스크린리더는 WEB-30 | docs/product/settings-followup/checklist.md |
| APP-29 | APK 별도 수동 실행 | CI EAS 호출 없음 확인, build:apk 명령·웹/서버 배포와 분리 기준 기록. 일반 배포는 APK 요청을 포함하지 않음. 이번 작업 EAS 빌드0회 | docs/product/android-build-separation/plan.md |
| WEB-35 | 첫 등록·발견·근거 확인과 키보드 동선 | b9b9a3c·Cloudflare fb6c6a7e, CI37796805618 전체 성공. 공개 첫 흐름2폭/키보드/초점/장애·별도200% 텍스트8화면·첫 안내2폭·실제 시장 GET6화면 성공. 운영 시험 기록0, 실제 관찰/스크린리더는 WEB-30 | docs/reviews/2026-10-09-first-use-accessibility.md |
| WEB-34 | 탐색 바·드롭다운과 필터 정렬 | ab795ae·Cloudflare cd53c728 공개 배포. Select 외곽/내부44px, PC 탭 기준선·팝업 폭/간격, 모바일 필터 줄바꿈, 차트 선택 메뉴·게임 label 범위 수정. 공개4폭/다크 탐색·등록5조건·게임5노트북과 모바일·실제 GET6화면 성공. CI37781276263 전체 성공 | docs/product/control-alignment/plan.md |
| WEB-33 | 자산 등록 분리와 홈 점검 연결 | b0a4a7a 구현·서버 v3 확인 후 ab795ae 웹과 함께 cd53c728 공개 배포. 공개5조건 선택 매입가/충돌 보존/수정/현금·계획/중복/부분 평가 fixture 성공, 운영 데이터 쓰기0. 설치 앱은 APP-21 | docs/product/portfolio-registration/plan.md |
| BE-31 | 선택 매입가·평가 기준 비중 서버 | b0a4a7a 및 CI37774653610 전체 성공. 공개 capabilities200, optionalAverageCost=true, MARKET_VALUE, portfolio-rules-v3 확인. 기존 사용자 기록 보존 | docs/product/portfolio-registration/plan.md |
| WEB-32 | 게임 행동·결과 전용 아이콘 | 6ada301·Cloudflare f4bb3275 공개 배포. 게임9종 추가/총29종 공유 SVG. 공개4조건 커스텀 버튼·선택·대비·실패 안내, 게임5노트북/3모바일 거래·초기화·턴·복기 성공. CI37770230386 웹·앱 성공 확인 | docs/product/game-icons-checklist.md |
| APP-28 | Android 자산 등록·홈 점검 분리 | b0a4a7a. 전체 화면 회사/수량·선택 매입가, 키보드 위 저장과 뒤로가기 취소, 홈·현금/계획 분리. 타입/lint·최종 Android export·출시 검사8개·CI37774653610 앱 성공. 새 APK/실기기는 APP-21 | docs/product/portfolio-registration/plan.md |
| APP-27 | 게임 행동 전용 벡터 | 시작/턴/픽 매수/주문/초기화/선택/결과·사건 적용. 타입/lint·Android export·CI 모바일 성공. 기존APK 미포함, 새 빌드·실기기 확인은 APP-21 | docs/product/game-icons-checklist.md |
| WEB-31 | FireWatch 전용 메뉴 아이콘 | 6df743f·Cloudflare3685ce90 운영 배포. 전용 SVG20종 공유 원본·주요 메뉴/도구 적용, 공개5폭/다크·장식 접근성/권한/넘침0·전체36라이트/4다크·게임5노트북/3모바일 성공. main CI37767735481 전체 성공 | docs/product/firewatch-icons.md |
| APP-26 | 전용 벡터 메뉴 적용 | 웹과 같은 원본·기존 react-native-svg로 홈4탭/상단 설정·도움말/게임 도구 구현. 타입/lint·Android export·main CI37767735481 모바일 성공. 기존versionCode4에는 미포함, 새 빌드/설치/TalkBack은 APP-21로 이관 | docs/product/firewatch-icons.md |
| WEB-29 | 전체 화면 정보 우선순위·기준 날짜 | 1196e47/671cd60·Cloudflare0c0aa9e9 운영 배포. 지표 날짜·홈 발견·회사 차트/후보 행동·뉴스/브리핑·게임/도움말 정리. 공개 fixture36라이트/4다크·후보 상세/도움말 검색·게임5노트북/3모바일·브리핑 후속4폭/다크·실제 공개 GET6화면 성공, 운영 쓰기0. 최종 main CI37764107701 전체 성공. 실제 이용자/접근성은 WEB-30, Android 설치는 APP-21 | docs/reviews/2026-10-08-whole-ui-design-review.md |
| WEB-28 | 게임 개별 도구·공통 메뉴 | 3e1b581·Cloudflare709d812c 공개 배포. 분리된 순위/규칙·키보드·계정/설정/도움말·익명 운영 숨김4폭/다크 및 거래5노트북/3모바일 fixture 성공. 전체 main CI37709655483 성공. 앱 설치는 APP-21 | docs/product/game-scout-menu.md |
| WEB-27 | 게임 마스코트 로비·짧은 버튼 | 3a1d35b·Cloudflare4b4d0f5e 공개 배포. 로비4폭/다크·hover/터치·키보드·시작 실패, 주문5노트북/3모바일·초기화/체결/턴/복기 공개 번들 fixture 성공. main CI37707081625 전체 성공. 앱 설치는 APP-21 | docs/product/game-scout-menu.md |
| BE-12 | Google OAuth 클라이언트 ID/서버 허용 목록 | 설정 완료. Android·웹 ID Render 등록/배포, 사용자 실제 웹 로그인 성공. Android 실왕복은 APP-21 | Google 로그인 문서·사용자 설정/로그인 확인 |
| BE-18 | 감사로그 인증 방향 결정·구현 | 완료. 운영자 검증 세션/서버 전용 키 적용·배포. 익명/공개키401·일반403 통합 검사, 운영 익명 차단 확인 | OperatorAccess·AuditLogController·ADR0021·계정 통합 검사 |
| BE-19 | 브리핑 푸시 전체 실패 재시도 | 완료. 전부 실패하면 당일 완료 표시하지 않음, 다음 due 조회 가능. 무수신자/성공 처리 회귀 통과·배포 | PushService·PushServiceTest·9667eb1 CI |
| BE-20 | 게임 미래 가격 사용 차단 | 완료. 과거 가격이 없으면 거래 불가, 미래 가격 사용 금지 회귀 통과·배포. 새 게임은 가상 자료 | GameService·GameServiceTest·9667eb1 CI |
| BE-23 | 실제 뉴스·추천 기록 보관/조회 | 핵심 구현·배포 완료. 독립 기록·날짜/키워드·근거 검사·제한 수집, 자료 보존과 실제 분석 확인. 운영 복구/푸시는 BE-30, 보관 정책은 BE-21 | ADR0015/0019·추천/수집 통합 검사·운영 보존 로그 |
| BE-24 | 첫 방문 기기 생성 경쟁 제거 | 완료. 원자적 생성·기존 행 보존, H2/PostgreSQL 동시 회귀 성공·서버 배포 | SettingsCreationConcurrencyTest·CI37599970959·33bcd37 |
| BE-25 | 운영 API와 공개 설정 키 분리 | 개발·배포 완료. 운영자 세션/서버 키로 통일, 사용자 키 등록·예약 폴링 성공. 실제 운영 수신은 BE-30 | OperatorAccess·예약37602746664·33bcd37 |
| BE-27 | 수집 진단 운영자 권한 적용 | 개발·배포 완료. 역할 통합 검사·운영 익명401. 실세션 일반403 후속은 BE-30 | CollectionAlertAccessIntegrationTest·29ce9cb·운영 확인 |
| WEB-17 | 404 재시도 제외 | 완료. 4xx는 즉시 오류, 5xx/429/네트워크 제한 재시도. 코드·build/CI·배포 반영 | useApi.ts·9667eb1 CI |
| WEB-26 | 출시 전 기능·UI/UX·디자인 정밀 점검 | 완료. 자산/로그인 우선·추천 후보의 내 보유 맥락·뉴스 조건/응답 일치·미저장 편집 보존. 4개 너비·라이트20/다크4화면과 핵심 실패 회귀, 공개 웹 배포 및 전체 CI 성공. 실기기/수집 후속은 유지 | 79cd12f·Cloudflare37f8979d·CI37658863371·docs/reviews/2026-10-08-release-ui-ux-review.md |
| APP-2/3/4/6/11 | 푸시·브리핑·설정·계정·동의 구현 | 구현 종료. 실기기 검증 미완료이며 APP-21 통합 체크리스트로 이관 | 모바일 코드·타입/lint·Android export·CI |
| APP-12 | 관심종목 실패 롤백/안내 | 구현 완료. 이전 목록/선택 복원·Toast·타입/lint. 설치 실패 재현은 APP-21 | StocksScreen.handleChange·CI |
| APP-14 | 모바일 기본 라이트·주요 화면 | 요구된 라이트 구현 완료. 설치 시각/키보드 확인은 APP-21, 선택형 다크는 비필수 보류 | shared/design-tokens.json·모바일 화면·CI |
| APP-20/22/23/24/25 | 문의·공지·순위·기업 점검·주문 초기화·진단 접기 | 구현 종료. 각 설치 검증 기준을 삭제하지 않고 APP-21로 이관 | 해당 기능 문서·모바일 코드·CI |
| WEB-25 | 수집 장애 배너 자동 노출 제거 | 9667eb1 main/GitHub 반영, Cloudflare f45b672d. 공개 번들 운영자/일반의 계정·설정 자동 진단 요청0·배너0, 직접 펼침·복구·조회 실패·접기 검증, 일반 진단 비노출. 수집/기록/푸시 정책 유지. | 2026-10-08 log |
| WEB-24 | 게임 작업 바 정리와 주문 초기화 | 1983474 게임 UI 공개 배포·fixture 검증 후 GitHub 오류 복구로9667eb1에 포함해 main 반영. 전체 branch CI37643646960 성공. | docs/product/game-order-controls.md |
| WEB-23 | 관심 기업·근거 뉴스·내 보유 연결 | 48bbe19, Cloudflare f7663128 공개 배포. 배포 번들 1366/1920/390/360px fixture 근거/누락 후보/페이지/시세·뉴스·보유 탐색/빈·실패 상태 통과. 브리핑45·뉴스775 보존 확인. | docs/product/investment-focus.md |
| BE-29 | 선택적 게임 주간 순위와 우승자 보관 | 680c995 H2/PG 및 전체 CI 성공. 운영 순위/우승자200 빈 상태·개인 기록401·익명 등록401, 브리핑45·뉴스775 보존. 시험 순위 없음. | docs/product/game-weekly-rankings.md |
| WEB-22 | 종료 선택 등록과 주간 순위·우승자 UI | Cloudflare f7663128. 배포 번들1366/390/360px fixture 거절POST0·동의 등록·철회·익명 안내 통과. 순위는 게임 내부에만 표시. | docs/product/game-weekly-rankings.md |
| BE-26 | 사용자 피드백·공지 API | 5215be7 CI 37609558546의 153개/H2·PG 검사 성공, Render 공지 200·비로그인 관리 401. 본인 문의/운영자 계정 관리·중복 방지·KST 오늘 숨김·유한 푸시 outbox. | docs/product/community-support.md |
| WEB-21 | 노트북 게임 시장 탐색·주문 고정 | 완료. Cloudflare 8f5b330f 웹 배포, 배포 번들 5개 데스크톱 해상도와 360/390/768px·라이트/다크·게임 종료·픽→매수→다음 턴 fixture 통과. 총액·체결·다음 버튼 고정, 종목 확대는 BE-28 별도 | `web/src/features/game/{GameExperience.tsx,game.css}` (2026-10-07 [[log]]) |
| WEB-20 | 접수·운영 관리·첫 진입 공지 | Cloudflare 8917ec2f, 실제 390/1440px·익명 관리 숨김·개인정보 안내 확인. fixture 모달/숨김/재시도/답변/공지 저장. 실제 운영자 공지 게시와 푸시 실수신은 별도. | docs/product/community-support.md |
| BE-3 | 스케줄러 + Gemini 실제 응답 확인 | 2026-10-07 운영 수동 트리거로 새 추천 분석·날짜별 저장과 GEMINI_API 출력 기록 확인. Search Grounding 대신 보관 RSS/시세 입력 사용. WARNING은 시간 임계값 초과이며 출력 생성 성공. | ADR 0011·0019, docs/reviews/2026-10-07-followup-review.md |
| WEB-18 | 공통 디자인 토큰과 주요 모바일 화면 개편 | 기본 라이트·선택 웹 다크/오렌지, 색상·간격·타이포·radius 공유, 모바일 주요 화면과 게임 적용. 타입/빌드/린트·브라우저/Android 번들 검증 완료. 네이티브 실기기·선택형 모바일 다크는 별도. | shared/design-tokens.json, mobile/src/components/ScreenIntro.tsx, ADR 0014, 2026-10-07 log |


| # | 과제 | 결과 | 정본·근거 |
|---|---|---|---|
| BE-26 | 사용자 피드백·공지 API | 5215be7 CI 37609558546의 153개/H2·PG 검사 성공, Render 공지 200·비로그인 관리 401. 본인 문의/운영자 계정 관리·중복 방지·KST 오늘 숨김·유한 푸시 outbox. | docs/product/community-support.md |
| WEB-20 | 접수·운영 관리·첫 진입 공지 | Cloudflare 8917ec2f, 실제 390/1440px·익명 관리 숨김·개인정보 안내 확인. fixture 모달/숨김/재시도/답변/공지 저장. 실제 운영자 공지 게시와 푸시 실수신은 별도. | docs/product/community-support.md |
| BE-3 | 스케줄러 + Gemini 실제 응답 확인 | 2026-10-07 운영 수동 트리거로 새 추천 분석·날짜별 저장과 GEMINI_API 출력 기록 확인. Search Grounding 대신 보관 RSS/시세 입력 사용. WARNING은 시간 임계값 초과이며 출력 생성 성공. | ADR 0011·0019, docs/reviews/2026-10-07-followup-review.md |
| APP-10 | 모바일 뉴스 화면 추가 | 완료. 웹 `NewsPage` 대응 — 오늘의 관련 뉴스 목록을 홈 세그먼트 탭 4번째("뉴스")에 표시, 항목을 탭하면 `Linking.openURL`로 외부 브라우저에서 기사를 연다(RN엔 `target="_blank"` 링크 개념이 없어 명시적 오픈 필요). 모바일 `Briefing` 인터페이스에 `news: NewsArticle[]` 필드 추가(APP-9에서 지수 필드를 넣은 것과 동일한 이유로, 그동안 홈 화면만 쓰던 좁은 선언을 웹과 맞춤). 이걸로 2026-10-04 앱 리뷰로 시작된 모바일 기능보강(APP-8 종목·APP-9 지수·APP-10 뉴스)이 전부 끝나, 모바일 홈이 4개 탭(홈/종목/지수/뉴스)을 갖춤. `tsc --noEmit`·`expo lint` 통과, 실기기 검증은 기존과 동일하게 사용자 몫 | `mobile/src/{features/{home/HomeScreen.tsx,news/NewsScreen.tsx},lib/api.ts}` (2026-10-05 [[log]]) |
| APP-9 | 모바일 지수 화면 추가 | 완료. 웹 `IndicesPage` 대응 — 금/은/환율 + 국내외 지수·채권 수익률 현재값을 "지수" 탭(홈 세그먼트 탭 3번째)에 그리드로 표시. 완료 기준이 "확인 가능"까지라 웹의 시계열 `RateChart`·전일대비 트렌드 화살표는 이번엔 빼고 현재값만(필요해지면 `/api/briefings?from=&to=` 히스토리 조회를 추가하면 됨). 모바일 `Briefing` 인터페이스가 그동안 홈 화면이 쓰는 필드만 선언해뒀던 걸 웹과 동일한 지수 필드까지 확장(백엔드 `BriefingDtos.kt` 응답 구조 확인 후 반영). `tsc --noEmit`·`expo lint` 통과, 실기기 검증은 기존과 동일하게 사용자 몫 | `mobile/src/{features/{home/HomeScreen.tsx,indices/**},lib/api.ts}` (2026-10-04 [[log]]) |
| APP-8 | 모바일 종목 화면 추가 | 완료. 웹 `StocksPage` 대응 — 관심종목 검색/티커 직접입력 탭(`StockSearchInput` 신규, RN엔 AntD Select가 없어 TextInput+결과목록 직접 구현) + `react-native-gifted-charts` LineChart로 기간별(하루~5년) 차트. 네비게이션은 사용자가 명시적으로 하단 탭·드로어를 거부("너무 AI티 나는데")하고 고른 **상단 세그먼트 탭**(홈/종목) — 로컬 state, 별도 라우팅 라이브러리 없음. 알림 탭 시 탭 전환에도 바텀시트가 정상 동작해야 해서 브리핑 조회·바텀시트·알림 처리를 `BriefingScreen`에서 신설 `HomeScreen`(상위)으로 끌어올리고 `BriefingScreen`은 표시 전용으로 축소. `KeywordInput`에 웹(WEB-11)과 동일한 `showInput` prop 추가해 검색 탭에서 태그만 노출. `tsc --noEmit`·`expo lint` 통과, 실기기 검증은 기존과 동일하게 사용자 몫 | `mobile/src/{app/index.tsx,features/{home/HomeScreen.tsx,briefing/BriefingScreen.tsx,stocks/**,settings/{SettingsScreen.tsx,components/KeywordInput.tsx},lib/api.ts}}` (2026-10-04 [[log]]) |
| WEB-16 | 가상투자 게임 화면 | 완료(BE-16과 쌍). `/game` 신규 페이지 — 턴 헤더(포트폴리오 가치·수익률·현금), 그날의 지표(`MetricStat` 재사용)·뉴스(`RelatedNewsCard` 재사용)·AI 추천종목 힌트(클릭 시 거래 패널에 종목 채움), 매크로 지표/개별 종목(`StockSearchInput` 재사용) 거래 패널, 보유 자산 목록, "다음 턴으로" 버튼, 게임 종료 결과 화면. 신문 1면형 `SECTION_CARD_PROPS` 그대로 적용해 다른 페이지와 스타일 일관. 프로덕션 배포 후 실제 브라우저로 게임 시작→매수(금 1개, 현금 9,995,818원으로 감소 확인)→보유자산 반영 확인→다음 턴(턴 1/43 2026-10-01 → 턴 2/43 2026-08-21로 비순차 이동, 그날 금 시세·뉴스 갱신 확인)까지 왕복, 라이트·다크 둘 다 확인. `npm run build`·`npm run lint` 통과. **후속(같은 날)** — "시작 자금이랑 공매도 설정 바꿀 수 있게 해줘"로 난이도(쉬움/보통/어려움) 선택 + 공매도 허용 스위치를 가진 "게임 설정" 화면을 추가(활성 세션 없을 때 404 대신 이 화면으로 분기), 보유 자산에 음수 수량·"공매도" 표시·턴 헤더에 공매도 허용 배지 추가. 프로덕션에서 어려움(500만원)+공매도 허용으로 시작→공매도 매도(현금 5,000,000→5,004,466원, `-1개 · 공매도` 표시)까지 브라우저로 재확인 | `web/src/{lib/api.ts,App.tsx,components/AppShell.tsx,features/game/GamePage.tsx}` (2026-10-05 [[log]]) |
| BE-16 | 가상투자 게임 엔진 | 완료. "DB로 흐름을 모아서 AI 추측과 가상투자게임을 만들고 싶다"는 요청으로 시작(뉴스·주식·금/은이 나오며 투자하고 "다음 턴" 버튼으로 기간이 넘어가는 턴제 게임). 가격 데이터 출처를 두 차례 조율 — "과거 재생" vs "AI 매 턴 생성" 중 고르라 했더니 "실제 주식 패턴을 통계적으로 추출해서 섞어서" 쪽으로 확정. 실측 결과 production엔 약 46~49일치 실제 Briefing뿐이라(2026-08-21부터), 종목·지표별 통계적 재표본 대신 **"하루 단위 블록"을 섞는 방식** 채택 — 실제 Briefing 날짜(뉴스+지표+AI추천종목이 이미 한 세트)를 셔플해 턴 덱으로 삼아, 매 턴의 뉴스-가격 정합성이 항상 100% 보장되면서도 턴 순서가 실제 달력과 달라 결과를 미리 알 수 없게 함. 개별 종목(사용자가 "포함" 선택)은 그 턴의 실제 날짜에 맞춰 `StockApiClient.fetchPriceHistory`로 실제 Yahoo 종가를 조회 — 별도 가격 합성 불필요. `game_sessions`/`game_transactions` 2개 테이블 신규(보유량·현금은 컬럼으로 안 두고 거래 내역을 현재 턴까지 재생해서 매번 계산 — 동기화 버그 방지), `POST /api/game/{start,trade,next-turn}`·`GET /api/game/current` 전부 `X-Device-Id` 필수(Settings와 동일 패턴). `GameServiceTest` 9개 시나리오(시작·멱등·매수·잔고부족·보유초과매도·턴진행·게임종료·세션없음·개별종목 날짜매칭) 전부 통과, `./gradlew build` 전체 통과. 로컬 H2에 테스트 Briefing 3건 시드해 curl로 전체 흐름(시작→매수→다음턴→오버셀 거부→게임종료) 선검증 후 배포, 프로덕션에서도 실제 43턴 덱으로 시작→매수→턴 진행(비순차 이동 확인)까지 재검증. **후속(같은 날)** — "시작 자금이랑 공매도 설정 바꿀 수 있게 해줘 시작자금의 경우 난이도 설정에 같이 하면 될 것 같아"로 `GameDifficulty`(EASY 2,000만/NORMAL 1,000만/HARD 500만) enum 추가(이미 활성 세션 있으면 새 설정 무시, 멱등 유지) + `GameSession.allowShortSelling` 컬럼 추가 후 **매도 오버셀 검증만 완화**하고 보유량 집계 필터를 `> ZERO`→`!= ZERO`로 변경(기존 현금/가치 재계산이 음수 보유량에서도 자연히 맞아 롱/숏 분기 로직 불필요). 테스트 2개 추가(총 11개), `./gradlew build` 통과, 프로덕션에서 `{"difficulty":"HARD","allowShortSelling":true}`로 시작해 `startingCash`/`cash` 5,000,000·`allowShortSelling: true` 응답 확인 | `backend/src/main/kotlin/com/firewatch/backend/{entity/{Enums.kt,GameSession.kt,GameTransaction.kt},repository/{GameSessionRepository.kt,GameTransactionRepository.kt},service/GameService.kt,web/{GameController.kt,dto/GameDtos.kt}}`(+테스트), `backend/src/main/resources/schema-{h2,postgresql}.sql` (2026-10-05 [[log]]) |
| BE-15 | 감사로그 응답요약에서 나머지 data class 원시 덤프 제거 | 완료. BE-14(`PushSendResult`) 패턴을 "노출되는 data class가 자기 자리에서 가독성 책임을 진다"는 원칙 그대로 확장 — WEB-15 작업 중 감사로그 페이지를 다시 보다가 재발견. `StockPriceHistory`(캔들 수백 개 nested 덤프 → "005930.KS 시세 361개 포인트 · 최근 276000.0(...)"), `RecommendedStockPerformance`(영문 필드=값 나열 → "스카이랩스(2026-10-05 추천) +3.2%"), `FinancialSnapshot`(12개 필드 전부 라벨 없이 나열 → "금 ... · 은 ... · 코스피 ..." 한글 라벨 붙여 압축), `GeminiBriefingResult`(클래스명 래퍼만 제거하고 marketSummary 본문은 그대로 보존 — 디버깅 핵심 값이라 잘라내지 않음)까지 4개. `AuditLogAspect`는 안 건드림(`result.toString()` 자체는 범용 설계). `./gradlew build` 전체 통과(기존 테스트는 toString 미검증이라 그대로 통과). Render 재배포 후 프로덕션에서 새 호출 2건(`StockService.fetchPriceHistory`, `RecommendedStockPerformanceService.fetchPerformance`)이 새 포맷으로 기록되는 것까지 실측 확인 — 과거 로그는 소급 변경 안 되고 그대로 남음(의도된 동작) | `backend/.../{client/{GeminiClient.kt,StockApiClient.kt},service/{FinancialDataService.kt,RecommendedStockPerformanceService.kt}}` (2026-10-05 [[log]]) |
| BE-14 | 감사로그 응답요약 포맷 정리 | 완료. `PushSendResult`에 `toString()` 오버라이드 추가 — "PushSendResult(recipientCount=3, ...)" 대신 "대상 3명 — FCM 5/5건, 웹푸시 1/2건 성공" 형태. `AuditLogAspect` 쪽은 안 건드리고(`result.toString()` 호출 자체는 범용적으로 맞는 설계) 노출되는 data class가 자기 자리에서 가독성 책임을 지는 패턴 — 나중에 다른 data class도 같은 방식으로 확장 가능. 기존 equals 기반 테스트 그대로 통과, 포맷 검증 테스트 추가. `./gradlew build` 전체 통과, Render 재배포 성공(`bb16790` Live) 확인 | `backend/.../service/PushService.kt`(+테스트) (2026-10-04 [[log]]) |
| WEB-12 | 가이드·사용방법 메뉴 통합 | 완료. `HelpPage` 신설, AntD `Tabs`로 기존 `GuidePage`/`UsagePage`를 그대로 탭 콘텐츠로 재사용(각자 쓰던 자체 Title만 제거). `/guide`·`/usage` 라우트 둘 다 유지(StocksPage의 `/guide` 링크가 안 깨지게, URL로 초기 탭만 결정). 사이드바·헤더 메뉴가 "도움말" 하나로 줄어듦. 프로덕션에서 메뉴·탭 전환 둘 다 브라우저로 확인. `npm run build`·`npm run lint` 통과 | `web/src/{App.tsx,components/AppShell.tsx,features/{help/HelpPage.tsx,guide/GuidePage.tsx,usage/UsagePage.tsx}}` (2026-10-04 [[log]]) |
| WEB-11 | 종목 페이지 검색창/직접입력창 중복 노출 정리 | 완료. "이름으로 찾기"/"티커 직접 입력" Segmented 탭으로 분리(기본은 검색). `KeywordInput`에 `showInput` prop 추가해 Settings 화면(관심 키워드)은 변경 없이 그대로, 종목 화면만 탭에 따라 태그 목록+입력 필드를 분리 렌더링(태그 중복 렌더링 버그를 수정 중 한 번 거쳐감 — 최종은 탭마다 한 번씩만). 프로덕션에서 두 탭 다 브라우저로 확인. `npm run build`·`npm run lint` 통과 | `web/src/features/{stocks/StocksPage.tsx,settings/components/KeywordInput.tsx}` (2026-10-04 [[log]]) |
| WEB-10 | AI 추천종목 가상매매 결과 UI | 완료. 대시보드 브리핑 요약 바로 아래 "AI 추천 성과" 카드 추가 — 종목명·추천일·수익률(%, 상승 빨강/하락 파랑 기존 토큰 재사용), 현재가 조회 실패는 안내 문구, 데이터 0건이면 Empty 안내("아직 쌓인 추천 기록이 없어요"). 프로덕션 배포 후 빈 상태 렌더링까지 브라우저로 확인(실데이터는 스케줄러가 쌓은 뒤 자연 확인 예정). `npm run build`·`npm run lint` 통과 | `web/src/{lib/api.ts,features/dashboard/{DashboardPage.tsx,hooks/useRecommendedStockPerformance.ts,components/RecommendedStockPerformanceCard.tsx}}` (2026-10-04 [[log]]) |
| BE-13 | AI 추천종목 가상매매 트래킹 데이터 모델·API | 완료. `recommended_stock_snapshots` 신규 테이블(H2/Postgres 양쪽, Postgres는 RLS도 활성화) — 스케줄러가 브리핑 저장 후 그날 추천종목마다 이름→티커 검색+그 시점 가격을 스냅샷으로 저장(종목 하나 실패해도 나머지 계속). `GET /api/stocks/recommendations/performance`가 스냅샷 대비 현재가 수익률 계산(같은 symbol 중복 조회 방지). 로컬 H2에 직접 시드 데이터 넣고 실제 Yahoo 가격으로 수익률 계산(294.29%)까지 종단 검증, 종목 못 찾은 케이스의 null 처리도 확인. `./gradlew build` 전체 통과, Render 재배포 후 프로덕션에서 빈 배열 정상 응답(스냅샷은 아직 없음 — 내일 08:00 KST부터 쌓임) 확인. **후속(2026-10-06)** — "AI 추천 성과에 현재가 조회가 왜 실패지" 질문으로 원인 조사 — 실제 프로덕션 응답에서 메타·삼성자산운용·스카이랩스 전부 `symbol: null` 확인. Yahoo 비공식 검색이 ① 한글 쿼리를 못 알아듣고(메타 — 영문 "Meta"로는 찾아지는데 한글로는 빈 배열) ② 영문이어도 중소형주는 인덱스에서 빠져 있고(스카이랩스 — 티커 `376930.KQ`를 직접 입력하면 가격이 정상 조회되는데 이름 검색은 한글·영문 둘 다 실패) ③ 애초에 비상장 자회사를 추천하면 손쓸 방법이 없다(삼성자산운용 — 삼성생명 100% 자회사, 상장 자체가 안 돼 있음)는 걸 실측으로 확인 — Gemini가 종목명과 함께 티커도 주도록 바꿔 해결(아래 [[log]] 2026-10-06 참고) | `backend/.../{entity/RecommendedStockSnapshot,repository/RecommendedStockSnapshotRepository,service/{RecommendedStockSnapshotService,RecommendedStockPerformanceService,SchedulerJob},web/StockController}.kt`(+테스트), `backend/src/main/resources/schema-{h2,postgresql}.sql` (2026-10-04 [[log]]) |
| APP-7 | 모바일 추천종목 칩을 클릭 가능하게 | 완료(범위 조정). 모바일엔 아직 종목 화면이 없어(APP-8 예정) 당초 계획했던 "화면 이동"은 빼고, "이름→티커 검색 → 관심종목 자동 추가 → 토스트 안내"로 축소 — APP-8이 생기면 자동으로 거기 반영됨. `mobile/src/lib/api.ts`에 `searchStocks` 신규 추가(웹과 동일 엔드포인트). `tsc --noEmit`·`expo lint` 통과, 실기기 검증은 기존과 동일하게 사용자 몫 | `mobile/src/{lib/api.ts,features/briefing/components/RecommendedStockChip.tsx}` (2026-10-04 [[log]]) |
| WEB-9 | 브리핑 추천종목 칩을 클릭 가능하게 | 완료. 클릭 시 기존 `searchStocks` API로 이름→티커 변환 후 `/stocks?add=<티커>`로 이동, `StocksPage`의 기존 `handleAddFromSearch` 재사용해 관심종목 추가+차트 표시. 프로덕션 배포 후 "삼성전자" 태그 클릭 → `005930.KS` 자동 추가·차트 렌더링까지 브라우저로 실제 확인 | `web/src/features/dashboard/components/BriefingSummaryCard.tsx`, `web/src/features/stocks/StocksPage.tsx` (2026-10-04 [[log]]) |
| WEB-6 | 웹 푸시(Web Push) 알림 배포 | 완료. ①②(Render VAPID 키, `web/.env`+Cloudflare Pages 배포)는 이전 세션에 이미 끝나 있었음(Next-Tasks 서술이 stale했던 것으로 2026-10-04 재확인). 남은 ③(사용자의 실제 "허용" 클릭)을 세션이 `https://firewatch-eqp.pages.dev` 설정 화면을 직접 열어 "브라우저 알림 켜기" 클릭까지 진행 → 네이티브 권한 팝업에서 사용자가 직접 "허용" → 재클릭 시 "브라우저 알림을 켰습니다" 성공 토스트 + `PUT /api/settings` 저장까지 확인. 브리핑 실제 발송 시 알림 도착 여부는 다음 날 08:00 KST 발송에서 자연 확인 예정 | `web/src/features/settings/{SettingsPage.tsx,hooks/useWebPushSubscription.ts}` (2026-10-04 [[log]]) |
| WEB-8 | Cloudflare Pages 재배포 | 완료. 사용자가 Cloudflare 계정 로그인 후 `wrangler login` 재시도 → 성공(이전 두 차례는 계정 로그인 자체가 안 돼 있어 타임아웃). `npm run build` + `wrangler pages deploy dist --project-name=firewatch`로 X-Device-Id 헤더 포함 최신 번들 배포 완료. 이어서 대기 중이던 백엔드 커밋 7개(X-Device-Id 필수화 포함) push 중 **Render 배포가 한 번 실패**(healthCheckPath였던 `/api/settings`가 이번 변경으로 인증을 요구하게 돼 헬스체크가 400을 받음) — `HealthController`(`/api/health`) 신설 + `render.yaml` 헬스체크 경로 수정으로 해결, 재배포 확인까지 완료 | `web/`(재배포), `backend/.../web/HealthController.kt`, `render.yaml` (2026-09-30 [[log]]) |
| APP-5 | 모바일 X-Device-Id 적용 | 완료. 공개 배포 전환(ADR 0012)에 맞춰 웹과 동일 패턴으로 갱신 — `deviceId.ts`(신규)는 웹의 `legacy-owner-device` 마이그레이션 없이 AsyncStorage에 없으면 새 익명 ID를 생성해 고정(모바일은 아직 실사용자 데이터가 없는 사이드로드 APK 단계). `getDeviceId()`가 비동기라 `fetchSettings`/`updateSettings`를 `async`로 전환. `EXPO_PUBLIC_SETTINGS_API_KEY` 제거(`.env.example`·`SettingsScreen` 401 분기 포함). `tsc --noEmit`·`expo lint` 통과 | `mobile/src/lib/{api.ts,deviceId.ts}` (2026-09-29 [[log]]) |
| BE-11 | 관심 키워드 추천 + 핫이슈용 트렌드 키워드 | 완료. 등록 당시 가정했던 "신규 GET 엔드포인트"는 불필요했음 — `/api/briefings/latest`가 이미 그날 뉴스 전체를 내려주고 있어, 트렌드 키워드는 기존 1일 1회 Gemini 호출에 얹는 걸로 스코프 축소(별도 호출 없음, 무료 티어 쿼터 절약). `GeminiClient` 프롬프트에 "핵심키워드: A, B, C" 트레일링 라인 요청 추가(추천종목과 동일 정규식 패턴), `Briefing.trendingKeywordsRaw` 컬럼 추가. `NewsRssClient` 수집량을 5→20으로 늘리되(핫이슈 매칭 여지 확보), Gemini 프롬프트에는 여전히 상위 5건만 전달(8/28 Gemini TimeoutException 실측 이력이 있어 프롬프트 비대화로 인한 타임아웃 위험을 늘리지 않기 위함) — `SchedulerJob`이 DB 저장용과 Gemini 입력용 뉴스 목록을 분리. `./gradlew build`(신규 테스트 포함) 통과 | `backend/.../client/GeminiClient.kt`, `backend/.../service/SchedulerJob.kt`, `backend/.../entity/Briefing.kt` (2026-09-01 [[log]]) |
| WEB-7 | 설정 화면 키워드 추천 UI + 대시보드 핫이슈 섹션 | 완료. RSS가 키워드 검색을 지원하지 않아([[Decisions/0010-rss-news-instead-of-gemini-grounding]]) 핫이슈는 "새로 검색"이 아니라 "오늘 이미 받은 뉴스를 관심 키워드로 클라이언트 사이드 필터링"으로 구현 — 새 백엔드 로직 없이 기존 `useLatestBriefing`(news)·`useSettings`(interestKeywords) 두 훅만으로 처리. `RelatedNewsCard`를 `title`/`emptyDescription` prop화해 재사용(새 컴포넌트 안 만듦). 설정 화면엔 오늘자 브리핑의 `trendingKeywords`를 클릭 가능한 추천 태그로 노출(이미 등록된 건 자동 제외, `KeywordInput` 내부 20개 상한 가드를 우회하므로 별도 체크 추가). 로컬 H2에 SQL로 브리핑·뉴스·설정을 직접 시드해 브라우저로 3가지 상태(키워드 없음=숨김/매칭 있음=필터링된 기사만 노출/매칭 없음=빈 상태 문구) 전부 실제 확인. `npm run build`·`npm run lint` 통과 | `web/src/features/dashboard/DashboardPage.tsx`, `web/src/features/settings/SettingsPage.tsx`, `web/src/features/news/components/RelatedNewsCard.tsx` (2026-09-01 [[log]]) |
| APP-1 | 모바일 프로젝트 스캐폴딩 | 완료. `npx create-expo-app`(SDK 57 기본 템플릿)으로 `mobile/` 생성 후 데모 콘텐츠 전부 제거, NativeWind v4(babel/metro/tailwind config) 설치. 라우터 루트가 `mobile/app/`이 아니라 `mobile/src/app/`인 건 이 SDK 버전 템플릿의 최신 관례라 Design 문서 경로에서 소폭 벗어남(계층 분리 의도는 동일). `tsc --noEmit`·`expo lint`·`expo export --platform web`(정적 라우트 `/`·`/settings` 정상 생성) 통과. 실기기 Expo Go 검증은 사용자가 `npx expo start`로 직접 진행 필요 | `mobile/`, `docs/02-design/features/mobile-app.design.md` (2026-08-23 [[log]]) |
| WEB-15 | 신문 1면형 섹션 스타일을 종목·설정·감사로그 페이지까지 확대 | 완료. WEB-14(대시보드 신문1면형) 직후 "1번(다른 페이지에도 적용)" 요청으로 착수. 대시보드 3곳에서 반복되던 `variant="borderless"` + 패딩 제거 스타일 조합을 `lib/theme.ts`의 `SECTION_CARD_PROPS` 공통 상수로 추출(대시보드 3개 컴포넌트도 이 상수를 쓰도록 같이 정리). `StocksPage`(관심종목·차트 2곳)·`AuditLogPage`(필터+테이블 1곳)·`SettingsPage`(알림 설정·브라우저 알림 2곳)에 적용 — 설정 화면의 첫 카드는 원래 `title`이 없어서(폼만 감싸고 있었음) 섹션 룰이 보이게 "알림 설정" 제목을 새로 붙임. 라이트 모드 3페이지 전부 프로덕션에서 확인(다크는 대시보드에서 이미 검증한 것과 동일 토큰 메커니즘이라 재검증 생략). 감사로그 페이지를 다시 보면서 "작업명"/"응답 요약" 컬럼에 내부 클래스명이 그대로 노출되는 것도 눈에 띄었지만 이번 요청 범위 밖이라 손 안 댐(사용자에게 별도 과제로 제안함, 아직 착수 여부 미정). `npm run build`·`npm run lint` 통과 | `web/src/{lib/theme.ts,features/{dashboard/components/{RecommendedStockPerformanceCard.tsx,WatchlistSummaryCard.tsx},news/components/RelatedNewsCard.tsx,stocks/StocksPage.tsx,settings/SettingsPage.tsx,audit-log/AuditLogPage.tsx}}` (2026-10-05 [[log]]) |
| WEB-14 | 대시보드 레이아웃을 신문 1면형으로 재구성 | 완료. WEB-13 이후 "박스가 세로로 나열된 느낌은 그대로"라는 지적에 과감한 구조 변경 옵션(뉴스레터형/커맨드센터형/신문1면형/벤토그리드형)을 비교 제시 → 신문 1면형 선택받아 구현. `BriefingSummaryCard`를 `variant="borderless"` + 큰 제목(24px/800)으로 지면 맨 위 메인 기사(마스트헤드)처럼, 그 아래 `AI 추천 성과`·`관심 종목`·`오늘의 핫이슈`를 박스 카드 대신 제목 밑줄만 있는 섹션으로 2단 그리드(`repeat(auto-fit, minmax(320px,1fr))`)에 배치 — 관심 키워드가 없어 핫이슈 섹션이 없을 때도 그리드가 안 비게 좌측 묶음(성과+관심종목)이 단독으로 넓어지도록 처리. `RelatedNewsCard`에 `boxed` prop 추가(기본 true) — 뉴스 페이지는 단독 콘텐츠라 기존 박스 카드 유지, 대시보드 핫이슈만 `boxed={false}`. 라이트·다크 둘 다 프로덕션에서 확인. `npm run build`·`npm run lint` 통과 | `web/src/features/{dashboard/{DashboardPage.tsx,components/{BriefingSummaryCard.tsx,RecommendedStockPerformanceCard.tsx,WatchlistSummaryCard.tsx}},news/components/RelatedNewsCard.tsx}` (2026-10-05 [[log]]) |
| WEB-13 | 웹 대시보드 재설계 — 메뉴 중복 제거 + ECOS 참고 리스킨 | 완료. 2026-10-04 리뷰 "디자인이 마음에 안 듬 ... 햄버거구성도" 지적으로 시작 — 실제 배포 화면 스크린샷으로 문제 특정(사이드바+헤더 메뉴 중복, 카드 flat, 다크모드 카드/배경 명암 거의 없음, 지수 페이지 카드 색 비일관) 후 Before/After Artifact로 먼저 제안·승인받고 구현. 사용자가 지정한 한국은행 ECOS(ecos.bok.or.kr)를 JS로 실측(Noto Sans KR, 큰 숫자 font-weight 300, 선택 카드 틴트 배경)해 반영 — 자세한 내용은 [[design]] §7. `AppShell.tsx`의 `Sider` 삭제해 상단 헤더 하나로 통합, 폰트 Pretendard→Noto Sans KR, 크림 캔버스(`#f2f0eb`)→세이지그레이(`#EEF1ED`, 크림은 AI 생성 디자인 클리셰라 배제), 다크모드 `colorBorderSecondary` 명시 지정으로 카드/배경 명암 버그 수정, `MetricStat` 중립 테두리를 `--ant-color-border`로 올려 비교값 없는 카드도 테두리가 보이게, 대시보드 히어로 카드에 `colorPrimary` 파생 틴트 배경 적용. 로컬 dev 서버는 프로덕션 백엔드 CORS 허용 목록에 없어 데이터 확인이 안 돼(예상된 제약, 버그 아님) Cloudflare Pages에 배포 후 라이트·다크 둘 다 실제 브라우저로 확인. `npm run build`·`npm run lint` 통과 | `web/{index.html,src/{index.css,lib/theme.ts,components/AppShell.tsx,features/{indices/components/MetricStat.tsx,dashboard/components/BriefingSummaryCard.tsx}}}` (2026-10-05 [[log]]) |
| BE-10 | 한국국채 10년물 수익률 데이터 소스 확보 | 완료. 코드(한국은행 ECOS Open API, 817Y002/010210000)는 이미 끝나 있었고 남은 건 사용자가 ECOS에서 무료 인증키를 발급받아 Render `ECOS_API_KEY`에 등록하는 것뿐이었음 — 사용자가 직접 발급·등록 완료, 세션이 프로덕션 `/api/briefings/latest`로 `krBondYield10y: 4.365` 실제 값 채워짐을 확인 | `backend/.../client/FinancialApiClient.kt` (2026-10-05 [[log]]) |
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
