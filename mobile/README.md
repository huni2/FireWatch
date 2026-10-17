# FireWatch Mobile

Expo + React Native + Expo Router 기반 앱. 웹과 동일한 백엔드를 사용하며 개인 포트폴리오, 시장 자료, 별도의 가상 게임, 공지·문의 화면을 제공한다.

## Play 업로드용 AAB

2026-10-17, **1.0.13 / versionCode18**. 파일은 `dist/FireWatch-1.0.13-play.aab`(44,447,531 bytes), SHA-256 `7853b826e1d1613bb9b61560cdb0572ff6d64e13a45c6dc3e8a29301489fe049`입니다. 메모·복기·달력과 등록/점검 개선을 포함합니다. 기존 Play 업로드 인증서 일치, AAB 구조, manifest와 포함된 Expo 설정의 패키지·버전을 확인했습니다. 무료 로컬 Gradle 빌드이며 EAS 빌드 요청은 없습니다.

Play Console의 기존 비공개 테스트 트랙에 새 버전으로 업로드합니다. [출시 메모](../docs/deployment/android-113-release-notes.txt). 실제 Android 설치 검증과 Play 제출·심사·배포는 아직 완료하지 않았습니다. AAB 파일은 직접 설치용 APK가 아닙니다.

## 이전 설치용 APK

최신 **로컬 테스트 버전 1.0.12 / versionCode17 (2026-10-14)**. 파일은 `dist/FireWatch-1.0.12-android.apk`입니다. [검증 기록](../docs/product/android-preview-20261009/android-112-build.json).

종목 검색 결과를 눌러 보유 자산을 등록하고, 수량과 선택 입력인 평균 구매 가격을 구분합니다. 다른 종목을 선택할 때 기존 수량·가격을 초기화하며 중복 종목은 기존 기록 수정으로 연결합니다. 내 투자 점검 화면에 평가 자료 상태·보유 비중·ETF 지수명 중복·관련 소식과 수량 수정 경로를 배치했습니다.

54,389,992 bytes(약 54.4MB), SHA-256 `449581279c339721b8f0c4b6ab1f1838295ba72c52f216d238dd753c0d4c0b04`. 기존 1.0.11과 같은 서명·패키지/버전·ARM32/64·R8·ZIP 무결성·16KB ZIP 정렬·네이티브 모듈·새 검색/점검 코드 포함을 확인했습니다. 모바일 검사84개·공통 등록/점검 검사14개·타입·린트·출시 설정 검사를 통과했습니다. Expo 클라우드 빌드 요청0회.

기준 커밋 `7f27c91`와 미커밋 작업 트리 변경으로 빌드했습니다. Expo Go 없이 기존 앱 위에 업데이트합니다. 실제 Android 설치·로그인·푸시·키보드·제스처·접근성은 확인 전입니다. Play 게시본/AAB가 아닙니다.

2026-10-14 Render 백엔드와 점검 기록용 스키마 배포를 완료했습니다. APK1.0.12에서 자료를 다시 확인하거나 앱을 재실행하면 첫/이번 점검 저장·이전 점검 비교를 사용할 수 있습니다. 애플 검색·카탈로그 정보와 기업 별칭 뉴스 매칭 보완도 서버에 반영됐습니다. 시세·뉴스 수집 간격 단축과 새로고침 시 외부 자료 재수집은 이번 변경에 포함되지 않습니다.

공개 다운로드는 아직 이전 **1.0.11 / versionCode16**입니다. 이번 수정은 그 파일에 들어 있지 않습니다. [이전 APK 다운로드](https://github.com/huni2/FireWatch/releases/download/v1.0.11-android-preview/FireWatch-1.0.11-android.apk) · [이전 공개 릴리스](https://github.com/huni2/FireWatch/releases/tag/v1.0.11-android-preview).

## 개발

~~~bash
npm ci
npx expo start
~~~

Expo Go에서 볼 수 있는 화면과 설치 앱 검증을 구분한다. Google 로그인과 Android 원격 푸시는 커스텀 네이티브 빌드·실기기에서 확인한다.

## Android 출시 준비

~~~bash
npm run release:check
npm run build:apk
~~~

EAS 프로젝트는 이미 app.json에 연결되어 있다. eas.json은 운영 API·Android 공개 OAuth ID를 공통 설정으로 전달한다. preview는 APK, production은 AAB다. 두 Android 프로필의 post-install 검사는 누락된 Firebase 파일·잘못된 API/OAuth/패키지 설정을 차단한다.

### 웹·서버 배포와 별도 실행

이번 사용자 요청으로 최신 작업 트리의 1.0.12/versionCode17를 로컬에서 빌드했다. 자동 APK/EAS 빌드는 계속 비활성이다. 웹·서버 배포나 Git push만으로 APK를 생성하지 않으며 이후 설치본도 별도 요청이 있어야 만든다.

로컬 빌드는 `npx expo prebuild --platform android --no-install`로 네이티브 프로젝트를 갱신한 뒤 Gradle `:app:assembleRelease`를 실행한다. preview의 ARM32/64 및 R8/리소스 축소 설정이 실제 gradle.properties에 반영되는지 확인한다. 생성 프로젝트는 기본 debug 서명이므로 공개 전에 기존 release 키로 서명하고 이전 APK와 인증서를 비교한다. 이번 PC 빌드는 heap3GiB/meta1GiB·최대 작업자2로 실행한다. 키·비밀번호·Firebase 파일·생성 android 폴더는 커밋하지 않는다.

`npm run build:apk`는 EAS 클라우드를 선택하는 대안이며, 사용자 설치본 요청과 잔여량 확인 후 수동 실행한다. Play 게시를 실행하지 않는다. CI 타입/린트·로컬 export는 EAS 빌드 횟수를 사용하지 않는다. 설치 앱에 코드·네이티브 설정을 반영할 때 APK를 별도로 만들며 현재 EAS Update 자동 배포는 설정하지 않았다. 이전 빌드/오류/보류 결정은 [Android 검증 이력](../docs/deployment/android-release-check.md)에 보존한다.

로컬 google-services.json 또는 EAS 파일 변수 GOOGLE_SERVICES_JSON이 필요하다. app.config.js가 연결한다. EAS FCM V1 자격증명과 Google 서명 SHA-1은 별도로 설정·검증한다. 서버 운영 키·클라이언트 비밀번호는 앱 환경변수에 넣지 않는다.

[Play 제출 안내](./PLAY_STORE.md)와 [실기기 검증 목록](../docs/deployment/android-release-check.md)을 따른다. 설정 검사 통과는 실제 로그인·푸시·심사 통과를 의미하지 않는다.

## 이전 APK

[기존 공개 APK](https://github.com/huni2/FireWatch/releases/download/mobile-android-preview/FireWatch-mobile.apk)는 과거 빌드다. 최근 공지·피드백·보안 변경이 포함되었다고 보장하지 않는다. 새 APK는 실기기 검증과 빌드 커밋 확인 후 릴리스에 올린다.

## 구조

- src/app: Expo Router 경로
- src/features: 기능별 화면과 상태
- src/lib: API·기기·세션·캐시
- scripts/release-check.cjs: Android 출시 설정 검사

웹 배포가 완료되어도 APK는 자동 갱신되지 않는다. 현재 남은 확인은 설치 앱 Google 왕복·실제 푸시·공지/문의/삭제와 Play 제출 양식이다.

### 1.0.3 용량·로그인 복구 확인

- 사용자 최신화 요청으로1.0.3을 빌드했다. 이번 요청이 자동 빌드 재활성화나 이후 반복 빌드 승인은 아니다.
- preview APK는ARM32/64 휴대폰을 지원하고 x86 에뮬레이터는development 프로필로 빌드한다. 로컬 prebuild는 FIREWATCH_ANDROID_PROFILE로 프로필 선택(기본preview), EAS는 EAS_BUILD_PROFILE 사용. 생성된 android 폴더를 사용하는 로컬 빌드는 다음 승인 시 prebuild로 설정을 다시 반영해야 한다.
- release R8/리소스 축소 후 첫 실행, 차트, Google SDK, 푸시, 테마를 실제 기기로 확인한다. 용량 감소량은 새 APK 측정 전 확정하지 않는다.
- 만료된 기존 세션 복구는 서버의 /api/auth/google/renew 배포가 필요하다. 네트워크/Google 증명 실패는 자동 반복 없이 설정의 수동 로그인으로 복구한다. 로그아웃·기기 해제는 자동 로그인하지 않는다.

### 1.0.3 이후 상단 테마·순위 창 소스 변경

상단 해/달 스위치를 왼쪽(라이트)·오른쪽(다크)으로 전환하며 이 기기에 저장한다. 설정 화면에 들어가지 않아도 최초 동의·각 메뉴 헤더에서 바꿀 수 있다. 설정의 세 가지 테마 선택은 제거했으며 기존 기기 설정 저장값은 호환한다. 순위 창은 상단 제목/닫기를 고정하고 목록만 스크롤한다.

타입/lint·테마/로딩9검사·Android JS export 및360/390px 격리 화면 검증 완료. 실제Android 드래그/TalkBack은 확인 전이다. 당시 공개 APK1.0.5에 로딩 정지 수정과 이번 변경을 포함했다. 이후 APK는 사용자 별도 요청 후 빌드한다.

### 전체 UX 리뷰 소스 후속

기업 탐색 검색을 하나로 모으고 후보·분야·ETF를 나눈다. 방문한 탭은 유지하며 숨긴 화면의 조회/폴링/로딩은 중단한다. Google 연결·로그아웃·현재 세션 무효화 때 보관 화면을 비운다. 회사 상세에서 보유 등록으로 회사 정보를 이어주고 저장한 자산/점검 결과를 강조한다. 게임은 주문 시트에서 총액을 보고 고정 확인 버튼을 누른다. 닫기는 입력 유지, 다음 턴·종료·새 게임은 초기화한다.

타입/lint·모바일45회귀 및 Android JS export 검증. 당시 공개 APK1.0.5에 포함했다. 실제 Android 키보드/TalkBack/Alert 체결 확인은 남아 있으며 이후 새 APK는 별도 요청으로 진행한다. APK/EAS/OTA 자동 실행 없음.

### 1.0.4 제보 후속 — 1.0.5에 포함

게임 규칙 문단·시작 전 난이도/공매도 설명, 원터치 관심 기업 해제, 차트 터치 가격·시각, 뉴스 외부 이동 안내, 중앙 메시지와 기기별 알림 해제를 소스에 반영했다. 브리핑은 KST 하루 최대 3시간, 새 소식은 관심 키워드 기준 최대 한 시간에 한 번으로 선택할 수 있다. 새 알림 API는 Render 최신 코드 배포가 필요하다. [변경·발송 기준·검증](../docs/product/web30-support-design/interaction-review-20261012.md).

당시 APK1.0.5에 이번 후속과 화면 정리를 함께 포함했다. 이후 자동/추가 APK/EAS 빌드는 실행하지 않는다.

### 1.0.5 제보 후속 — 1.0.6에 포함

보유 등록·게임 시작 버튼 대비, 공통 시트와 손잡이 닫기, 관심 해제 시 상세 유지, 설정 저장 고정, 좁은 화면 글자/줄바꿈/메시지 폭을 새 설치본에 포함했다. 자동 APK/EAS/OTA 빌드는 활성화하지 않았다.

### 1.0.6 제보 후속 — 1.0.7에 포함

양쪽 모드의 밝은 버튼·짙은 글씨, 브리핑 관심 추가/해제와 처리 표시, 마지막 관심 기업 삭제, 긴 브리핑 스크롤, 지표7/30일 그래프·터치 날짜/원래 값을 포함했다. 실제 Android 설치 피드백은 별도로 확인하며 자동 APK/EAS/OTA는 활성화하지 않는다.
