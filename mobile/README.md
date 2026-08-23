# FireWatch Mobile

Expo(React Native) + NativeWind + Expo Router 기반 FireWatch 모바일 앱. `web/`이 소비하는 것과 동일한 백엔드 API를 재사용한다 — 자세한 배경은 `docs/02-design/features/mobile-app.design.md` 참조.

## 시작하기

```bash
npm install
npx expo start
```

터미널에 뜨는 QR코드를 [Expo Go](https://expo.dev/go) 앱으로 스캔하면 실기기에서 확인할 수 있다. 이 개발 환경(Windows)에서는 iOS 시뮬레이터를 쓸 수 없어 실기기 검증이 기본 경로다.

### 푸시 알림 테스트 전 1회만: EAS 프로젝트 연결

FCM 토큰 등록(APP-2)은 Expo Push Service를 쓰는데, `getExpoPushTokenAsync()`가 `app.json`의
`extra.eas.projectId`를 필요로 한다. 무료 Expo 계정으로 한 번만 연결하면 된다.

```bash
npx eas login    # 계정 없으면 https://expo.dev 에서 무료 가입
npx eas init     # app.json에 extra.eas.projectId를 자동으로 채워준다
```

연결 전에는 앱이 크래시하지 않고 콘솔에 경고만 남기며 토큰 등록을 건너뛴다(`useNotificationRegistration.ts`).

## 폰에 설치하기(APK 다운로드)

스토어 등록 없이 APK 파일을 직접 받아 설치하는 방식 — Android만 지원한다(iOS 사이드로드는 Apple
Developer Program 연 $99가 필요해 이 프로젝트의 "월 $0" 원칙과 맞지 않아 범위에서 제외, [[../llm-wiki/Decisions/0003-mvp-scope-and-user-model]]).

```bash
npx eas build --platform android --profile preview
```

빌드가 끝나면(보통 10~20분) 터미널에 다운로드 링크가 뜬다. 그 폰에서 링크를 열어 APK를 받고,
"출처를 알 수 없는 앱 설치 허용"을 한 번 켜주면 설치된다. 링크는 아래에 최신 것으로 직접 갱신한다
(Expo 무료 티어 빌드는 30일 후 만료 — 새로 빌드하면 이 줄만 바꾸면 된다):

**최신 다운로드 링크**: _(아직 빌드 전 — `eas build` 실행 후 여기에 링크를 붙여넣는다)_

## 구조

```
src/
├── app/        Expo Router 라우트(index, settings)
├── features/   화면별 로직 (module-2부터 채워짐)
└── lib/        api.ts, offlineCache.ts 등 공유 유틸
```

`app/`이 `src/` 밑에 있는 것은 이 SDK 버전의 `create-expo-app` 기본 템플릿 관례를 따른 것 — Design 문서의 `mobile/app/`과 경로만 다르고 계층 구분 의도는 동일하다.

## 진행 상태

- [x] APP-1: 스캐폴딩(Expo Router+NativeWind)
- [x] APP-2: FCM 토큰 등록 + 푸시 수신(코드 완료 — 실기기+EAS 프로젝트 연결 필요)
- [ ] APP-3: 브리핑 홈 화면 + 오프라인 캐시
- [ ] APP-4: 설정 화면
