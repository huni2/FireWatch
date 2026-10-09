# 결정과 관찰

새 DataSource 프록시나 추정 기반 잠금 제거보다 이미 사용하는 Hibernate7.4.1의 SessionEventListener를 사용한다. 설치된 JAR의 공개 인터페이스와 Boot4.1 HibernatePropertiesCustomizer를 javap로 확인했다. 개인정보가 담긴 입력/SQL 원문은 이벤트 집계에 필요하지 않다. 기본 비활성이며 운영 로그를 볼 도구는 이 환경에 없어 실제 병목 확정은 배포 후 로그 대조가 필요하다.

getCurrentTurn/preview는 PESSIMISTIC_WRITE 조회를 사용하지만 과거 자료 게임은 가격 snapshot을 쓸 수 있다. 단순 readOnly/무잠금 변경은 기존 정합성 검사 없이 하지 않는다. 이번 단계에서는 잠금/평가/원장·시드·규칙을 바꾸지 않는다.

로컬 실제 H2 JDBC 이벤트가 정상 집계됐다. START SQL4회/CURRENT2회와 예외/다음 요청0회 정리를 확인했다. 통합 테스트의 초기 import 경로 오류와 BigDecimal cash scale 비교를 정정했다. 게임 현금 자체를 수정한 것은 아니다. 서버 타이머는 IO 큐/서비스/DTO 반환까지며 HTTP 응답 직렬화·전송·시작 전 기동을 포함하지 않는다. Hibernate 연결/준비/실행 구간이 겹칠 수 있어 합계로 CPU/COMMIT 시간을 추정하지 않는다.
