# 운영 계측 사용과 해석

## BE-28 HTTP 경계 보완

기존 FIREWATCH_GAME_TIMING_ENABLED=true를 유지하면 `game_timing`과 별도로 응답 준비 시 `game_http_timing` 로그를 남긴다. 새 옵션/운영 키/DB 스키마는 필요 없다. 이 보완 이후 HTTP 타이머가 인증 필터보다 먼저 실행되므로 application은 인증을 포함하는 새 경계다. 이전 application 숫자와의 차이를 개선 효과로 계산하지 않는다.

| 필드 | 관측 범위 |
|---|---|
| request_ms | HTTP 타이밍 필터 진입~응답 beforeCommit |
| auth_queue_ms | 인증 작업 예약~boundedElastic 실행 시작 |
| auth_ms | 기기 연결 조회와 필요한 세션 인증의 반환/예외까지, JDBC 연결·결과 처리 포함 |
| dispatch_ms | 인증 종료~컨트롤러 메서드 진입, 바인딩·검증·프레임워크 호출 포함 |
| controller_ms | 컨트롤러 메서드 진입~IO 서비스/DTO·코루틴 복귀 후 반환/예외 |
| response_ms | 컨트롤러 반환~beforeCommit, 전체 본문 전송 제외 |

호출되지 않은 구간은 unavailable이다. auth_ms가 크면 기기 연결 조회/인증 JDBC의 연결·SQL을 조사하고, dispatch_ms가 크면 첫 바인딩/검증·프레임워크 구간을 조사한다. controller_ms가 크면 기존 game_timing을 대조하고 response_ms가 크면 응답 생성/직렬화 구간을 조사한다. 기동·무료 서버 리소스·GC 등의 원인은 해당 단계만으로 단정하지 않는다. 무작정 인증을 캐시하거나 검증을 제거하지 않는다.

한 요청의 정합한 단계 비교를 위해 START/PREVIEW 요청을 같은 시각의 두 로그와 대조한다. 로그에는 op/status/시간만 포함되며 기기 ID·세션 토큰·본문·SQL 원문을 기록하지 않는다. 옵션false에서는 새 요청별 측정 객체와 game_http_timing 로그를 만들지 않는다.

같은 숫자는 Server-Timing 헤더의 auth_queue/auth/dispatch/controller/response에도 기록한다. 미측정 단계는 헤더에서 생략한다. 기존 application 항목과 CORS 노출은 유지한다. scripts/verify-game-live.cjs는 이5개 허용 항목의 유한 양수/0 숫자만 보고서에 보관하고 원시 헤더/다른 항목/desc는 기록하지 않는다. 배포 후 HTTP 보고서만으로 단계 구분이 가능하므로 먼저 이 도구로 한 판을 관측하고, controller가 지배하는 요청만 기존 JDBC 로그와 추가 대조한다.

Render 환경변수 `FIREWATCH_GAME_TIMING_ENABLED=true`를 설정하고 BE-36 소스를 배포하면 게임 컨트롤러가 반환할 때 `game_timing` 로그를1줄 남긴다. 기본은false이며 DB 스키마/원장/게임 시드·잠금을 바꾸지 않는다. 진단이 끝나면false로 되돌리고 환경 적용을 배포한다. CI의 실제 PostgreSQL 검사는 전용 로컬 DB만 허용한다.

```text
game_timing op=CURRENT outcome=success server_ms=5.696 io_queue_ms=0.180 connection_ms=0.023 connection_count=1 prepare_ms=0.384 sql_ms=0.287 sql_count=2 uptime_ms=11476
```

위 값은 실제 H2 로컬 시험의 예시이며 Render 성능 수치가 아니다. 게임 시작의 시험 SQL4회·현재 조회2회는 해당 시험의 값이며 항상 고정된 예산을 의미하지 않는다. `sql_count`는 Hibernate JDBC statement/batch 실행 이벤트 횟수다. 배치1회는 여러 행을 포함할 수 있다.

| 필드 | 의미 | 해석 경계 |
|---|---|---|
| op/outcome | 고정 게임 행동/컨트롤러 정상 반환 또는 예외 | 입력·개별 사용자·예외 내용 없음 |
| server_ms | 컨트롤러 진입 뒤 IO 대기~동기 서비스/트랜잭션/DTO 반환 | 시작 전 기동·컨트롤러 이전 인증/필터/요청 검증·응답 직렬화/전송 제외 |
| io_queue_ms | Dispatchers.IO 구간에 진입하기까지 | 네트워크 시간 아님 |
| connection_ms/count | Hibernate의 JDBC 연결 획득 관측/횟수 | 풀 대기·연결 생성을 포함할 수 있으나 분리하지 못함 |
| prepare_ms | JDBC statement 준비 구간 | 연결 획득과 겹칠 수 있음 |
| sql_ms/count | Hibernate의 JDBC 실행 구간/statement·batch 횟수 | DB CPU 단독 시간 아님. 통신·SQL 잠금 대기 포함 가능, COMMIT/결과 탐색 전부를 재현하지 않음 |
| uptime_ms | JVM 가동 시간 | 작은 값만으로 Render 콜드 스타트 원인을 확정하지 않음 |
| repository_ms/count | HISTORY 저장 세션 조회 메서드의 반환까지/호출 횟수 | JDBC·ORM 결과 처리가 포함됨. 서비스 바깥 트랜잭션 진입/종료 제외 |
| rules_ms/count | 게임 규칙 선택·첫 lazy 로딩/호출 횟수 | 여러 선택의 누적 시간이며 첫 요청뿐 아니라 모든 요청에 기록. lazy 잠금 대기도 포함 가능 |
| history_ms/count | HISTORY 단일 자산 그래프 계산/호출 횟수 | 규칙 선택 뒤 계산만. 현재 턴 응답의 전체 그래프 계산은 이 필드에 포함되지 않음 |

각 이벤트 시간이 겹칠 수 있어 총합을 server_ms에서 빼서 CPU/COMMIT 시간으로 계산하지 않는다. 남은 시간에는 계산·엔티티 매핑·트랜잭션 정리·감사로그 처리와 초기화 등이 섞인다. 기존 감사로그와 별개로 서버 표준 로그에만 기록하며 새로운 DB 감사 행을 추가하지 않는다. 원래 게임 변경의 감사 기록은 유지한다.

## 운영 확인 순서

1. Render에서 PR 소스 배포와 플래그true 적용을 확인한다.
2. 평소 실제 기기에서 시작/미리보기/매수/다음 턴/상세를1회씩 수행하고 발생 시각/HTTP 시간을 기록한다. 시험 게임은 격리 검증 스크립트로 한 판만 만들 수 있으며 원장은 ENDED로 보존하고 순위에 등록하지 않는다.
3. 같은 시간대의 `game_timing` 행동별 로그를 대조한다. 사용자 식별자는 로그에 없어 다중 사용자 상황에서는 한 사용자 요청과 정확히 대응한다고 주장하지 않는다.
4. 첫 요청과 이후 요청의 uptime·큐·연결·SQL 시간을 따로 본다. SQL/연결이 지배하면 연결 풀/네트워크·잠금/왕복을 조사하고, SQL이 작지만 server_ms가 크면 초기화/트랜잭션/계산을 추가 조사한다.
5. 자료 없이 현재 조회의 잠금을 제거하거나 캐시로 과거 평가를 대체하지 않는다. 진단을 끝내면 옵션을 끈다.

운영 배포/로그 대조는 BE-28 확인 항목이다. BE-36 개발·검사 완료만으로 병목 원인이나 속도 개선을 확정하지 않는다. 이 환경에서는 Render 배포/로그 도구가 없으므로 운영 적용 확인과 비식별 `game_timing` 로그가 필요하다. 로그 전체나 키/토큰을 공유할 필요는 없다.
