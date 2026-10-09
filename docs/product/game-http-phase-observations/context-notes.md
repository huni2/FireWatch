# 결정과 관찰

BE-28 동일 소스 로컬/켜진 Render 비교 완료(2026-10-10). 새 로컬JVM·H2 메모리·예약 작업 비활성으로 첫/후속 각각43요청 PASS, Render 세션38도43요청 PASS·ENDED 보관. 로컬 첫START1642.3ms/response387.996ms·후속START133.1ms/response1.472ms/다음 턴30.2ms 중앙값. Render 후속START2773.6ms/response0.975ms/auth1506.918ms/controller798.523ms·다음 턴1388.6ms 중앙값. 이전 Render 첫response3200.598ms가 후속0.975ms로 작아져 초기 요청 비용 패턴은 확인. 매 요청의 지속적인3초 JSON 비용이나 절전 시간으로 해석하지 않는다. 로컬H2/운영원격PG·호스트·네트워크·시드 차이가 있어 무료CPU 단독 원인/유료 효과는 미확정. 추가 추측성 준비·폴링/keepalive·새배포/변수/과제/APK0·새 로그 요청0. 로컬 비교 프로세스 종료·기존 운영 자료/순위 변경0. 비교 단계는 완료했으며 첫6.83초의 세부 초기 비용 해결은 기존Issue#45/BE-28 미완료 유지.

## 로컬·운영 환경 비교

같은 maina6aa350 서버 소스로 새 로컬 JVM/H2 메모리 DB에서 첫43요청과 후속43요청을 비교하고, 켜져 있는 Render에서 격리43요청 한 번을 비교한다. 로컬 포트18085·예약 수집/브리핑 비활성·실제 파일/운영 DB 사용0·각 게임 종료 보관. 반복 keepalive/추측성 서버 변경/새 과제/APK0. 첫 요청과 재사용 상태를 구분하며 로컬H2와 운영PostgreSQL/네트워크/자원 차이 때문에 무료CPU 단독 원인이나 유료 전환 개선율을 단정하지 않는다.

세션37 배포 시작 로그 수신 완료: 2026-10-10 01:24:10.444 KST game_runtime_ready preparation_ms=12012 metadata_ms=412. 첫START01:25:09.476보다59.032초 먼저 실제 준비를 완료했다. 실행 누락 가설은 제외하지만 response3200.598ms의 상세 원인은 아직 미확정이다. 준비에12.012초가 추가됐으나 첫 응답 준비의 목표 개선은 확인되지 않았다. 로그 요청 대기는 종료하고 같은 로그를 다시 요청하지 않는다. 추가 추측성 시작 준비를 반복하지 않으며 기존BE-28/Issue#45는 성능 기준 미충족으로 유지한다.

BE-28 PR#51 Render 적용 후2026-10-10 01:25:09 KST 격리 세션37·43요청 PASS·ENDED 보관. START HTTP6833.4/application6129/controller1801.092/response3200.598ms·PREVIEW1463.1ms·다음 턴23개 중앙값1394.6ms(1290.4~2813.1ms). 첫6.83초와 응답 준비3.20초가 남아 목표한 응답 지연 개선은 확인되지 않았다. 이전7.63초보다 짧은 표본을 변경 효과로 단정하지 않는다. response는 컨트롤러 종료~beforeCommit 경계이며 JSON 단독 시간이나 특정 CPU 원인으로 해석하지 않는다. 현재 준비 코드는 실제 HTTP 결과 처리기·미디어 선택·Netty 전체를 실행하지 않는다. 추가 추측성 서버 변경/반복 게임은 하지 않고 이번 배포 game_runtime_ready 숫자 로그1줄로 실제 시작 준비 실행을 먼저 확인한다. 기존 START/PREVIEW 로그 재요청·새배포/변수/과제/APK0. 기존Issue#45/BE-28 미완료·기존 사용자/순위/수집 변경0·private 파일 제외.

BE-28 비동기 응답 준비 PR#51 main 검증 완료. 소스055ab81·maina6aa350·push37957493452/PR37957538350/main37958166380 서버/H2·PostgreSQL·복원·웹/앱 전체 성공·로컬207검사 실패0/제외1. 실제 writer/commit·컨트롤러 메타데이터를 시작 단계에서 준비하고 두 가상 샘플은 메모리 폐기한다. 새 DB/서비스/외부 호출0·기존 JPA 준비 조회1회 유지. 세션36 START/PREVIEW 로그 수신/대조 완료·같은 로그 요청 종료. Render 새 코드 적용 확인을 한 번 요청한 상태이며 기존 timing 변수 유지. 첫7.63초/응답 준비3.00초의 새 배포 개선은 아직 미확인이라 기존Issue#45/BE-28은 열어 둔다. 새 과제/APK/EAS0.

BE-28 세션36 START/PREVIEW 로그 수신 완료. START2697.770ms/repository1598.312ms2회/SQL591.314ms3회/연결181.178ms/큐99.275ms·PREVIEW683.556ms/SQL377.154ms2회. 같은 로그 추가 요청 종료. 기존 동기 encodeValue 준비가 실제 HTTP 비동기 writer/commit을 거치지 않는 경로를 확인해 실제 configured writer의 Mono 응답과 컨트롤러 반환형 메타데이터를 시작 단계에서 준비한다. 두 샘플은 메모리 폐기·각30초 유한 대기·새 DB/서비스/네트워크 호출0. 로컬207검사 실패0/제외1·실제 비동기 encode2회 검증. PG/PR/main CI와 새 배포 효과는 아직 미확정·기존Issue#45 유지·APK0.

- 세션36 START/PREVIEW 로그 모두 수신. STARTserver2697.770/큐99.275/연결181.178/prepare87.714/SQL591.314ms3회/repository1598.312ms2회/규칙0.057ms70회·uptime240692ms. PREVIEW683.556/큐0.293/연결0.032/prepare0.180/SQL377.154ms2회/규칙0.013ms. 같은 로그 대기는 종료. 남은 response3초에 대해 동기encodeValue와 실제 EncoderHttpMessageWriter.write(Mono) 경로가 다른 점을 확인했다. 코덱/버퍼/commit의 실제 비동기 경로를 메모리에서 처리하고 MethodParameter로 컨트롤러 반환형을 해석한다. 서버 네트워크/API/새DB/게임 서비스 호출0이며 기존 JPA 조회1회는 그대로 유지한다.

- 7551c6c Render 적용 완료 확인 후2026-10-10 00:54:23 KST 격리 세션36·43요청 PASS·ENDED 보관. START HTTP7630.5/application7159/auth382.447/dispatch1019.785/controller2700.558/response2998.712ms·PREVIEW1467.9ms·다음 턴23개 중앙값1392.9ms. 이전15.2초보다 이번 표본은 짧지만 코드별 개선율/모든 원인 확정은 아니다. 컨트롤러2.70초/응답 준비3.00초가 남아 과제 미완료·같은Issue#45 유지. 해당START game_timing1줄만 요청해 repository/SQL/큐를 대조한다. 새배포/변수 불필요·기존 자료/순위 변경0·APK0.

- PR#50 최종 main CI37954397592 전체 성공 확인. 코드/머지 검증 종료·로컬207검사 실패0/제외1·push37953782000/PR37953788738 전체 성공. 다음은 새Render7551c6c 적용 후 한 판의 첫 시작/기능 실측이다. 새 코드 적용 확인 질문은1회만 유지하며 같은 START/PREVIEW 로그는 다시 요구하지 않는다. 기존BE-28/Issue#45는 실제 성능 확인 전 유지·APK0.

- PR#50 최종a82f7bc·main7551c6c 머지. 로컬 최종207검사 실패0/제외1, push37953782000/PR37953788738 전체/H2·PG·복원·웹/앱 성공. main37954397592 확인 중. 이번 JPA 준비는 DB조회1회가 서버 시작 시 추가되지만 저장/삭제/감사/서비스 호출0·기존 잠금/쿼리 유지·6종 건수/보유 상태 불변. 새Render7551c6c 적용 확인을 한 번 요청했다. 이전 배포 로그 대조는 종료됐으며 다음 첫 시작 실측 전 과제 완료는 보류한다.

- 최종 관련 로컬 검사(감사AOP/게임HTTP/준비) 통과. 금액은 compareTo, 보유/거래의 DECIMAL은 trailing zero만 정규화해 ID/턴/종목/행동/수량/가격/총액을 대조한다.6종 테이블 건수·현금·보유·원장·시세 불변 확인. 이전 전체207검사의 유일한 숫자표현 비교 실패를 수정했고 최종 전체/PG CI에서 모두 다시 확인한다.

- JPA 준비 추가 후 로컬 전체207검사 중 새 보존 검사1건만 DECIMAL 표현 차이9997500.0000/9997500.00000000로 실패·행 건수 불변은 통과했다. 금액 비교를 수치 비교로 정정하고 보유/거래의 ID·수량·가격·총액을 유지해 재검증한다. 운영 로직/정밀도는 변경하지 않는다. 첫 시작 repository18.597ms/SQL3.670ms·service121.873ms로 이전 로컬 첫repository1031.114ms보다 준비 비용이 요청 밖으로 이동한 표본을 확인했다. 이를 Render 효과로 주장하지 않는다.

- 로컬 GameTimingIntegrationTest 첫 START repository1031.114ms/SQL1.722ms·다음 START repository7.591ms/SQL1.276ms로 첫 JPA 경로 준비 비용을 관측했다. 같은 세션 조회 메서드를 임시 UUID 식별자로 서버 준비 때 한 번 조회한다. 기존 잠금 메서드는 DB read-only 트랜잭션에서 금지되므로 일반 트랜잭션 안에서 조회만 한다. 새 데이터/감사 저장·게임 서비스 호출·주기 실행·재시도는 없다. 계정/게임 기록을 지우거나 바꾸지 않으며 실제 상태/행 건수 불변 검증을 추가한다. PR#50 설명도 최종 범위로 갱신한다.

- 감사 메타데이터 준비 보완 로컬 전체206검사 실패0/제외1 통과. 실제 shared 해석기의 startGame 매개변수 이름/deviceId 마스킹 계약·감사 성공/실패/중첩 fallback·첫 SQL3회·repository_count2·게임 원장/권한 회귀 유지. 전체 성능 효과는 새 배포 실측 전 미확정. 기존Issue#45의 PR/전체PG/main CI를 확인한다.

- 사용자 START/PREVIEW 로그 수신 완료. START server9077.947/큐99.052/연결181.306/SQL573.095ms3회/규칙90.424ms70회·uptime327280ms. PREVIEW server777.550/큐93.610/연결0.028/SQL378.801ms2회/규칙0.015ms. 첫 시작 지연 대부분은 SQL 실행으로 설명되지 않는다. Spring7.0.8 AOP MethodSignatureImpl.getParameterNames는 DefaultParameterNameDiscoverer.getSharedInstance를 호출하며 KotlinReflection을 먼저 사용한다(javap 확인). 감사로그 summarizeArgs가 이 경로를 호출하므로 동일 해석기를 GameService 메서드에 대해 시작 시 준비한다. 전체8초의 원인으로 단정하지 않고 기존 REPOSITORY 단계로 첫 조회/저장을 측정해 다음 대조를 보완한다.

- 2026-10-10 사용자 Render 반영 완료 확인 후00:23:15 KST 시작·격리 세션35·43요청 PASS·ENDED 보관. START HTTP15204.9/application14729/auth1600.036/dispatch905.541/controller9097.298/response3099.997ms. PREVIEW1483.8ms·다음 턴23개 중앙값1391.4ms. 이전 표본보다 응답 준비가 작지만 인과/개선율을 일반화하지 않는다. 여전히15.2초로 성능 완료 미충족·기존BE-28/Issue#45 유지. 해당 START game_timing1줄만 요청해 SQL/연결/큐를 대조한다. 도구 보고서 private 소유 파일은 제외하고 공개 숫자 JSON만 저장, 기존 기록/순위 변경 없음·APK0.

- 초기화 이전 수정 검증 종료. PR#49·소스aa3e5bd·mainf631544, PR37948978627 전체 성공·push37948913952 실패job1회 재검증 성공·main37950391498 전체 성공. 로컬206검사 실패0/제외1·관련 권한/게임 재검증 성공. Render 최신 서버 적용 확인 요청1회 대기이며 새 첫 시작 측정 전 지연 해소/BE-28 완료는 미확정이다.

- PR#49 CI37948978627 전체 성공. push37948913952의 AccountSessionIntegrationTest.kt117은20초 응답 대기 TimeoutException으로 실패·보존 XML 확인. 잘못된 기기 토큰의401 assertion 실패로 단정하지 않는다. 운영 인증/timeout/검사 계약을 변경하지 않고 관련 로컬 및 실패 job1회만 재검증한다. 최초 실패 기록은 보존하며 반복 성공까지 재시도하지 않는다.

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
