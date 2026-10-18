# Play 비공개 테스트 로그인 오류 10

증상: 계정 선택 후 Android Google 로그인 SDK 오류 10. OAuth 앱 구성 확인이 필요하며 Play Integrity API를 켜는 것으로 해결된다고 단정하지 않습니다.

사용자가 제공한 Play 앱 서명 SHA-1:
`48:20:E0:4F:95:B0:01:56:76:8E:AD:5A:1E:AF:2F:8D:1F:61:4C:E8`

패키지: `com.firewatch.mobile`

Google Cloud 프로젝트 `firewatch-510606`의 [Google 인증 플랫폼 → 클라이언트](https://console.cloud.google.com/auth/clients?project=firewatch-510606)에서 이 패키지와 SHA-1 조합의 Android OAuth 클라이언트를 확인하거나 추가합니다. 직접 설치 APK용 기존 Android 클라이언트를 삭제하거나 업로드 키 SHA-1로 대체하지 않습니다.

앱의 webClientId는 웹 유형 OAuth 클라이언트 `36757449765-6elmhssfjhktjscvbti8oj6f753lmbd4.apps.googleusercontent.com`을 유지합니다. Android 클라이언트 ID를 webClientId로 넣지 않습니다. 두 클라이언트가 같은 프로젝트에 속하는지도 확인합니다.

2026-10-18 현재 Codex 내장 브라우저 Google 로그인이 차단되어 원격 OAuth 변경은 수행하지 못했습니다. 일반 브라우저에서 사용자가 등록한 후, 설정 반영을 기다리고 Play에서 설치한 앱을 재실행해 확인해야 합니다. 실제 로그인 성공 전까지 해결 완료로 표시하지 않습니다. Android OAuth 등록만 바꿨다면 그 등록 자체 때문에 AAB를 재빌드할 필요는 없습니다.

근거: [Google Android 클라이언트 인증](https://developers.google.com/android/guides/client-auth), [React Native Google Sign-In 문제 해결](https://react-native-google-signin.github.io/docs/troubleshooting).
