# GameTimingIntegrationTest CI 대기 한도

실패 실행: https://github.com/huni2/FireWatch/actions/runs/38264668472

`Hibernate events report actual JDBC work and game reads preserve saved state`가 `Timeout on blocking read for 5000000000 NANOSECONDS`로 실패했다. 기본 WebTestClient 대기 5초를 사용하던 테스트였다. 보고서에는 START 요청의 정상 완료와 SQL 계측 로그도 남았다. 실패 호출의 정상 START HTTP 처리 로그는 12.694ms로, CI 클라이언트의 전체 대기와 서버 측 처리 시간은 서로 다르다.

테스트 목적은 JDBC 계측 필드/SQL 횟수, 세션·잔고·거래 원장 보존과 실패 시 정리다. 다른 AccountSession/Community/Portfolio/BackupReport 통합 테스트와 동일하게 이 테스트 클라이언트만 20초 대기 한도를 설정한다. 성공 상태·SQL 횟수·잔고·원장·로그 비식별 검증은 유지한다. 자동 재시도나 테스트 건너뛰기는 추가하지 않는다.

운영 서버·Render 환경변수·실제 API 대기 한도·APK는 변경하지 않는다. 기존 #62 작업의 CI 후속 기록이며 새 과제는 생성하지 않는다.
