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
2026-10-12 로딩 UX 후속: 사용자 APK 피드백에 따라 동의 저장→첫 포트폴리오 조회 완료(성공/실패 모두)까지 전면 준비 화면을 표시한다. 다른 메뉴 수집 완료를 기다리지 않으며 /settings 직접 진입은 첫 포트폴리오 대기 대상이 아니다. 공지는 준비 화면 종료 후 표시한다. 화면 중앙의 불확정 진행 막대를 공통화하고 시스템 동작 줄이기 설정에 따라 애니메이션을 끈다. 진행률 백분율·최소 대기 시간을 만들지 않는다. 최초 조회/자동 갱신과 실제 당겨서 새로고침 상태를 분리해 뉴스·포트폴리오·탐색의 중복 표시를 제거했다. 데이터가 있으면 갱신 중에도 유지하며 지연/오류/취소·이전 요청 완료가 최신 상태를 덮지 않도록 기존 generation 보호를 유지한다. 게임 처리 중 표시도 화면 중앙에 두되 턴 회고가 열려 있으면 회고 표시를 우선한다.

검증: 360/390px 격리 앱 웹 미리보기에서 동의→준비 표시→첫 조회 실패 후 홈 해제, 시장 소식/기업 탐색/게임 로딩바 각1개·가로 중앙 배치, /settings 직접 진입 완료를 확인했다. 페이지 오류0·실제 서버 쓰기0. SecureStore·알림·Android 메타데이터와 API 응답은 시험 서버에서만 대체하므로 Android 실기기 당겨서 새로고침·TalkBack·동작 줄이기 검증을 대신하지 않는다. 요청 상태 회귀4개 포함 총20개 테스트 통과. 신규 과제를 만들지 않으며 추가 APK/EAS/OTA는 요청 전까지 실행하지 않는다.
2026-10-12 앱 테마 후속: 기본은 기존 합의대로 라이트이며 설정에서 라이트/다크/기기 설정을 선택한다. firewatch-theme 키로 기기 로컬에 저장해 재실행 시 복원하며 계정·서버 설정과 분리한다. 서버 조회 중/실패 화면에서도 테마 선택이 가능하다. 저장 실패 시 기존 선택을 유지하고 안내한다. NativeWind CSS 변수와 React 테마 컨텍스트로 본문·상단/상태바·게임·주문 입력·차트 축/격자·바텀시트·토스트를 함께 전환한다. 자동 기기 테마를 지원할 수 있도록 app.json userInterfaceStyle은 automatic으로 두고 기본 라이트 선택은 앱 로컬 정책으로 유지한다. 실제 Android 반영에는 새 설치본이 필요하다.

검증: 360/390px 격리 앱 웹 미리보기에서 어두운 기기여도 기본 라이트, 선택 즉시 다크, 재실행 복원, 기기 설정 선택 후 light↔dark 미디어 변경 반응, 다크 게임 로비/진행 자산·메뉴를 확인했다. 페이지 오류0·실제 서버 쓰기0. 주요 본문/보조/강조/오류/손실/주요 버튼 텍스트의 양쪽 색상 대비4.5:1 이상 및 선택 정책 포함 총23개 테스트 통과. 미리보기의 SecureStore/알림/Android 메타데이터/API는 시험 대체이므로 실제 Android 모달/시스템 막대/기기 테마 전환/접근성 확인을 대신하지 않는다. 신규 과제 없이 기존62에 기록하며 APK/EAS/OTA는 사용자 요청 전까지 실행하지 않는다.
2026-10-12 첫 안내 화면 여백 후속: 동의 설명을 위·버튼을 아래로 밀어내던 flex-grow/justify-between을 제거했다. 설명→전문→동의→시작 버튼을 자연스러운 세로 흐름으로 배치하고 구획 간격24px·본문 간격12px, 동의 구획 상단16px로 정리했다. 제목 크기/줄높이를 줄였으며 전문 링크·필수 체크·동의 저장·모달 복귀는 유지한다. 작은 화면은 스크롤을 허용하며 터치 영역44px 기준을 줄이지 않는다. 추가 APK/EAS/OTA 및 신규 과제 없이 기존62 후속으로 기록한다.
2026-10-12 장식선/상단 후속: 사용자가 지적한 웹 내 기록의 왼쪽 강조선과 연결 지도의 상단 강조선을 제거했다. APK 소스의 연결 목록 왼쪽 색 선과 ScreenIntro의 모서리 장식선도 제거했다. 실제 비중 막대·관계 도식과 중립 구획선/포커스 표시는 유지한다. 앱 상단은 옅은 브랜드 배경과 메뉴 트레이로 연결하고 선택 메뉴만 오렌지 채움/글자 대비/커스텀 아이콘으로 구분한다. 회사 검색·시세는 회사 찾기로 줄였고 계정 동작은 계정 아이콘으로 표시한다. 하단 이동·데이터/계정/거래 규칙은 변경하지 않는다.

검증: 모바일 타입/대상 린트, 앱 웹 export, 웹 production build 통과. 격리된 앱 360/390px 라이트/다크4조건에서 연결 색 선0·선택 메뉴 채움·전환·44px 터치 영역·가로 넘침0·페이지 오류0·실제 API 쓰기0 확인. 웹390/1366px 라이트/다크4조건에서 발견 카드 왼쪽/지도 상단 border0, 비중 막대 유지·분류 선택·기업 링크 확인·페이지 오류0·실제 API 쓰기0. 앱 미리보기의 Android 메타데이터/알림/SecureStore/API는 시험 대체이므로 실제 Android 검증을 대신하지 않는다. 기존62에 기록하며 새 과제/APK/EAS/OTA는 실행하지 않는다.

2026-10-12 출시 준비 후속(기존 APP-21/BE-21/WEB-38): Next-Tasks의 이전 APK/다크 모드 상태를 실제 소스와 사용자 설치 기록에 맞췄다. preview/local 기본 APK는 ARM32/64 두 ABI를 유지하고 x86/x86_64를 제외하는 Expo config plugin을 추가했다. development와 production AAB는 전체 ABI 유지. release R8와 리소스 축소를 켜며 실제 APK 용량·reflection/native 동작은 다음 사용자 승인 빌드에서 검증한다. APK/EAS/OTA는 실행하지 않는다. 버전/서명/README 다운로드는 기존1.0.2 유지.

로그인 복구: SecureStore의 유효 세션은 그대로 사용한다. 만료된 세션은 Google silent sign-in과 /api/auth/google/renew를 한 번 시도하며 동시 요청은 같은 promise를 공유한다. 서버는 기존 토큰 해시+기기 연결+Google 계정을 모두 확인하고 토큰만 회전한다. 최초 계정/새 기기를 자동 생성하거나 해제된 연결을 재생성하지 않는다. 일반 API의401은 로컬 세션을 정리한다. 복구 실패는 익명 쓰기로 전환하지 않고 안내하며 기존 토큰을 보존한다. 수동 로그인은 복구 실패 상태를 해제한다. logout/manual-login과 복구 완료 경합은 generation+SecureStore 쓰기 직렬화로 보호한다. Google SDK 캐시 계정이 달라져도 서버에서 거절한다. 서버 배포와 새 설치본이 필요하며 Google/휴대폰 실검증 성공을 주장하지 않는다.

검증 완료: 모바일 회귀34개 실패0, TypeScript/대상 ESLint 성공. Expo config introspect에서 실제 gradle properties에 ARM32/64 및 minify/shrink=true 반영 확인(prebuild/Gradle APK 실행0). Android JS export2178모듈/5.2MB 성공. 백엔드 전체222검사 실패0/skip1, AccountSessionIntegrationTest의 같은 Google 계정 만료 갱신·다른 계정/기기/폐기 토큰·로그아웃/기기해제 거절 통과. 늦게 도착한 기존 토큰401이 새 세션을 삭제하지 않도록 현재 토큰 일치 시에만 정리한다. Google silent 단계는15초 제한을 둔다. GitHub CI/머지/Render 배포/새 APK 실기기 확인은 별도로 확인한다.

추가 회귀: 같은 앱 프로세스에서 갱신된 세션이 다시 만료돼도 새 토큰별로 복구를 실행한다. 이전 성공 promise를 재사용해 만료 토큰을 보내지 않는다. 첫 PR CI38195044177은 새 테스트 첫 invalid-proof 요청이20초 제한을 넘겨 실패했고 소스CI38195013564 전체는 성공했다. 서버/테스트 제한을 늘리지 않고 실패 작업1회 재검증하며 원인은 미확정이다. 실패 보고서의 첫 요청 위치를 확인했다.

2026-10-12 사용자 최신화 요청으로1.0.3/versionCode8을 로컬 빌드했다. sourcea6aaa0c·CI38196432552 success·release assemble16분50초/901작업. ARM32/64+R8/리소스 축소·heap3GiB/meta1GiB/workers2. 기존1.0.2와 동일 release 인증서, 패키지/버전/ZIP/16KB 정렬·R8 mapping/DEX에서Google/gradient 모듈 확인. APK마스코트res/BV.png는 양쪽 배경 합성 RGB가 원본과 일치한다.54,303,976bytes·기존대비약52% 감소·SHA256 c42582846d1893f29a66c8208948ba4f5e6c4b55c7d28882d717634511913044. 공개 다운로드/README·업로드digest 대조는 별도 결과로 기록하며 실제Android 로그인/푸시/접근성/최적화 후 실행과 Render갱신 배포를 완료로 주장하지 않는다. EAS클라우드요청0·신규과제0·원래버전/서명/데이터삭제0.

1.0.3 공개 확인: GitHub release410096656·APK asset632483326·서버digest 로컬SHA256일치·다운로드HEAD 최종HTTP200/54,303,976bytes 확인. 체크섬 파일도 공개했다. 실제휴대폰실행/로그인/푸시는 미확인 유지. README/문서PR와최종CI/머지결과는 기존Issue62에기록한다.

2026-10-12 APK1.0.3 로딩 선 정지 사용자 제보 후속: 설치된 RN0.86.2 AnimatedImplementation.loopImpl을 테스트에서 직접 실행해 stop→start만으로는 내부isFinished가 남아 첫 애니메이션이 실행되지 않음을 재현했다. stop→reset→start로 수정하고 동작 줄이기 설정/조회 실패/늦은 초기 설정 응답/화면 종료를 보호한다. isInteraction=false로 반복 표시가 목록 렌더를 막지 않게 한다. ThemeProvider의 별도 고정 선도 공통 LoadingIndicator로 교체하며 첫 준비·시장/기업/계정·순위/회고/그래프·검색/ETF/분석보관함/주문미리보기·Google/삭제 처리에 같은 표시를 사용한다. 실제 서버 처리 퍼센트를 생성하지 않으며 요청 완료/실패 시 해당 표시를 종료한다.

검증: RN 실제loop 회귀6개 포함 모바일40검사·TypeScript·Expo lint 성공. Android JS export2180모듈/5.2MB 성공. 격리 앱 웹360/390px에서 초기조회 실패 후 준비 화면 해제·시장/기업/게임의 단일 중앙선 위치를180ms 간격3회 측정해 이동4px이상 확인·직접설정진입 해제·JS오류0/운영쓰기0. 미리보기의Android메타데이터/알림/SecureStore/API는 시험 대체이므로 실제APK동작 검증을 대신하지 않는다. 새 APK/EAS/OTA0·현재1.0.3 다운로드 유지·Render/API/DB/버전/키변경0. 기존Issue62/APP21 소스후속으로 기록하며 새로운 과제를 만들지 않는다.

## 2026-10-12 상단 테마 스위치·순위 닫기

사용자 요청으로 Android 공통 헤더와 최초 동의 화면에 해/달 SVG 및 좌우 native Switch를 배치했다. 왼쪽 라이트·오른쪽 다크, 기본 라이트와 기기 저장을 유지한다. 설정의 세 가지 선택 항목을 제거했으며 기존 system 저장값은 읽기 호환을 유지한다. 홈 계정 버튼은 44px 아이콘으로 축소해 360px 헤더에 함께 배치한다.

게임 순위 모달의 제목과 44px 닫기를 SafeAreaView 상단에 고정하고 본문만 스크롤한다. 등록 진행 중 닫기/Android 뒤로가기는 기존 보호를 유지한다. 서버·랭킹 규칙·게임 기록 변경은 없다.

타입/Expo lint 및 테마·로딩 회귀9개 통과. Android JS export2180모듈/5.2MB 성공. 격리된 native-web360/390px에서 동의/홈/설정 전환·오른쪽 thumb 이동·새로고침 후 저장·헤더 겹침/가로 넘침 없음·순위 본문600px 스크롤 후 닫기 위치 유지·주간 우승자 전환/복귀 확인. JS오류·운영 API쓰기0. 검증 결과는 header-theme-ranking-preview.json에 보관한다. 실제 Android Switch 드래그·TalkBack은 미확인이다.

APK/EAS/OTA 실행0. 공개1.0.3에는 이전 로딩 수정과 이번 UI 변경이 포함되지 않으며 새 설치본은 사용자 별도 요청 때 만든다. 기존 Issue#62/APP-21에 기록하고 새 과제는 생성하지 않는다.

## 2026-10-12 게임 마무리 접근성

진행 중 게임의 규칙·마무리를 더보기/게임 도구에 숨겼던 구성을 제거했다. 웹/Android 메뉴에서 규칙과 `이번 게임 마무리`를 바로 노출한다. 마무리는 ACTIVE일 때만 표시하고 busy 동안 비활성화하며 기존 종료 확인·취소 및 서버 종료 동작을 유지한다. 작은 화면은 버튼을 자연스럽게 다음 줄로 배치한다. 순위 조건/게임 규칙/DB 변경 없음.

웹 타입/빌드/lint 통과(기존 푸시 effect 경고1 유지), Android 타입/Expo lint 및 native-web export 통과. 격리 웹360/390/1366px에서 직접 버튼/확인 취소·가로 넘침 없음, native-web360/390px에서 직접 버튼·규칙/44px 크기/가로 넘침 없음 검증. JS오류·운영쓰기0. Android Alert 취소·실기기 동작은 미확인. 결과는 game-finish-web-preview.json 및 game-finish-native-preview.json에 보관한다. 기존 Issue62/APP-21에 기록하고 새 과제 없음, APK/EAS/OTA0.
