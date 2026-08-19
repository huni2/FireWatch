---
source: "2026-08-19 bkit PDCA Do 단계(/pdca do firewatch --scope module-1,module-2) 백엔드 스캐폴딩 중 실측 — [[log]] 2026-08-19"
verified: 2026-08-19
---

# 0005 — 백엔드는 Spring Boot 3.2가 아니라 4.1.0을 쓴다

## 상태
채택

## 맥락

원본 명세서(2.1절)는 "Spring Boot 3.2+"를 지정했다. Kotlin+Spring Boot 프로젝트를 Spring Initializr(start.spring.io)로 생성하려고 시도한 결과, 이 시점(2026-08-19) Initializr가 제공하는 `bootVersion` 목록에는 **4.1.0.RELEASE/4.1.1-SNAPSHOT/4.0.7/4.0.8만 있고 3.x는 없었다.** "3.2+"라는 표현 자체는 4.1.0도 만족하지만, Boot 4는 Boot 3 대비 메이저 버전업(Spring Framework 7 기반, Jackson 3 패키지 이동 `com.fasterxml.jackson`→`tools.jackson`, `spring-boot-starter-aop` 아티팩트 제거 등)이라 무시할 수 없는 차이가 있다.

## 결정

**Spring Boot 4.1.0을 그대로 쓴다.** 3.x로 고정하려고 별도로 애쓰지 않는다.

실제로 부딪힌 Boot 4 관련 이슈와 대응:
- `org.springframework.boot:spring-boot-starter-aop` 아티팩트가 Maven Central에 더 이상 없음(3.5.3까지만 존재) → `org.springframework:spring-aspects`를 직접 추가해서 해결.
- `spring-boot-starter-webflux`만으로는 `WebClient.Builder` 빈이 오토컨피그되지 않음(Boot 3에서 되던 것과 다름, `@SpringBootTest` 컨텍스트 로딩 실패로 발견) → `GeminiClient`가 `WebClient.builder()`를 직접 호출하도록 변경, 빈 주입에 의존하지 않음.
- Jackson이 3.x로 이동해 패키지가 `tools.jackson.*`로 바뀜 → 이 프로젝트는 Jackson API를 직접 다루지 않고(Spring 자동 직렬화에 위임) TEXT 컬럼(키워드·추천종목 등)은 애초에 JSON 대신 쉼표 구분 문자열로 단순화해([[../../docs/02-design/features/firewatch.design]] §3.1 주석) 이 문제를 아예 피해갔다.

## 근거

- **명세서 문구가 이미 하위호환을 허용한다** — "3.2+"는 상한을 정하지 않았다.
- **Initializr가 3.x를 더 이상 서비스하지 않는 시점에 3.x를 억지로 맞추면**(수동으로 옛 버전 BOM을 지정) 이후 라이브러리 호환성·보안 패치를 계속 수동으로 추적해야 한다 — 1인 프로젝트에 유지보수 부담이 크다.
- 실제로 컴파일·`AuditLogAspectTest`·`SchedulerJobTest`·`GeminiClientTest` 전부 통과하고, `java -jar`로 기동해 Netty 서버가 뜨는 것까지 확인했다(H2 파일 DB 생성, schema.sql 반영, JPA/AOP 빈 정상 등록) — 3.2를 못 쓴다고 해서 뭔가 근본적으로 막힌 것은 아니었다.

## 결과·트레이드오프

**얻는 것** — 최신 보안 패치·기능이 적용된 버전으로 시작. Initializr 기본 경로를 그대로 써서 유지보수 마찰이 적다.

**감수하는 것** — 명세서 작성 시점에 저자가 상정했을 Boot 3.x 문서·예제(대부분의 온라인 Spring Boot 튜토리얼이 아직 3.x 기준)가 그대로 들어맞지 않을 수 있다. 이후 세션에서 Spring 관련 코드를 작성할 때 "이게 Boot 3 지식으로 쓴 코드인지" 항상 의심하고, 안 되면 Boot 4 변경사항부터 검색해야 한다(sympo-studio의 `AGENTS.md`가 Next.js에 대해 남긴 경고와 같은 이유).

## 재검토 트리거

- Boot 4 기반 라이브러리 생태계(특히 Firebase Admin SDK, 각종 금융 API 클라이언트)가 호환성 문제를 일으키면 → 3.5.x로 다운그레이드 재검토.
