# FireWatch Mobile

Expo(React Native) + NativeWind + Expo Router 기반 FireWatch 모바일 앱. `web/`이 소비하는 것과 동일한 백엔드 API를 재사용한다 — 자세한 배경은 `docs/02-design/features/mobile-app.design.md` 참조.

## 시작하기

```bash
npm install
npx expo start
```

터미널에 뜨는 QR코드를 [Expo Go](https://expo.dev/go) 앱으로 스캔하면 실기기에서 확인할 수 있다. 이 개발 환경(Windows)에서는 iOS 시뮬레이터를 쓸 수 없어 실기기 검증이 기본 경로다.

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
- [ ] APP-2: FCM 토큰 등록 + 푸시 수신
- [ ] APP-3: 브리핑 홈 화면 + 오프라인 캐시
- [ ] APP-4: 설정 화면
