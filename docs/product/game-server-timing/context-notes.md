# 결정과 관찰

새 DataSource 프록시나 추정 기반 잠금 제거보다 이미 사용하는 Hibernate7.4.1의 SessionEventListener를 사용한다. 설치된 JAR의 공개 인터페이스와 Boot4.1 HibernatePropertiesCustomizer를 javap로 확인했다. 개인정보가 담긴 입력/SQL 원문은 이벤트 집계에 필요하지 않다. 기본 비활성이며 운영 로그를 볼 도구는 이 환경에 없어 실제 병목 확정은 배포 후 로그 대조가 필요하다.

getCurrentTurn/preview는 PESSIMISTIC_WRITE 조회를 사용하지만 과거 자료 게임은 가격 snapshot을 쓸 수 있다. 단순 readOnly/무잠금 변경은 기존 정합성 검사 없이 하지 않는다. 이번 단계에서는 잠금/평가/원장·시드·규칙을 바꾸지 않는다.

로컬 실제 H2 JDBC 이벤트가 정상 집계됐다. START SQL4회/CURRENT2회와 예외/다음 요청0회 정리를 확인했다. 통합 테스트의 초기 import 경로 오류와 BigDecimal cash scale 비교를 정정했다. 게임 현금 자체를 수정한 것은 아니다. 서버 타이머는 IO 큐/서비스/DTO 반환까지며 HTTP 응답 직렬화·전송·시작 전 기동을 포함하지 않는다. Hibernate 연결/준비/실행 구간이 겹칠 수 있어 합계로 CPU/COMMIT 시간을 추정하지 않는다.

소스7cb6865·PR#22 maind980cc7·Issue#21 종료·CI37892862048/37892900448/main37893278103(재실행2) 전체 성공. PostgreSQL에서도 실제 JPA/게임 HTTP의 이벤트·원장 보존·실패 정리 검사가 통과했다. 운영 Render 배포와 FIREWATCH_GAME_TIMING_ENABLED=true 설정을 사용자에게 요청했다. 비활성 기본과 측정 경계는 유지하며 실제 로그 없이 병목/속도 개선을 확정하지 않는다. 추가 APK 요청0.

사용자 답변은 설정·배포 중이다. 운영 완료로 간주하지 않고 실제 로그 대조는 배포 완료 확인 후 진행한다.

main CI37893278103 첫 실행은 기존 AccountSessionIntegrationTest 감사로그 권한 요청117행에서 응답 timeout으로 실패했다. 계측/게임 회귀는 통과했고, 동일 소스의 push/PR 전체·PostgreSQL 검사는 앞서 성공했다. 관련 테스트는 기존20초 timeout을 이미 사용한다. 측정 코드와 머지 backend는 동일하며 실패한 backend 작업만 재실행했다. 시간 제한을 늘리거나 권한 조건을 완화하지 않는다.

main CI37893278103 재실행2는 전체/H2·실제 PostgreSQL·복원 모두 성공했다. 첫 HTTP timeout은 재현되지 않았고 실패 기록을 보존한다. 테스트/권한 조건을 변경하지 않았다. 사용자의 Render 적용 상태는 여전히 배포 중이며 실제 로그는 아직 확인하지 않았다.
