<img src="asset/firewatchlogo.png" width="110" alt="FireWatch" />

# FireWatch

**시장 자료와 개인 투자 기록을 연결하는 웹·Android 투자 점검 서비스.**

관심 기업의 가격·차트·뉴스와 AI 분석 근거를 살펴보고, 직접 등록한 보유 자산의 비중·집중·중복을 점검합니다. 투자 연습은 별도의 가상 게임으로 제공합니다. 실제 주식 주문이나 증권사 자동 연동은 제공하지 않습니다.

[웹에서 시작하기](https://firewatch-eqp.pages.dev) · [Android 안내](#android-이용) · [개발 포트폴리오 사례](docs/portfolio/firewatch-case-study.md) · [배포 안내](DEPLOY.md)

## 주요 기능

| 기능 | 제공하는 내용 |
|---|---|
| 내 투자 | 보유 자산·수량·선택 입력인 평균 구매 가격·현금 등록, 구성 비중과 평가 자료 상태 점검 |
| 투자 메모·복기 | 투자 판단과 점검 기록 보관, 이전 점검과 비교 |
| 기업 탐색 | 회사명·분야 검색, 관심 기업, 가격·차트와 관련 기사 |
| 시장 자료·AI 분석 | 장전 브리핑, 지수·환율·금·은·채권 자료, 이유·위험·기사 근거가 있는 후보 |
| 저장 뉴스 | 날짜·키워드별 뉴스 검색과 원문 연결 |
| 나에게 맞는 투자 방식 찾기 | 로그인 없이 10문항 자기점검, 선택한 경우에만 기기에 결과 보관·재검사·삭제 |
| 투자 연습 | 가상 가격·뉴스·지표로 진행하는 주간 게임, 거래 기록·회고와 선택적 순위 등록 |
| 계정·지원 | Google 계정 연결, 관심·알림 설정, 공지·의견·문제 신고 |

AI 해석과 구성 초안은 참고 정보이며 수익이나 개인별 투자 적합성을 보장하지 않습니다. 게임의 가격·뉴스·픽은 가상 자료입니다. [투자 정보 제공 범위](docs/product/investment-information-boundary.md)를 확인하세요.

## 무료 운영 원칙

FireWatch는 **무료 API와 인프라의 제공 범위 안에서 운영**합니다. 일반 사용자에게 이용료나 개인 Gemini API 키 등록을 요구하지 않으며, 유료 API 도입이나 사용자별 API 키 입력을 전제로 운영하지 않습니다.

외부 API 키는 서버 운영자가 서버 환경변수로 관리합니다. 웹·앱에 운영 비밀을 넣지 않습니다. 저장소를 직접 실행하는 개발자의 환경 설정은 일반 사용자의 서비스 이용과 구분합니다.

무료 제공처의 호출 한도·일시 장애·서버 콜드스타트로 자료 갱신이 늦어지거나 일부 기능이 제한될 수 있습니다. 운영 목표는 **외부 API가 실패해도 확보한 자료는 계속 제공하고, 정해진 한도 안에서 복구하는 것**입니다.

## 자료 갱신과 장애 대응

앱과 웹은 서버에 저장된 자료를 조회합니다. 화면 새로고침이 모든 외부 API의 즉시 재수집을 뜻하지 않으며, 장전 브리핑과 독립적인 뉴스·시세 수집은 각각의 예약 작업으로 실행합니다. 예약 호출 자체의 지연도 발생할 수 있습니다.

### 현재 적용된 동작

| 상황 | 처리 |
|---|---|
| Gemini 일시 오류 | 기본 `gemini-3.6-flash`가 503·시간 초과 등으로 실패하면 남은 호출 예산 안에서 무료 `gemini-3.5-flash-lite` 시도 |
| AI가 응답하지 않음 | 확보한 지표·기사 제목·자료 기록 시각으로 기본 브리핑 제공. 미확보 항목과 AI 해설 부재를 명시하며 `FALLBACK` 상태 유지 |
| FALLBACK 복구 | 저장된 지표·뉴스·브리핑 ID·생성 시각을 보존. 정상·과거 브리핑은 재작성하지 않음 |
| 반복 실패·한도 초과 | DB 작업 임대·종류별 실패 한도와 별도로, 기본·보조 모델의 실제 요청 예산을 합쳐 한국 날짜당 최대 3회로 제한. 기존 당일 실패도 차감하며 HTTP 401·403·429는 즉시 중지 |
| 일부 금융 자료 누락 | 정상 수집 항목은 저장하고 누락 항목을 실패 코드로 기록. 이전 정상 관측 이력 보존 |
| FALLBACK 상태의 별도 추천 분석 | Gemini 추가 호출을 보류하고 브리핑 복구를 우선 |
| 정상 브리핑의 추천 분석 | 생성된 근거와 실제 포함 기사를 재사용해 보관. 추가 Gemini 호출 없이 추천 0건도 정상 완료하며 과거 근거는 새로 만들지 않음 |
| 예약 호출 지연 | 서버 기동 10초 후 및 깨어 있는 동안 5분마다 미완료 작업 확인. DB의 다음 실행 시각·임대·예산을 지키며 휴면 중 실행은 보장하지 않음 |
| 원인 확인 | 운영자 감사로그·장애 알림과 수동 진단 제공. 수동 진단 출력에는 키·프롬프트·AI 본문을 포함하지 않음 |

2026-10-20 모델 전환·FALLBACK 복구에 이어, 10-21에 무료 보조 모델·기본 브리핑·분석 재사용·주기 복구를 보완했습니다. 외부 제공처의 가용성은 보장하지 않습니다. `NORMAL`은 AI 요약 생성 상태이며 모든 금융 항목의 완전성을 뜻하지 않습니다. [이전 운영 기록](docs/maintenance/briefing-recovery/context-notes.md) · [이번 보완과 검증](docs/maintenance/briefing-resilience/context-notes.md).

### 앞으로 보완할 동작

아래 항목은 개선 방향이며 아직 모두 구현된 상태는 아닙니다.

- 환율 제공처의 인증·연결·응답 오류를 비밀값 없이 구분해 기록하기.
- 환율 갱신 실패 시 마지막 정상값을 출처·기준일과 함께 화면에 표시하기.

## Android 이용

2026-10-20 기준, **공개 다운로드와 로컬 빌드 결과물은 다릅니다.**

| 구분 | 확인된 버전 | 이용·배포 상태 |
|---|---|---|
| 공개 테스트 APK | 1.0.11 / 빌드16 | [APK 다운로드](https://github.com/huni2/FireWatch/releases/download/v1.0.11-android-preview/FireWatch-1.0.11-android.apk) · [릴리스·SHA-256](https://github.com/huni2/FireWatch/releases/tag/v1.0.11-android-preview) |
| 로컬 직접 설치 APK | 1.0.12 / 빌드17 | 검색·등록·내 투자 점검 개선. [빌드 검증](docs/product/android-preview-20261009/android-112-build.json) |
| 최신 준비 AAB | 1.0.14 / 빌드19 | 투자 방식 자기점검 포함. 서명·패키지·버전 검증 완료. Play 업로드·게시와 실기기 검증은 확인 전. [검증 기록](docs/deployment/investment-style-20261018.json) |

공개 1.0.11 APK에는 이후 추가된 메모·자기점검 등 최신 앱 기능이 포함되지 않습니다. AAB는 Play 업로드용이며 휴대폰에 직접 설치하는 APK가 아닙니다. Play 설치 앱의 Google 로그인 오류10은 OAuth 등록과 실제 로그인 성공 확인이 남아 있습니다. [로그인 점검 절차](docs/deployment/google-play-login-20261018.md).

APK는 휴대폰에서 열어 기존 앱 위에 업데이트합니다. 필요한 경우 파일을 여는 앱의 ‘이 출처의 앱 설치 허용’을 켭니다. 설치 실패 시 기존 앱을 삭제하기 전에 원인을 확인하세요. Expo Go는 필요하지 않습니다.

**서버 처리만 바뀌고 API 계약이 유지되는 변경은 기존 앱에도 적용됩니다.** 이번 Gemini 전환·복구 수정은 앱 재배포가 필요하지 않습니다. 앱 화면·기능·네이티브 설정의 변경은 새 설치본이 필요하며, 웹 배포만으로 설치 앱이 갱신되지는 않습니다.

세부 빌드·출시 이력은 [Android 개발 안내](mobile/README.md), [Play 제출 안내](mobile/PLAY_STORE.md), [실기기 검증](docs/deployment/android-release-check.md)에서 관리합니다.

## 서비스 구성

| 영역 | 구성 |
|---|---|
| 웹 | React 18 · TypeScript · Vite 8 · Ant Design 5 / Cloudflare Pages |
| Android | Expo SDK 57 · React Native 0.86 · Expo Router · NativeWind |
| 백엔드 | Kotlin 2.3 · Java 21 · Spring Boot 4.1 / Render |
| 저장소 | 운영 Supabase PostgreSQL · JPA/JDBC, 로컬 기본 H2 |
| 외부 자료 | Yahoo Finance · 한국수출입은행 · 한국은행 ECOS · RSS |
| 분석·알림 | 서버 Gemini API · Web Push · Expo Notifications / FCM |
| 예약·검증 | GitHub Actions 예약 폴링·CI, 백엔드 자체 예약 작업 |

웹과 앱은 같은 REST API를 사용하며 DB에 직접 접근하지 않습니다. 백엔드는 WebFlux/WebClient와 JPA/JDBC를 함께 사용합니다. 외부 수집 중에는 DB 저장 트랜잭션을 유지하지 않으며, 운영 API는 서버 전용 키 또는 검증된 운영자 세션으로 제한합니다.

검색은 PostgreSQL 기반 카탈로그와 외부 검색 경로를 사용합니다. 한국 상장법인 목록과 편집한 분야·ETF 목록의 범위는 서로 다릅니다. [상장법인 자료 출처·범위](docs/product/krx-company-directory/data-source.md).

## 로컬 실행과 검증

Java 21과 Node.js 22를 준비합니다. 아래 각 실행은 **저장소 루트에서 별도 터미널**로 시작합니다.

```powershell
# 백엔드 — 기본 H2, 포트 8080
cd backend
.\gradlew.bat bootRun
```

```powershell
# 웹 — web/.env.example을 참고해 .env 구성
cd web
npm ci
npm run dev
```

```powershell
# 앱 — mobile/.env.example을 참고해 환경 구성
cd mobile
npm ci
npx expo start
```

검증 명령은 각 디렉터리에서 실행합니다.

| 영역 | 명령 |
|---|---|
| 백엔드 | `./gradlew build` 또는 Windows에서 `.\gradlew.bat build` |
| 웹 | `npm run lint` · `npm run build` |
| 앱 | `npm run lint` · `npx tsc --noEmit` · `npm run release:check` |

외부 API 키가 없는 로컬 환경에서는 실제 AI 분석·일부 자료 수집·푸시를 모두 검증할 수 없습니다. 서버용 키·DB 비밀번호를 `VITE_*`나 `EXPO_PUBLIC_*`에 넣지 않습니다. 환경변수와 실행 구성은 [배포 안내](DEPLOY.md)를 참고하세요.

[CI](.github/workflows/validate.yml)는 백엔드·PostgreSQL 통합·백업 복원, 웹 lint/build, 모바일 lint/타입·출시 설정 등을 확인합니다. 2026-10-21 서버 배포 코드의 [전체 CI](https://github.com/huni2/FireWatch/actions/runs/39525932572)는 통과했습니다. CI 성공은 외부 API의 현재 가용성이나 실제 Android 로그인·푸시 수신을 보장하지 않습니다.

## 문서

| 목적 | 문서 |
|---|---|
| 제품 범위 | [출시 기능 범위](docs/product/release-scope.md) · [투자 정보 제공 범위](docs/product/investment-information-boundary.md) |
| 운영 | [배포·환경변수](DEPLOY.md) · [운영자 인증](docs/deployment/operator-access.md) · [자료 보관·백업·복구](docs/deployment/data-preservation.md) |
| Android | [개발 안내](mobile/README.md) · [Play 제출](mobile/PLAY_STORE.md) · [설치 검증](docs/deployment/android-release-check.md) |
| 기능 상세 | [투자 점검](docs/product/investor-checkup-pilot.md) · [투자 메모](docs/product/investment-notes-mvp.md) · [자기점검](docs/product/investment-style-self-check.md) · [가상 게임](docs/product/game-weekly-design.md) |
| 설계·작업 기록 | [현재 맥락](llm-wiki/Context.md) · [열린 과제](llm-wiki/Next-Tasks.md) · [설계 결정](llm-wiki/Decisions/) · [작업 로그](llm-wiki/log.md) |
| 개발 사례 | [문제·판단·검증과 남은 한계](docs/portfolio/firewatch-case-study.md) |

개발 과정에서는 Claude Code와 Codex를 활용했습니다. 요구사항과 기술 결정, 실패·검증 결과를 코드와 함께 기록하며 생성된 결과는 테스트와 운영 확인으로 검토합니다.
