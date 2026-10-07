# FireWatch Mobile

Expo + React Native + Expo Router 기반 앱. 웹과 동일한 백엔드를 사용하며 개인 포트폴리오, 시장 자료, 별도의 가상 게임, 공지·문의 화면을 제공한다.

## 개발

~~~bash
npm ci
npx expo start
~~~

Expo Go에서 볼 수 있는 화면과 설치 앱 검증을 구분한다. Google 로그인과 Android 원격 푸시는 커스텀 네이티브 빌드·실기기에서 확인한다.

## Android 출시 준비

~~~bash
npm run release:check
npx eas-cli build --platform android --profile preview
~~~

EAS 프로젝트는 이미 app.json에 연결되어 있다. eas.json은 운영 API·Android 공개 OAuth ID를 공통 설정으로 전달한다. preview는 APK, production은 AAB다. 두 Android 프로필의 post-install 검사는 누락된 Firebase 파일·잘못된 API/OAuth/패키지 설정을 차단한다.

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
