# FireWatch Mobile

Expo + React Native + Expo Router 기반 앱. 웹과 동일한 백엔드를 사용하며 개인 포트폴리오, 시장 자료, 별도의 가상 게임, 공지·문의 화면을 제공한다.

## 설치용 APK

최신 테스트 버전 **1.0.2 / versionCode 7 (2026-10-12)**: [APK 다운로드](https://github.com/huni2/FireWatch/releases/download/v1.0.2-android-preview/FireWatch-1.0.2-android.apk) · [릴리스·SHA-256](https://github.com/huni2/FireWatch/releases/tag/v1.0.2-android-preview). 동의 후 차트 의존성 누락 수정·앱 내부 안내·새 아이콘을 포함한다. 로컬 Gradle로 빌드했으며 EAS 클라우드 횟수는 사용하지 않았다. 기존 설치본과 서명이 같고 Expo Go 없이 설치한다. 실기기 시작·재실행·로그인·푸시 확인과 Play 게시는 별도다.

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

2026-10-12 사용자의 수정 APK 재요청으로 이번 빌드 보류를 해제하고, 소스 b600f97의 1.0.2/versionCode7을 로컬에서 생성·서명·검증해 GitHub에 공개했다. 자동 빌드는 계속 비활성이다. 아래 1.0.1 빌드·보류 문단은 당시 이력이며 다음 설치본은 다시 사용자 요청이 있어야 만든다.

로컬 Android 빌드는 Expo를 제거하지 않고 `npx expo prebuild --platform android --no-install`로 생성한 네이티브 프로젝트에서 Gradle `:app:assembleRelease`를 실행한다. 생성된 프로젝트는 기본 debug 서명이므로 배포 전 기존 release 키로 서명하고 이전 APK와 인증서를 비교해야 한다. SDK·NDK·CMake·Gradle 첫 준비는 오래 걸릴 수 있다. 이번 기본 JVM 2GiB/메타스페이스512MiB 경고도 기록했으며 다음 빌드 전에 PC 메모리에 맞춰 조정한다. 키·비밀번호·google-services.json·생성 android 폴더는 커밋하지 않는다.

2026-10-11 사용자 요청으로 최신 설치본 1.0.1/versionCode6의 preview 빌드를 한 번 실행한다. 자동 빌드는 계속 비활성 상태이며, 이후에도 설치본 요청이 있을 때만 실행한다. 이전 versionCode5의 완료 상태는 확인했으며 재요청하지 않는다.

같은 날 설치본 피드백 후 사용자가 APK 재빌드를 명시적으로 보류했다. 시작 전 개인정보 전문·도움말·투자 정보 안내의 앱 내부 화면 수정은 소스에만 반영하며, 다음 APK 빌드를 직접 요청하기 전에는 EAS 빌드·APK 교체를 실행하지 않는다. 현재 배포된 1.0.1에는 이 후속 변경이 포함되지 않는다.

`build:apk`는 사용자가 모바일 설치본을 요청할 때만 수동 실행한다. 웹/서버 배포, Git push, CI 검증에서는 실행하지 않는다. 실행 전 무료 잔여량을 확인하고 모바일 변경을 모아 한 번만 빌드한다. 명령은 APK 생성 요청이며 Play 게시를 실행하지 않는다.

CI의 타입·린트·출시 설정 테스트와 로컬 `expo export`는 EAS APK 빌드 횟수를 쓰지 않는다. 웹만 수정했거나 서버 API만 배포했으면 APK를 다시 만들 필요가 없다. 앱 소스·공유 코드·네이티브 설정이 바뀌어 설치본에 반영해야 할 때 별도로 만든다. 현재 EAS Update를 배포 경로로 설정하지 않았으므로 앱 코드가 기존 APK에 자동 반영된다고 안내하지 않는다.

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
