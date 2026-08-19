---
source: "2026-08-19 bkit PDCA Do 단계(/pdca do firewatch --scope module-7,module-8,module-9) 웹 스캐폴딩 중 실측 — [[log]] 2026-08-19"
verified: 2026-08-19
---

# 0007 — Web은 React 18 + AntD v5로 고정, CORS 설정 추가(Design 누락분)

## 상태
채택

## 맥락

`npm create vite@latest`로 `web/`을 생성하니 기본값이 React 19.2.8이었고, `npm install antd`는 antd 6.6.1을 설치했다. 명세서·Design 문서는 각각 "React 18", "Ant Design v5"(`darkAlgorithm` API 포함)를 명시했다 — [[Decisions/0005-spring-boot-4]]의 Spring Boot 상황과 비슷하게 "현재 기본값이 명세보다 앞서 있는" 경우다.

또한 module-7에서 실제로 브라우저(`http://localhost:5173`)로 백엔드(`http://localhost:8080`) API를 호출해보니, 서로 다른 오리진 간 요청이라 CORS 설정 없이는 브라우저가 전부 막았다. Design 문서 어디에도 CORS가 언급되지 않았다 — Plan·Design 둘 다 놓친 부분이다.

## 결정

1. **React는 18로, Ant Design은 v5로 명시적으로 고정한다.** npm에 두 버전 모두 여전히 게시돼 있어(Boot 3.x가 Initializr에서 아예 빠진 것과 다름) 그대로 설치 가능했다 — `npm install react@^18 react-dom@^18 antd@^5`.
2. **백엔드에 CORS 설정을 추가한다.** `firewatch.allowed-origins`(환경변수 `FIREWATCH_ALLOWED_ORIGINS`, 기본값은 로컬 dev 포트 5173/4173)를 `WebFluxConfigurer`로 등록. 배포 후에는 실제 Cloudflare Pages 도메인을 추가해야 한다(BE-8/WEB-5 완료 기준에 반영).

## 근거

- **React 18 / AntD v5 고정** — antd v6는 테마 시스템을 크게 갈아엎어(CSS-in-JS→CSS 변수 계열) Design 문서가 이미 여러 곳(ADR 0002, Design §2.0/Design Anchor, Next-Tasks WEB-1)에서 못박은 `ConfigProvider` + `darkAlgorithm` API가 그대로 안 맞을 수 있다. 명세서의 버전 고정(React 18, antd v5)이 npm에서 여전히 정상 설치되는 한, 이미 내린 설계 결정을 다시 여는 것보다 명세를 따르는 쪽이 쌌다.
- **CORS** — 로컬 dev든 배포든 Web과 Backend가 항상 다른 오리진이라는 사실은 Design 작성 시점에 이미 알 수 있었어야 했다(Cloudflare Pages ↔ Oracle Cloud). 브라우저로 실제 확인하는 과정(module-7)에서야 드러난 것은 Design 리뷰 단계의 허점으로 기록해둔다.

## 결과·트레이드오프

**얻는 것** — Design 문서의 기존 결정(darkAlgorithm 등)을 그대로 구현에 반영할 수 있었다. CORS 없이는 애초에 웹 화면이 하나도 동작하지 않았을 것이므로, 이 발견 자체가 module-7의 핵심 산출물 중 하나다.

**감수하는 것** — React 18/AntD v5는 npm 생태계의 "최신"이 아니므로, 이후 라이브러리 업데이트 시 v6 마이그레이션 여부를 매번 판단해야 하는 부채가 생긴다. `firewatch.allowed-origins` 기본값이 로컬 dev 전용이라, 배포 시(BE-8) 빠뜨리면 프로덕션에서 CORS가 다시 막힌다 — 배포 체크리스트에 반드시 포함할 것.

## 재검토 트리거

- antd v5가 보안 패치를 더 이상 받지 못하게 되면 → v6 마이그레이션(테마 시스템 재작업 포함) 검토.
- BE-8 배포 시 `FIREWATCH_ALLOWED_ORIGINS`에 실제 도메인을 추가하지 않으면 프로덕션 웹이 전부 깨진다 — 배포 체크리스트 항목으로 고정.
