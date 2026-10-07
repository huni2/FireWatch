# 웹 Google 로그인 설정

Google 프로젝트: firewatch-510606. Android 클라이언트는 유지하고 Google Auth Platform → 클라이언트에서 웹 애플리케이션 유형의 기존 클라이언트를 선택하거나 만든다. IAM 화면은 로그인 클라이언트 설정 화면이 아니다.

## 설정

1. 승인된 JavaScript 원본에 `https://firewatch-eqp.pages.dev`를 등록한다. 경로(`/account`)나 끝 슬래시는 넣지 않는다. 개발 검증이 필요할 때는 사용하는 localhost origin과 포트를 별도로 등록한다. Cloudflare 배포별 preview 주소는 운영 원본과 다르므로 자동으로 승인되지 않는다.
2. 웹 빌드의 `VITE_GOOGLE_CLIENT_ID`에 해당 웹 클라이언트 ID를 넣는다. 클라이언트 ID는 공개 식별자다. 클라이언트 비밀번호나 운영 키를 웹 빌드에 넣지 않는다.
3. Render의 `GOOGLE_OAUTH_CLIENT_IDS`에 동일 웹 ID를 쉼표로 추가한다. 기존 Android 등 허용 ID를 삭제하지 않는다. 서버가 새 audience 목록으로 시작하도록 환경 설정 배포를 완료한다.
4. 새 웹 빌드를 Cloudflare Pages에 배포한다. 웹 전용 코드 커밋은 `[skip render]`를 사용한다. 실제 로그인을 활성화하는 서버 환경 변경은 별개다.
5. Google 동의 화면/앱 게시 상태에 따라 필요한 테스트 사용자를 등록한다. OAuth 설정 전에는 버튼 대신 활성화 준비 안내가 나온다.

공식 참고: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid 및 https://developers.google.com/identity/gsi/web/reference/js-reference.

## 동작과 자료 보존

웹은 공식 GIS 버튼의 팝업 callback으로 ID 토큰을 받아 기존 `/api/auth/google/link`에 한 번 제출한다. 자동 로그인/One Tap은 호출하지 않는다. Google ID 토큰은 저장하지 않는다. 서버가 발급한 기기별 30일 Bearer 세션만 브라우저 localStorage에 만료 시각과 기기 ID로 묶어 저장한다. 이는 JavaScript에서 읽을 수 있는 저장소이며 HttpOnly 쿠키나 암호화 저장소로 표현하지 않는다. API는 만료된 토큰을 전송하지 않고, 현재 토큰의 401 응답에는 로컬 세션을 비운다. 이전 요청의 늦은 401은 새 세션을 지우지 않는다.

로그인/로그아웃 후 개인 화면을 새로 불러와 이전 계정의 데이터·편집 상태를 재사용하지 않는다. 다른 탭의 세션 변경도 새로고침한다. 로그아웃은 서버 연결 해제 성공 후 로컬 세션을 제거하며, 서버 오류이면 재시도할 수 있도록 유지한다. 연결 기기 목록/해제도 기존 Bearer API를 사용한다. 계정 삭제는 이번 웹 작업에 추가하지 않았다.

운영자 여부는 `/api/operations/access`의 응답을 확인한다. 브라우저에 저장된 이메일이나 Google 토큰을 디코딩해서 권한을 부여하지 않는다. 일반 계정 403에는 운영 메뉴/로그가 노출되지 않는다. 기존 서버 전용 운영 키 입력은 메모리 방식으로 유지한다. 운영자 푸시 등록 등 기존 공개 설정 키 운영 API 정리는 BE-25의 별도 작업이다.

처음 계정 연결 시 기존 익명 포트폴리오·설정을 계정으로 연결한다. 기존 계정과 별도 포트폴리오가 충돌하면 서버 409로 중단하고 덮어쓰지 않는다. 계정의 포트폴리오·관심/알림 설정을 기기 간 공유하고 가상게임은 현재 기기 기록으로 남는다. 로그아웃은 계정 기록을 삭제하지 않는다.

## 검증

- 코드 빌드·린트와 fixture 일반/운영자, 새로고침 세션 유지, 연결 기기 해제, 로그아웃 실패/성공, 만료, 잘못된 Google 토큰, 포트폴리오 충돌, SDK 로딩 실패를 검증했다. fixture 토큰/클라이언트는 운영에 배포하지 않는다.
- 실제 Google 로그인, 사용자 동의, 허용 원본 및 서버 audience 확인, 일반/지정 운영자 실제 계정의 동작은 운영 설정을 연결한 뒤 검증한다. fixture 검증을 실제 Google 인증 성공으로 해석하지 않는다.
