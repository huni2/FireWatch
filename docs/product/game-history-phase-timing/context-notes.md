# 관찰과 결정

사용자 START/TRADE/NEXT_TURN 로그 수신. START server1168.127/connection182.265/SQL736.534ms4회·rules0.947ms70회, TRADE1620.570/queue92.607/connection182.332/SQL914.137ms5회·rules0.052ms74회, NEXT_TURN1485.291/connection182.472/SQL929.484ms4회·rules0.059ms78회. 모두success. rules_count는 같은 규칙 선택의 호출 횟수이며 매번26기업을 초기화하거나 SQL을 실행한다는 뜻이 아니다. repository/history 필드는 HISTORY 전용 구간이라 다른 행동0이 DB/계산이 없다는 뜻은 아니다. BE-38·Issue#25에서 코드로 확인한 불필요 원장 조회만 줄인다. 특정 쿼리·네트워크/리전·잠금 단독 원인은 아직 미확정이다.

사용자 새 단계 로그 수신·운영 반영 확인. 07:31:34.669Z HISTORY success server1392.013/queue193.421/connection197.040/SQL171.051ms·repository597.274/rules203.791/history2.174ms·각횟수1·uptime425292ms. 07:32:23.889Z success server337.691/queue0.203/connection0.026/SQL167.509ms·repository169.294/rules0.003/history0.361ms·각1·uptime474512ms.

규칙 로딩203.791ms·그래프2.174ms는 이번 첫 요청 전체1.392초의 대부분을 설명하지 못한다. 따뜻한 요청에서는 repository169.294ms 안의 SQL167.509ms가 거의 전부다. queue/repository/rules/history는 이 경로에서 순서대로 측정돼 그 밖에 약394.353/167.830ms가 남지만, 이 값은 트랜잭션 진입/종료·프레임워크·응답 객체 구성 등을 분리하지 않는 미계측 구간이다. COMMIT/CPU/잠금으로 확정하지 않는다. connection과SQL은 repository에 포함되므로 다시 더하지 않는다. 이전 JVM에서8.665초가 걸린 원인은 이번 다른 시점 결과로 소급 확정할 수 없다. 변화는 계측뿐이므로 속도 개선 효과도 주장하지 않는다.

HISTORY 진단 단계의 운영 확인은 완료했다. 실제 느리다고 보고된 시작/다음 턴은 START/NEXT_TURN 로그로 따로 확인해야 한다. warm 상세 한 표본을 전체 게임 지연의 결론으로 삼거나 근거 없이 풀/잠금/파서/캐시를 바꾸지 않는다. BE-28은 해당 운영 대조와 필요한 최적화에 유지한다.

main CI37898602198 전체 성공. 사용자 배포 확인 후 기존 종료 세션29 GOLD/23턴 GET2회만 수행했다. 16:31:30 KST HTTP200/24점/4,604.2ms, 16:32:22 KST HTTP200/24점/946.8ms. 같은 시각 HISTORY2줄의 repository/rules/history를 요청해 응답 대기 중이다. 새 요청은 이전 요청과 다른 JVM/시각이므로 앞선13.43초와 비교해 최적화 효과를 주장하지 않는다. 새 게임/주문/삭제/순위/APK0.

사용자가 최신 서버 Render 배포 완료를 확인했다. 기존 종료 시험 게임의 GOLD/23턴 읽기 요청으로 새 단계 로그를 만들고 대조한다. 배포 완료 확인을 로그 원인 확정으로 대체하지 않는다.

소스4f2d1a6·소스CI37898163048/PR CI37898191931 전체 성공. H2 전체/전용 PostgreSQL/복원·웹/앱까지 확인 후 PR#24를bb3f940으로 머지했고 Issue#23은 종료됐다. BE-37은 개발 완료, BE-28은 운영 새 단계 로그 대조를 유지한다. 사용자에게 Render 최신 서버 배포 완료 확인을 요청했다. 옵션은 기존true 유지로 새 키가 필요 없다. 속도 개선은 아직 주장하지 않는다.

전체 gradlew test 성공.190검사 실패0/오류0/기존 제외1. 실제 HISTORY는 repository/rules/history 각1·SQL1, 미래 턴 실패는 repository1/rules0/history0, 다음 요청 정리와 비식별 로그를 확인했다. 시간 임계값으로 로컬 속도 개선을 주장하는 테스트는 추가하지 않았다. PostgreSQL 실제 이벤트는 기존 CI 선택에 포함돼 PR에서 확인한다.

기존 JdbcSpan 집계를 재사용하고 별도 주입/새 logger/자유 입력 이름 없이 내부 enum 세 가지로 제한했다. disabled이면 ThreadLocal 조회 뒤 원래 block만 실행한다. finally에서 실패 구간도 기록하고 기존 요청 정리로 다음 요청에 새 record가 생성된다. 첫 통합 검사 실패는 테스트가 wrapper 응답을 내부 history DTO로 읽은 오류이며 GameAssetHistoryResponse로 바로잡았다. API/서비스 반환은 바꾸지 않았다.

사용자가 공유한 HISTORY 두 줄은 16:05/16:07 KST의 기존 종료 세션29 읽기 요청에 대응한다. 첫 HTTP13,430.4ms·서버8,665.392ms, 재조회HTTP1,064.8ms·서버338.617ms다. 클라이언트 타이머와 서버 타이머의 차이를 순수 네트워크 지연으로 해석하지 않는다.

GameSimulation의 26기업 rules는 lazy이며 독립 Jackson mapper의 모듈 탐색·Kotlin 역직렬화가 있다. 후보일 뿐 실제 소요 시간이 없으므로 파서 교체/기동 시 예열을 먼저 하지 않는다. 상세 조회는 readOnly·비잠금이고 연결1/SQL1이다. 단계 계측으로 ORM 조회와 rules/history를 먼저 구분한다.
