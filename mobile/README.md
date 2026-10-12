# FireWatch Mobile

Expo + React Native + Expo Router 기반 앱. 웹과 동일한 백엔드를 사용하며 개인 포트폴리오, 시장 자료, 별도의 가상 게임, 공지·문의 화면을 제공한다.

## 설치용 APK

최신 테스트 버전 **1.0.3 / versionCode 8 (2026-10-12)**: [APK 다운로드](https://github.com/huni2/FireWatch/releases/download/v1.0.3-android-preview/FireWatch-1.0.3-android.apk) · [릴리스·SHA-256](https://github.com/huni2/FireWatch/releases/tag/v1.0.3-android-preview).

1.0.2 이후 네이티브 Google 계정 연결·만료 세션 복구·통합 준비/로딩·라이트/다크/기기 테마 저장·게임 시작 마스코트·상단 메뉴와 고정 게임 요약·동의 여백 정리를 포함합니다. 기본은 라이트입니다. 휴대폰 ARM32/64를 유지하고 에뮬레이터 ABI를 제외했으며 R8/리소스 축소를 적용했습니다. Expo Go 없이 기존 앱 위에 업데이트로 설치합니다. 실제 Google/푸시/접근성 확인은 별도이며 Play 게시본이 아닙니다.

소스 `a6aaa0c`를 PC에서 로컬 Gradle로 빌드했습니다. 파일 크기54,303,976bytes(약54MB), 기존1.0.2보다 약52% 감소했습니다. 이전 APK와 서명 일치 및 Google/차트/마스코트 포함을 검증했습니다. EAS 클라우드 빌드 요청0. 실제 빌드·서명·파일 크기·업로드 결과는 [검증 기록](../docs/deployment/android-release-check.md)에 남깁니다.

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

이번 사용자 요청으로 소스 `a6aaa0c`의 1.0.3/versionCode8을 로컬에서 빌드했다. 자동 APK/EAS 빌드는 계속 비활성이다. 웹·서버 배포나 Git push만으로 APK를 생성하지 않으며 이후 설치본도 별도 요청이 있어야 만든다.

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
