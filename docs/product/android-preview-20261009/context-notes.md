# 작업 맥락

2026-10-12 사용자 수정 APK/README 재요청으로 빌드 보류를 이번1회 해제했다. 버전1.0.2/code7 소스 b600f97, CI38149392171 전체 성공. E:/Android SDK를 발견해 Expo prebuild 후 로컬 Gradle assembleRelease로 빌드(908작업/35분49초 성공)했다. NDK27.1·build-tools36·CMake3.22.1 첫 설치 및 캐시 준비가 포함됐고, JVM 기본2GiB/메타512MiB 경고가 있어 후속 빌드 전에 메모리를 조정한다. EAS 클라우드 빌드는 요청하지 않았다. 서명 자격증명은 기존 EAS에서 메모리로만 읽어 기존 로컬 jks와 일치 확인·환경변수로 apksigner에 전달했고 키/비밀번호를 출력·새 파일로 저장하지 않았다. 기존1.0.1 APK와 인증서 직접 비교 성공. 패키지/버전1.0.2/7·ZIP CRC·독립 실행 번들·DEX 그라디언트 모듈 포함 통과. 파일113854121바이트 SHA1661e71af4d9a59f0e8b049ebef1628effae00f8eea61661d6fe00bd699374f5. GitHub prerelease409743462/v1.0.2-android-preview에 APK+SHA256SUMS 업로드, digest 일치 후 공개. 실기기 USB 로그/종료 해결·로그인·푸시는 여전히 미검증이며 Issue #62를 닫지 않는다. 다음 빌드는 다시 명시적 요청을 기다린다.

2026-10-11 반복 종료 후속: 사용자 제보는 동의 버튼 직후 종료 및 이후 재실행 실패이며, USB 연결이 어렵다. 홈의 StocksScreen/StockChart 정적 import가 react-native-gifted-charts를 불러오고, 해당 라이브러리는 두 gradient 제공 패키지가 모두 없으면 모듈 평가 단계에서 예외를 던진다. 기존 설치 의존성에는 두 패키지가 없었다. 로컬 동의 후 홈 진입에서 동일한 missing-gradient 예외를 API 요청 전에 재현했다. Expo bundledNativeModules 권장 ~57.0.1에 맞춰 expo-linear-gradient57.0.2를 설치하고 Android 모듈 등록·SDK 계열 계약을 CI에 추가했다. 패키지 추가로 네이티브 모듈이 필요하므로 기존 APK에 소스만 반영됐다고 설명하지 않는다.

타입·소스 린트·출시/의존성9개 검사 및 Android JS export2186모듈 통과. 격리 웹 미리보기는 native-only Platform.constants와 마지막 알림 응답을 시험 서버에서만 대체하여 360/390px 동의 저장 실패→재시도→홈 껍데기→재실행을 확인했다. SecureStore의 웹 비지원으로 실제 자료 조회는 검증하지 않았다. 대체 전 웹 비지원 예외에서 새 Root ErrorBoundary가 복구 화면을 표시함은 확인했으며 실제 네이티브 프로세스 종료를 잡는 장치는 아니다. 현재 APK의 실제 종료 원인 전부 또는 수정 후 실기기 성공을 확정하지 않는다. 자동 권한/토큰 등록은 설정으로 옮기고, 동의 저장 실패·준비 로딩·JS 오류 표시를 추가했다. 과거 아이콘/실행 이미지가 실제 파일에 남아 있어 웹 불꽃과 같은 심볼로 교체했다. EAS/APK/OTA 배포는 실행하지 않았다. 기존 Issue #62에 후속을 기록한다.

후속 로컬 앱 웹 미리보기 검증(390·360×844): 동의 전 시작 버튼 비활성 → 체크 → 앱 내부 개인정보 모달 → 마지막 섹션까지 스크롤 → 닫기 → 체크와 시작 버튼 활성 상태 유지 → 체크 해제 시 버튼 비활성 확인. 외부 창0·동의 전 /api 요청0·페이지 오류0. 모달 애니메이션 종료 후 스크린샷을 확인했다. 네이티브 Android 시스템 뒤로가기나 TalkBack 검증을 대신하지 않는다. 로컬 미리보기·Android JS export는 EAS/APK 빌드가 아니다. PR #83 소스76bb4f7에 기록하며 신규 과제는 만들지 않는다.

2026-10-11 APK1.0.1 실사용 피드백 후 명시적 APK 빌드 금지 지시를 받았다. 최초 동의의 웹 개인정보 이동을 네이티브 모달로 변경했고, 홈 도움말·투자 안내·설정의 개인정보 링크도 네이티브 라우트로 제공한다. 정책 전문은 shared/privacy-policy.json으로 이전해 웹과 앱이 같은 자료를 렌더링한다. 기존 공개 방침12개 섹션·43개 문구와 순서가 동일함을 비교 확인했다. 체크 상태는 ConsentScreen에 남고 모달 닫기/Android onRequestClose로 복귀하며, 전문 컴포넌트에는 API·기기·푸시 훅이 없다. RootLayout의 동의 후 AppContent 마운트 경계는 유지한다. 새 라우트의 로컬 Expo 타입 재생성 후 앱 타입·소스 린트 통과, Android JS export2181모듈 통과, 웹 build4059모듈 및 oxlint 통과(기존 useWebPushSubscription 경고1개). 직접 Android 터치·뒤로가기·TalkBack 실기기 확인은 미완료다. EAS/새 APK/업데이트 배포는 실행하지 않았다. 현재 설치1.0.1에는 이 후속이 없으며 다음 사용자 요청 때 묶어 빌드한다.

2026-10-11 최신 main 11dc337 기준으로 사용자에게 최신 APK 및 GitHub README 설치 링크 요청을 받았다. Expo Free 사용량은 총 BUILDS 5/30, 비용 0으로 확인했다. Android 플랫폼별 무료 한도와 총합을 구분하며 자동 APK 빌드는 활성화하지 않는다. 별도 작업의 wiki 변경과 사용자 미추적 문서는 커밋에서 제외한다.

1.0.1/versionCode6 소스 bcbf354, preview7989e89f-d886-4a42-8fe1-741dbd507e13는 2026-10-11T12:22:53Z FINISHED. 기존 서명 키 재사용. APK114,084,303바이트를 다운로드해 ZIP CRC·바이너리 AndroidManifest 패키지/버전을 확인했다. SHA-256 c8e7d78dd943e5a350999a79722b82a768979d9c6cfbf8cc07fbe8df2cf4fe63, GitHub 업로드 digest 일치. 릴리스 v1.0.1-android-preview는 APK+SHA256SUMS.txt를 포함한 prerelease로 공개했다. CI38138043902/38138031099 전체 통과, 공식 expo lint·타입·출시 설정8개 통과. 임의로 설정 파일까지 확대 실행한 eslint의 기존 __dirname 오류 및 sandbox spawn EPERM은 앱 소스 검사·공식 lint/타입·승인된 설정 검사 결과와 구분한다. 실제 Android 기기 검증은 아직 미완료다.

2026-10-09 조회. versionCode4/6cedd8e/3c4b54ea는 FINISHED다. 최신 커스텀 SVG와 자산 등록 변경은 포함되지 않는다. EAS Free 빌드4/30·비용0. PC에서 adb 명령을 찾지 못해 직접 기기 검증은 수행할 수 없다. 비밀 환경 파일·서명 키는 출력하거나 저장소에 추가하지 않는다.

versionCode5 출시 설정·타입·린트·테스트8개·Android export2162모듈/5.1MB 통과. 테스트의 spawn EPERM은 승인된 샌드박스 외 실행에서 해소됐다. 기기 로그인/푸시는 아직 미검증이다.

7594daa/versionCode5의 preview fefb17ae-ce86-417f-9016-c9230010c1b3 업로드·접수 완료. https://expo.dev/accounts/huni2/projects/mobile/builds/fefb17ae-ce86-417f-9016-c9230010c1b3 . APK 생성 완료는 아직 확인하지 않았다.

공식 요금표는 월 Android15회+iOS15회다. 계정 GraphQL의 총 BUILDS 한도30을 Android30회로 해석하면 안 된다. 비용0원 원칙을 유지하며 한도 소진 시 다음 달 갱신 또는 PC 로컬 Android 빌드를 선택한다.
2026-10-12 APK1.0.2 사용자가 Google 화면에서 오류를 보고했다. 설치 소스는 deprecated expo-auth-session Google provider의 Android custom URI 리다이렉트로 로그인했다. Google의 Android URI 제한과 호환 문제가 있어 @react-native-google-signin/google-signin 네이티브 계정 선택으로 변경했다. 앱 서명은 직전 빌드에서 1.0.1과 동일함을 검증했으며 변경하지 않았다. ID 토큰 대상은 기존 웹 OAuth 공개 ID(app.json extra.googleWebClientId, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID로 재정의 가능)이며 서버 허용 목록에도 있어야 한다. 클라이언트 비밀번호·새 로그인 DB·Firebase Auth는 도입하지 않는다. 실제 Google 오류 전문과 새 설치본의 성공은 아직 미확인이다.

동일 후속에서 홈 상단을 FireWatch 심볼/워드마크와 내 계정 버튼으로 정리했다. 도움말은 설정에서 접근한다. 게임 시작은 정찰대 그림·시작 게임머니·짧은 흐름으로 구성했다. 진행 중 주차/진행률/총자산/현금/수익률과 다음 주 동작을 스크롤 밖에 두며 기존 하단 메뉴를 유지했다. 영어 구획명과 반복 총자산 카드를 제거했다. 360/390px 앱 웹 미리보기에서 로비·진행 4조건 페이지 오류0·쓰기0·가로 넘침0·다음 주 버튼 위치 유지 확인. 미리보기에서 SecureStore/알림/플랫폼 메타데이터만 시험 대체하고 API는 가상 응답으로 격리했으며 네이티브 인증·안전 저장소·실데이터 검증을 대신하지 않는다. Android JS export2170모듈/5.1MB 통과, 타입·소스 린트 통과, 로그인/출시/차트 계약 테스트16개 통과. 새 APK/EAS/OTA 배포 없이 기존 Issue62에 기록한다.
