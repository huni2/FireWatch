# ADR 0021 — 운영자 감사로그 접근 제한

2026-10-07. 승인 근거: 사용자가 운영자 이메일을 powerhch@gmail.com으로 지정했다.

감사로그 전체는 일반 이용자에게 공개하지 않는다. GET /api/audit-logs와 /api/operations/access는 유효한 기기별 Bearer 세션, Google에서 검증한 email_verified, 서버에 저장된 운영자 이메일 일치를 요구한다. 이메일 헤더·브라우저 상태·기기 ID만으로 권한을 부여하지 않는다. 기본 이메일은 위 주소이며 FIREWATCH_OPERATOR_EMAIL로 변경한다. 과거 계정의 email_verified는 FALSE로 추가하므로 Google 재로그인이 필요하다. 익명/무효 세션은 401, 일반 계정과 미검증 이메일은 403이다.

웹 Google 로그인 화면은 아직 구현되지 않았다. 임시 운영자 접근은 별도의 서버 전용 OPERATOR_API_KEY가 설정된 경우에만 허용한다. SETTINGS_API_KEY는 모바일 공개 환경변수에 포함되므로 이 권한에 재사용하지 않는다. 새 키는 웹 빌드 환경변수·모바일·Git에 넣지 않고 Render 환경변수에만 넣는다. 웹 감사로그 주소에서 직접 입력한 키는 메모리에만 보관하며 새로고침과 접근 종료 시 사라진다. 설정되지 않은 키 접근은 항상 거절한다. Render 환경변수를 직접 변경할 수 있는 도구가 없어 이번 세션에서 이 키를 원격 설정하지 않았다.

일반 사용자 전체 메뉴에는 감사로그를 숨긴다. /audit-log 직접 진입도 인증 화면만 보여주고 인증 전 로그 API를 호출하지 않는다. 웹 이메일/구글 계정으로 접근하는 동선은 별도의 웹 로그인 구현이 필요하다. 인증된 운영자에게도 과거 포트폴리오·게임·계정 관련 상세 페이로드 마스킹은 유지한다. DB 변경은 app_users.email_verified 컬럼의 추가만 하며 기존 자료를 삭제하지 않는다.

이 결정은 감사로그 접근에 적용한다. 기존 스케줄러 트리거·수집 운영자 등록·진단 API의 SETTINGS_API_KEY 사용은 별도 이전 과제이며 이 결정만으로 모든 운영 API가 같은 정책을 사용한다고 주장하지 않는다.

Google 검증 근거: https://developers.google.com/identity/sign-in/web/backend-auth
