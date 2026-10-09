# 관찰과 결정

전체 gradlew test 성공.190검사 실패0/오류0/기존 제외1. 실제 HISTORY는 repository/rules/history 각1·SQL1, 미래 턴 실패는 repository1/rules0/history0, 다음 요청 정리와 비식별 로그를 확인했다. 시간 임계값으로 로컬 속도 개선을 주장하는 테스트는 추가하지 않았다. PostgreSQL 실제 이벤트는 기존 CI 선택에 포함돼 PR에서 확인한다.

기존 JdbcSpan 집계를 재사용하고 별도 주입/새 logger/자유 입력 이름 없이 내부 enum 세 가지로 제한했다. disabled이면 ThreadLocal 조회 뒤 원래 block만 실행한다. finally에서 실패 구간도 기록하고 기존 요청 정리로 다음 요청에 새 record가 생성된다. 첫 통합 검사 실패는 테스트가 wrapper 응답을 내부 history DTO로 읽은 오류이며 GameAssetHistoryResponse로 바로잡았다. API/서비스 반환은 바꾸지 않았다.

사용자가 공유한 HISTORY 두 줄은 16:05/16:07 KST의 기존 종료 세션29 읽기 요청에 대응한다. 첫 HTTP13,430.4ms·서버8,665.392ms, 재조회HTTP1,064.8ms·서버338.617ms다. 클라이언트 타이머와 서버 타이머의 차이를 순수 네트워크 지연으로 해석하지 않는다.

GameSimulation의 26기업 rules는 lazy이며 독립 Jackson mapper의 모듈 탐색·Kotlin 역직렬화가 있다. 후보일 뿐 실제 소요 시간이 없으므로 파서 교체/기동 시 예열을 먼저 하지 않는다. 상세 조회는 readOnly·비잠금이고 연결1/SQL1이다. 단계 계측으로 ORM 조회와 rules/history를 먼저 구분한다.
