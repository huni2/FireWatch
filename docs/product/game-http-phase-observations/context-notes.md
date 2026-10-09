# 결정과 관찰

- 로컬 전체 Gradle 검사 통과(2026-10-10). 준비 완료 후 Netty 시작 순서·준비된 HTTP 미리보기 정상/수량0 거절400·26기업/뉴스/픽/34자산 그래프/거래 JSON round-trip 확인. 준비 클래스는 codec/validator에만 의존한다. 실제 게임 호출·저장소 의존 없이 샘플 폐기. 로컬 준비 비용을 운영 개선 수치로 사용하지 않는다.

- BE-28 재개. 첫 시작 controller9.99초/response8.41초가 후속 응답과 크게 달라 첫 초기화 비용을 시작 단계로 이전한다. ServerCodecConfigurer 실제 encoder/decoder를 사용해 캐시가 다른 mapper를 준비하는 실수를 피한다. SmartInitializingSingleton에서 유한한 한 번의 메모리 작업만 수행한다. 게임 서비스/저장소/외부 제공처 의존 없음, 인증/주문/DB 변경 없음. 운영 지연 전체 원인이 확정된 것은 아니다.

사용자가 main CI 실패를 알렸다. CI37944617074 backend Test에서205개 중1개 실패/1개제외, PortfolioApiIntegrationTest.kt160의 TimeoutException이다. 웹/앱은 성공했다. default5초 기능 통합 클라이언트에 기존 AccountSession/Community 검사와 동일한20초 제한을 명시한다. 서버 운영 지연을 숨기는 timeout 변경이나 테스트 생략/자동 재시도는 하지 않는다. 이 검사는 응답 성능 SLA 검사가 아니므로400 거절·보유 저장 불변을 검증한다. 실제 운영 지연은 기존 BE-28의 미완료 기준으로 계속 유지한다.

기존 BE-28에서 계측 경계만 보완한다. RequestLatency(-200)·AccountSessionFilter(-100)의 순서를 명시해 인증 큐/DB까지 request/application 경계 안에 포함한다. GameHttpPhases는 ServerWebExchange에만 저장하며 ThreadLocal/공유 캐시/DB 기록이 없다. 인증 실패는401을 유지하고 컨트롤러 미진입 값은0으로 만들지 않고 unavailable로 남긴다. 기존 game-timing true 옵션일 때만 game_http_timing 로그를 응답 준비 시1줄 기록한다. controller_ms는 IO 진입/서비스/코루틴 복귀를 포함하고 dispatch_ms는 인증 종료 후 요청 바인딩/검증/호출 전까지라 순수 스케줄 대기라고 해석하지 않는다. response_ms는 controller 반환 후 beforeCommit까지이며 전체 전송 시간은 아니다. 기존 숫자와 새로운 request/application 경계는 필터 순서가 달라 직접 개선율로 비교하지 않는다.

2026-10-09 재개 게임의 PREVIEW 사용자 로그를 수신했다. server1776.824ms·SQL455.840ms2회·연결180.907ms·큐0.179ms·규칙0.019ms를 application5244ms/HTTP5723.2ms와 대조했다. 약3467ms의 application/service 경계 차이를 특정 원인으로 단정하지 않는다. 코드의 AccountSessionFilter JdbcTemplate 연결 사용자 확인은 game_timing 밖이다. 사용자 로그2줄 요청은 완료됐으며 원인 확인과 실제 수정은 미완료다. 인증 생략/잠금 제거/풀 변경/새 과제 생성 없음.

실제17:34:57 KST 세션32/43요청 PASS·종료 원장 보관. 기존Server-Timing 숫자39개, 필터 대상 아닌4개는null. 첫HTTP2277.6/headers2273.7/body4.0/application698ms, 다음 턴23개 중앙값HTTP1298.4/headers1295.9/body1.7/application1018ms. 현재전체5개 본문0.8~3.6ms. 본문 읽기는 이번 요청들의 큰 비용이 아니며 인증·응답 준비·DNS/TLS 중 원인 구분은 아직 불가하다. 앞선15.9초는 재현되지 않았지만 서버 기동/조건이 달라 해결된 것으로 주장하지 않는다. backend/배포/원래 사용자/순위/삭제/수집/EAS0.

소스50f1cb4·CI37905207583/PR CI37905212865 서버/H2·전용 PostgreSQL·복원·웹/앱 모두 성공·PR#28은075c7a7로 머지·Issue#27 종료. backend/Render 설정·배포를 변경하지 않는다. 소유 ID 없는 관측 숫자만 저장한다. 실제 첫 큰 지연 확인은 BE-28에 유지한다.

코드 확인상 AccountSessionFilter는 게임 요청 전에 JdbcTemplate의 linkedUser 조회를 하고, 연결 계정이면 authenticate도 호출한다. 이 조회는 게임 서비스 타이머 밖이며 Hibernate 이벤트 sql_count에도 포함되지 않는다. 따라서 SQL3/4는 전체 HTTP 요청의 모든 DB 호출 수가 아니라 게임 계측 범위의 횟수다. 인증을 생략하거나 캐시로 우회하지 않는다. 두 필터에 명시적 Order가 없어 application 헤더 경계를 모든 인증까지 포함한 전체 서버 시간으로 주장하지 않는다.

사용자 로그10줄을 받았다. 첫 START server2903.904ms·SQL612.593ms3회·rules203.685ms·uptime1513576ms. 첫 JVM 기동 직후 요청이라고 할 수 없다. 매수977.535ms·SQL679ms4회, 재전송696.584ms·511.960ms3회, 매도850.122ms·670.829ms4회. NEXT_TURN5개는1014.474~1140.245ms·SQL673.194~874.070ms4회. warm 규칙은0.041~0.154ms로 비용이 작다.

START 클라이언트15885.3ms와 서비스2903.904ms는 경계가 다른 측정이다. 미계측 차이를 응답 직렬화나 네트워크로 확정하지 않는다. 기존 RequestLatency 필터의 Server-Timing 헤더는 동작하지만 검증 script가 버렸으므로 이를 먼저 보존한다. 기본 필터 순서·서버 경계/API를 바꾸거나 새로운 로그를 추가할 필요가 없다.
# 기존 BE-28 재개

2026-10-09 BE-22 운영 집계 일부는 사용자 결과 확인 대기로 유지하고 다음 열린 BE-28을 재개했다. 반복 계측 개발 과제를 만들지 않고 이미 검증된 도구로 한 판을 관측한다. 정상 결과만으로 이전 첫 지연의 원인이 해소됐다고 주장하지 않는다. 운영자 로그 없이 추측으로 잠금·풀·캐시를 바꾸지 않는다.
