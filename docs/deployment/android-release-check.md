# Android 설치 검증

## 최신 설치본 1.0.5 / 빌드10 (2026-10-12)

사용자 README APK 통합 테스트 요청과 UX 정리 후속으로 소스 `c8c2fad754e14ec5692803a4edbd461789b6f10f`를 로컬 Expo prebuild+Gradle로 빌드했다. EAS 클라우드 요청0, ARM32/64·R8/리소스 축소 유지. PR#98~99의 규칙/차트/관심 토글/알림과 단일 테마·공통 버튼·고정 주문 총액·저장 상태를 포함한다.

기존1.0.4와 같은 release 인증서, 패키지 `com.firewatch.mobile`, 버전1.0.5/10, ZIP CRC·16KB 정렬·독립 JS 번들·R8/DEX의 Google/그라디언트 모듈·마스코트 원본 픽셀·최신 테마/차트/규칙/알림 코드 포함을 확인했다. 크기 54,328,552 bytes(약54MB), SHA-256 `7205515d751b9b114f6da60ca337743c94f705d94d19c70090b379d871cbee24`. GitHub digest/공개HTTP200·크기 대조. [APK](https://github.com/huni2/FireWatch/releases/download/v1.0.5-android-preview/FireWatch-1.0.5-android.apk) · [릴리스](https://github.com/huni2/FireWatch/releases/tag/v1.0.5-android-preview) · [파일 기록](../product/android-preview-20261009/android-105-build.json).

모바일48회귀·타입/lint·출시 검사와 [소스 CI](https://github.com/huni2/FireWatch/actions/runs/38248253718) 검증. 실제 Android Google 로그인·푸시·키보드/글꼴 확대/DateTimePicker/TalkBack은 미확인으로 남긴다. 기존 앱을 삭제하지 않고 업데이트 설치한다. 이후 자동 APK/EAS/OTA는 활성화하지 않는다.

## 이전 설치본 1.0.4 / 빌드9 (2026-10-12)

사용자 최신화 요청으로 소스 `44a2855e7ca50144d90d829beb2e21a0c30bfb2f`를 로컬 Expo prebuild+Gradle로 빌드했다. EAS 클라우드 요청 0. 기존 1.0.3과 동일한 release 인증서, 패키지 `com.firewatch.mobile`, 버전 1.0.4/9, ARM32/64, R8 mapping/DEX의 Google·그라디언트 모듈, 독립 JS 번들·마스코트 원본 픽셀, ZIP CRC·16KB ZIP 정렬을 확인했다.

상단 테마·순위 닫기(PR#94), 로딩 정지 수정(#93), 게임 직접 마무리(#95), 기업 검색·자산 등록·게임 주문 시트(#96)를 포함한다. 모바일 45회귀·타입/lint·출시 설정 검사를 통과했다.

크기 54,316,264 bytes(약54MB), SHA-256 `ef3773ecd522cb20a0b8ee9a5fc593fa549a39ac491922f0af1201eae07f344a`. GitHub 업로드 digest와 공개 다운로드 크기를 대조했다. [APK](https://github.com/huni2/FireWatch/releases/download/v1.0.4-android-preview/FireWatch-1.0.4-android.apk) · [릴리스](https://github.com/huni2/FireWatch/releases/tag/v1.0.4-android-preview) · [소스 CI](https://github.com/huni2/FireWatch/actions/runs/38216051032) · [파일 검증](../product/android-preview-20261009/android-104-build.json).

기존 앱을 삭제하지 않고 업데이트 설치한다. 실제 Android Google 왕복·푸시·키보드·TalkBack은 미확인이다. 이 요청으로 자동 APK/EAS/OTA 빌드를 활성화하지 않는다. APP-21 실제 설치·제출 확인은 계속 열린 상태다.

## 이전 설치본 1.0.3 / 빌드8 (2026-10-12)

사용자의 APK/README 최신화 요청으로 소스 `a6aaa0c469b99ced5d1fa16639b506944bc20297`를 로컬 Expo prebuild+Gradle로 빌드했다. BUILD SUCCESSFUL16분50초·901작업, heap3GiB/meta1GiB·최대 작업자2. EAS 클라우드 요청0. 패키지 `com.firewatch.mobile`·버전1.0.3/8·ARM32/64·독립 실행 JS 번들·Google/그라디언트 네이티브 모듈 포함, R8 mapping/DEX 대조, 16KB ZIP 정렬·ZIP 무결성·기존1.0.2와 같은 release 인증서를 확인했다. 마스코트는 res/BV.png에 포함됐고 흰색/검은색 배경에 합성한 픽셀이 원본과 같았다.

54,303,976bytes(약54MB), 이전113,854,121bytes보다 약52% 감소. SHA-256 `c42582846d1893f29a66c8208948ba4f5e6c4b55c7d28882d717634511913044`. [APK 다운로드](https://github.com/huni2/FireWatch/releases/download/v1.0.3-android-preview/FireWatch-1.0.3-android.apk) · [릴리스·SHA-256](https://github.com/huni2/FireWatch/releases/tag/v1.0.3-android-preview) · [빌드 근거](../product/android-preview-20261009/android-103-build.json) · [소스 CI](https://github.com/huni2/FireWatch/actions/runs/38196432552).

네이티브 Google 계정 선택·만료 세션 복구·기본 라이트+다크/기기 선택 저장·중앙 준비/로딩·게임 시작 마스코트/상단/고정 요약·동의 여백·장식선 정리를 포함한다. 실제 기기의 정상 시작/재실행·Google 로그인·푸시·접근성/R8 이후 동작과 Play 제출은 미확인이다. 서버 갱신 API에는 최신 Render 배포가 필요하다. 기존 앱을 삭제하지 않고 업데이트 설치한다. 이번 요청 외에 자동/추가 APK 빌드를 활성화하지 않았다.

## 이전 설치본 1.0.2 / 빌드7 (2026-10-12)

사용자 재요청으로 소스 b600f97을 PC의 Android SDK36·NDK27.1·Gradle9.3.1로 빌드했다. 첫 도구/캐시 준비와 908개 작업에 35분49초가 걸렸으며 BUILD SUCCESSFUL이다. EAS 클라우드 빌드는 요청하지 않았다. 기존 release 키로 서명한 뒤 1.0.1 APK와 같은 인증서임을 직접 비교했다. 패키지 com.firewatch.mobile·내부 버전1.0.2/7·ZIP 무결성·독립 실행 JS 번들·그라디언트 네이티브 클래스 포함을 확인했다. 113,854,121바이트, SHA-256 `1661e71af4d9a59f0e8b049ebef1628effae00f8eea61661d6fe00bd699374f5`. GitHub 업로드 digest도 일치한다.

[APK 다운로드](https://github.com/huni2/FireWatch/releases/download/v1.0.2-android-preview/FireWatch-1.0.2-android.apk) · [릴리스·SHA-256](https://github.com/huni2/FireWatch/releases/tag/v1.0.2-android-preview) · [소스 CI](https://github.com/huni2/FireWatch/actions/runs/38149392171).

1.0.1의 종료 제보에 대응한 차트 의존성·시작 오류 화면·명시적 알림 등록·앱 내부 안내·새 아이콘을 포함한다. 사용자 USB 연결이 어려워 실제 기기의 종료 원인 전부와 수정 후 정상 시작·재실행·Google 로그인·푸시는 미검증이다. 기존 앱을 삭제하지 않고 업데이트 설치해서 확인한다. 다음 빌드에는 로컬 JVM 메모리 경고(기본 heap2GiB/meta512MiB)를 고려한다. 아래 1.0.1과 EAS 절차는 이전 설치본 이력/선택 가능한 빌드 방식이다.

**이전 설치본 이력(2026-10-11)** — 최신 APK 1회 빌드 완료·다운로드·GitHub 사전 릴리스 공개. 소스 `bcbf354`, 버전 **1.0.1 / versionCode 6**, [EAS preview](https://expo.dev/accounts/huni2/projects/mobile/builds/7989e89f-d886-4a42-8fe1-741dbd507e13) FINISHED. [APK 설치 링크](https://github.com/huni2/FireWatch/releases/download/v1.0.1-android-preview/FireWatch-1.0.1-android.apk) · [릴리스·SHA-256](https://github.com/huni2/FireWatch/releases/tag/v1.0.1-android-preview). 파일 내부 패키지 `com.firewatch.mobile`·버전1.0.1·versionCode6·ZIP CRC 무결성을 확인했다. 크기114,084,303바이트, SHA-256 `c8e7d78dd943e5a350999a79722b82a768979d9c6cfbf8cc07fbe8df2cf4fe63`; GitHub 업로드 digest도 일치한다. 실제 기기 설치·로그인·푸시는 미확인이다. 이전 versionCode5도 FINISHED를 확인했다. 자동 EAS 빌드는 활성화하지 않는다. 아래 과거 접수와 [현재 체크리스트](../product/android-preview-20261009/checklist.md)를 구분한다.

이번 출시 보강의 타입/린트/Android JS 번들은 검증했다. 실제 APK 설치·Google 로그인·푸시·계정 삭제는 별도이며 검증 완료로 표시하지 않는다.

웹·서버 배포 요청만으로 APK를 생성하지 않는다. 사용자에게 모바일 설치본 요청이 있을 때 `mobile/`에서 `npm run build:apk`를 별도로 실행한다. 기존 진행 중 빌드를 먼저 확인하고 무료 잔여량과 소스 버전을 대조한다. CI 타입/린트·로컬 export는 EAS 빌드가 아니다.

## 준비

- 사용자 제공 Android OAuth 공개 ID를 로컬 `mobile/.env`와 `eas.json` 공통 프로필에 반영했다. 운영 API도 EAS에 명시했다. ID 설정과 실제 로그인 성공은 구분한다.
- `cd mobile`에서 `npm run release:check`를 실행한다. 사용자 추가 Firebase 앱 파일의 프로젝트 firewatch-25e21·Android 패키지 일치·동적 설정 연결 및 로컬 검사 통과를 확인했다. EAS preview/production에 secret 파일 변수 `GOOGLE_SERVICES_JSON`을 등록했다. preview/production post-install도 검사한다.
- 저장소 루트 `.easignore`는 mobile/shared만 빌드에 전달하며 로컬 환경·서명 키·Firebase 파일·개인 작업 문서를 제외한다. Firebase 앱 파일은 위 EAS 파일 변수로 전달한다.
- EAS Credentials의 FCM V1 서비스 계정 설정과 서명 SHA-1은 별도 확인한다. 비밀 키는 앱 번들에 넣지 않는다. [Expo FCM 안내](https://docs.expo.dev/push-notifications/fcm-credentials/).
- Google Console의 패키지 `com.firewatch.mobile`과 실제 서명 SHA-1이 설치 빌드에 맞는지 확인한다. 개발·Play 서명이 다르면 해당 서명의 클라이언트를 준비하고 Render audience 목록에도 포함한다.
- `mobile/eas.json`의 development APK는 dev client로 로그인 확인에 사용한다. Expo Go/Android JS 번들은 설치 앱 OAuth 확인을 대신하지 않는다.
- 실수신할 기기를 준비한다. 현재 작업 환경에서 연결된 Android 기기/ADB는 확인하지 못했다.

## 설치 후 확인

1. 신규 설치의 동의 전에는 푸시를 등록하지 않는지, 라이트 기본 화면·큰 글꼴·키보드에서 버튼이 가려지지 않는지 확인한다.
2. 익명 기록 저장 → 앱 재실행 → Google 연결 → 보유/관심 기록 보존을 확인한다. 기존 계정과 다른 포트폴리오가 있으면 덮어쓰기 대신 충돌 안내가 나와야 한다.
3. 일반 사용자에게 운영 도구가 없는지 확인한다. 지정 운영자는 알림 권한 → 수신자 등록 → 테스트 발송 후 앱을 닫고 실제 알림 도착을 확인한다. 발송 수락만으로 완료 처리하지 않는다.
4. ETF 별칭 검색 → 분류/지수 반영 → 포트폴리오 노출 카드, AI 위험 안내 → 원문/공식 상품 링크, 가상 게임 픽 매수/다음 턴/보유/체결을 확인한다.
5. 기기 해제·로그아웃 후 계정 자료가 유지되고 재로그인으로 다시 읽히는지 확인한다.
6. 계정 삭제는 별도 폐기 가능한 테스트 계정으로 검증한다. 운영자 실제 기록은 삭제 시험에 사용하지 않는다.
7. Play 게시 전에 개인정보처리방침·Data Safety·금융 기능 선언·공개 삭제 안내를 실제 현재 기능과 대조한다. 이 문서는 게시/심사 완료를 의미하지 않는다.
8. 일반 사용자 문의 접수 → 내 문의 재조회 → 운영자 웹 답변 → 앱 답변 확인. 타인의 문의와 운영 관리가 노출되지 않아야 한다.
9. Android/ALL 대상 공지가 있을 때 첫 진입 모달·닫기·이동 중 재노출 없음·오늘 숨김·KST 자정 후 다음 실행을 확인한다. 운영 DB에 검증 공지를 자동 생성하지 않는다.

Data Safety 입력은 [코드 대조 초안](../product/release-submission-review/data-safety-draft.md)을 사용한다. 계정·기기 자료의 삭제 요청은 [운영 절차](../product/release-submission-review/deletion-operations.md)를 대조한다. 문서 작성과 실제 처리기간/보관기간 확정·삭제/백업 이행·최종 설치본 SDK 검증·Play 제출은 구분한다.

## 이전 EAS 빌드 이력 (2026-10-09)

[이전 versionCode4 빌드](https://expo.dev/accounts/huni2/projects/mobile/builds/3c4b54ea-4233-49ff-af39-feefd05c85f1)는 source6cedd8e로 FINISHED다. 커스텀 메뉴/게임 SVG와 자산 등록 개편은 포함되지 않는다. 최신 소스7594daa·versionCode5로 preview APK 빌드를 요청했다. Free 사용4/30·비용0을 확인했고 타입·린트·출시 검사8개·Android export를 통과했다. 현재 상태와 설치 확인은 `docs/product/android-preview-20261009/checklist.md`에 기록한다.

예전 cde6e85의 preview3a953867은 FINISHED/APK 생성 상태를 확인했지만 최근 모바일 변경을 포함하지 않는다. Expo Go 또는 과거 APK 설치를 최신 기능 검증으로 처리하지 않는다.
