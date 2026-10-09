# 게임 첫 HTTP 요청의 관측 경계 보완

BE-38 운영 START SQL3·TRADE4·재전송3 확인. 첫 START 서비스server2903.904ms와 클라이언트15885.3ms 사이 약13초는 서비스 타이머 밖이며 SQL/규칙으로 단정할 수 없다. 요청 전후·JSON codec·DNS/TLS/전송 중 구간을 먼저 구분한다.

기존 서버 RequestLatency의 Server-Timing application;dur 숫자와 클라이언트 헤더 도착/본문 읽기 시간을 검증 보고서에 추가한다. 기존.elapsedMs·43요청/60회한도·격리 기기·멱등·실패 중단·비식별·종료 보존은 유지한다. 응답 헤더 원문은 기록하지 않고 application 숫자만 허용하며 없는/잘못된 헤더는 null이다.

applicationMs는 기존 필터 진입~beforeCommit 경계로 직렬화 등 일부 서비스 바깥 처리를 포함할 수 있지만 필터 이전/본문 전송 전체를 포함하지 않는다. headersMs는 DNS/TLS·요청·응답 준비 등을 포함하고 bodyReadMs도 순수 네트워크 단독 시간이 아니다. 서버 로그와 클라이언트는 시계가 달라 timestamp 차이를 순수 구간으로 해석하지 않는다.

mock 테스트로 정확한 수치 파싱/누락/비숫자·원문 비노출·정상43요청/실패 중단을 검증하고 CI·PR에 기록한다. backend·배포·DB·게임 규칙·APK를 변경하지 않는다. 새 JVM의 첫 요청 자료가 아직 없으므로 속도 개선을 주장하지 않는다.
