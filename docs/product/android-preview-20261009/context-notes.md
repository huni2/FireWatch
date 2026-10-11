# 작업 맥락

2026-10-11 APK1.0.1 실사용 피드백 후 명시적 APK 빌드 금지 지시를 받았다. 최초 동의의 웹 개인정보 이동을 네이티브 모달로 변경했고, 홈 도움말·투자 안내·설정의 개인정보 링크도 네이티브 라우트로 제공한다. 정책 전문은 shared/privacy-policy.json으로 이전해 웹과 앱이 같은 자료를 렌더링한다. 기존 공개 방침12개 섹션·43개 문구와 순서가 동일함을 비교 확인했다. 체크 상태는 ConsentScreen에 남고 모달 닫기/Android onRequestClose로 복귀하며, 전문 컴포넌트에는 API·기기·푸시 훅이 없다. RootLayout의 동의 후 AppContent 마운트 경계는 유지한다. 새 라우트의 로컬 Expo 타입 재생성 후 앱 타입·소스 린트 통과, Android JS export2181모듈 통과, 웹 build4059모듈 및 oxlint 통과(기존 useWebPushSubscription 경고1개). 직접 Android 터치·뒤로가기·TalkBack 실기기 확인은 미완료다. EAS/새 APK/업데이트 배포는 실행하지 않았다. 현재 설치1.0.1에는 이 후속이 없으며 다음 사용자 요청 때 묶어 빌드한다.

2026-10-11 최신 main 11dc337 기준으로 사용자에게 최신 APK 및 GitHub README 설치 링크 요청을 받았다. Expo Free 사용량은 총 BUILDS 5/30, 비용 0으로 확인했다. Android 플랫폼별 무료 한도와 총합을 구분하며 자동 APK 빌드는 활성화하지 않는다. 별도 작업의 wiki 변경과 사용자 미추적 문서는 커밋에서 제외한다.

1.0.1/versionCode6 소스 bcbf354, preview7989e89f-d886-4a42-8fe1-741dbd507e13는 2026-10-11T12:22:53Z FINISHED. 기존 서명 키 재사용. APK114,084,303바이트를 다운로드해 ZIP CRC·바이너리 AndroidManifest 패키지/버전을 확인했다. SHA-256 c8e7d78dd943e5a350999a79722b82a768979d9c6cfbf8cc07fbe8df2cf4fe63, GitHub 업로드 digest 일치. 릴리스 v1.0.1-android-preview는 APK+SHA256SUMS.txt를 포함한 prerelease로 공개했다. CI38138043902/38138031099 전체 통과, 공식 expo lint·타입·출시 설정8개 통과. 임의로 설정 파일까지 확대 실행한 eslint의 기존 __dirname 오류 및 sandbox spawn EPERM은 앱 소스 검사·공식 lint/타입·승인된 설정 검사 결과와 구분한다. 실제 Android 기기 검증은 아직 미완료다.

2026-10-09 조회. versionCode4/6cedd8e/3c4b54ea는 FINISHED다. 최신 커스텀 SVG와 자산 등록 변경은 포함되지 않는다. EAS Free 빌드4/30·비용0. PC에서 adb 명령을 찾지 못해 직접 기기 검증은 수행할 수 없다. 비밀 환경 파일·서명 키는 출력하거나 저장소에 추가하지 않는다.

versionCode5 출시 설정·타입·린트·테스트8개·Android export2162모듈/5.1MB 통과. 테스트의 spawn EPERM은 승인된 샌드박스 외 실행에서 해소됐다. 기기 로그인/푸시는 아직 미검증이다.

7594daa/versionCode5의 preview fefb17ae-ce86-417f-9016-c9230010c1b3 업로드·접수 완료. https://expo.dev/accounts/huni2/projects/mobile/builds/fefb17ae-ce86-417f-9016-c9230010c1b3 . APK 생성 완료는 아직 확인하지 않았다.

공식 요금표는 월 Android15회+iOS15회다. 계정 GraphQL의 총 BUILDS 한도30을 Android30회로 해석하면 안 된다. 비용0원 원칙을 유지하며 한도 소진 시 다음 달 갱신 또는 PC 로컬 Android 빌드를 선택한다.
