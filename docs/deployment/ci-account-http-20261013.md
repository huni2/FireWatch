# main 계정 인증 통합 검사 시간 초과

PR #110의 소스·PR CI는 통과했지만 머지 main `35d33f4`의 [CI 38343167984](https://github.com/huni2/FireWatch/actions/runs/38343167984)는 실패했다. 웹·모바일은 통과했고 서버 226개 검사 중 감사로그 인증 검사 1개가 20초 응답 대기를 넘겼다. 머지 이전 성공을 머지 이후 main 성공으로 표시하지 않는다.

실패 보고서는 HTTP exchange의 blocking read 시간 초과이며 권한 결과가 잘못되었다는 assertion 실패가 아니다. 이전 push 실행에서도 같은 클래스의 서로 다른 HTTP 호출에서 지연이 있었다. 보고서만으로 운영 서버 지연이나 공유 Reactor 자원이 근본 원인이라고 확정할 수는 없다.

## 테스트 환경 보완

AccountSessionIntegrationTest의 클라이언트를 기본 Reactor connector에서 [Spring JdkClientHttpConnector](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/client/reactive/JdkClientHttpConnector.html)로 분리한다. [WebTestClient.bindToServer(connector)](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/test/web/reactive/server/WebTestClient.html)는 실제 HTTP 서버와 기존 검사 경로를 유지한다.

- 요청마다 클라이언트를 생성하지 않고 테스트 메서드 내에서 한 클라이언트를 재사용한다.
- Java 21의 HTTP/1.1 전송 자원을 테스트 종료 시 shutdownNow로 정리한다. 초기 close 방식은 취소된 응답 publisher의 종료를 기다렸고, 로컬 스레드 덤프에서 closeTransport→HttpClient.close→awaitTermination을 확인해 채택하지 않았다.
- 기존 20초 응답 제한, 권한·세션·기록 보존 assertion, 실제 RANDOM_PORT HTTP 경로를 유지한다. 운영 코드·스케줄·DB·앱 번들은 바꾸지 않는다.
- 자동 재시도나 검사 생략으로 통과시키지 않는다. 원인 해결을 확정하기 전에 로컬 반복·소스/PR 전체·머지 후 main CI를 대조한다.

로컬 10개 검사(실패/오류/생략 0)는 두 번 연속 통과했다. 첫 실행은 컴파일 포함 38초, 두 번째 실행은 20초였다. 전체 CI와 머지 후 main 결과는 기존 과제 #62의 기록으로 이어서 확인한다. 추가 APK/EAS/OTA 빌드는 실행하지 않는다.
