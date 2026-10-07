# Android 설치 검증

이번 출시 보강의 타입/린트/Android JS 번들은 검증했다. 실제 APK 설치·Google 로그인·푸시·계정 삭제는 별도이며 검증 완료로 표시하지 않는다.

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
