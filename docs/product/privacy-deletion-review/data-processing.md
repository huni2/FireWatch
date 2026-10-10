# 데이터 처리 대조 (2026-10-10)

코드 기준 목록이며 Play 제출 답변이나 법률 검토 완료 증명이 아니다. 시행 중인 개인정보 안내는 `/privacy`, 삭제 요청 진입은 `/privacy#delete-account`다.

| 자료 | 처리·보관 | 계정 삭제 시 현재 동작 | 코드 근거 |
|---|---|---|---|
| Google 식별자·이메일 | 선택 로그인·동기화·운영 권한 확인 | app_users 삭제 | AuthService, AppUser |
| 로그인 세션 | auth_sessions에는 SHA-256 해시·기기/계정·만료, 클라이언트에는 인증 토큰. 기존 감사 기록의 원문 가능성은 아래 점검 참조 | 모든 계정 세션 삭제, 요청 기기 클라이언트 토큰 폐기 | AuthSessions, accountApi, mobile api |
| 관심/수신 설정·푸시 등록 | 계정 공유 또는 익명 기기 설정 | 계정 공유 설정 삭제, 별도 익명 행은 유지 | UserSettings, SettingsService |
| 보유·투자 조건·수정 이력 | 서버 portfolios/portfolio_revisions | 계정 공유 owner 행과 이력 삭제 | PortfolioService, AuthService |
| 문의·운영자 답변·공지 숨김 | 계정 연결 테이블 | FK cascade 삭제 | community-h2/postgresql.sql |
| 선택 공개 순위·닉네임·우승자 | 동의한 공개 자료, 철회 후 비공개 | 프로필/등록/우승자 FK cascade 삭제 | ranking-h2/postgresql.sql |
| 기기별 게임·체결·가격 | 서버 device_id 기록, 웹/앱의 기록 자체를 로컬에만 저장하는 것이 아님 | 자동 삭제하지 않음 | GameSession, AuthService |
| 보안·장애 감사 IP·요약 | 감사 로그 저장·운영자 열람 | 자동 삭제하지 않음, 현재 자동 만료 없음 | AuditLog, SettingsUpdateCommand |
| 일부 종목 검색어·조회 결과 | StockService.search의 요청/결과 요약이 운영 감사에 저장. 기기별 전체 검색 이력과는 다름 | 계정 삭제로 감사 원문이 자동 삭제되지는 않음 | StockService, AuditLogAspect |
| 뉴스·시세·분석 근거 | 공공 시장 자료 누적 보관 | 계정 삭제와 별개 | release-scope.md |
| 기존 개인 자료 백업 | 첫 운영 덤프 실물·별도 로컬 복원 완료. 가운영 주1회/최근4개 승인. 정기 이행/암호화·출시 후 보관기간은 미확인 | 즉시 자동 수정 아님, 복구 전에 삭제 요청 재적용 | data-preservation.md |

## 외부 전달

- Google 로그인은 공식 토큰 검증과 공개 SDK, Gemini 생성은 시장 지표·뉴스 입력이다. 현재 fetchMarketBriefing 인자에는 이메일·세션·개인 보유 기록이 없다. 이 범위를 바꾸면 안내도 다시 검토한다.
- ExpoPushSender는 Expo 토큰·제목·본문을 Expo Push Service로 전달한다. Android 전달은 Firebase Cloud Messaging 경로다. Expo를 Google 회사로 표시하지 않는다. 운영자 장애 푸시는 원문 예외/키/계정 내용을 포함하지 않는 별도 운영 메시지다.
- 웹 푸시는 브라우저 푸시 구독 endpoint·키와 알림 메시지를 처리한다. Render/Supabase/Cloudflare는 서버·DB·웹 인프라다. 업체별 국외 처리 국가·계약·보관 조건은 실제 운영 계약과 대조해야 한다.

## 출시 전에 남은 확인

[Play 데이터 보안 입력 초안](../release-submission-review/data-safety-draft.md)과 [삭제 요청 운영 절차](../release-submission-review/deletion-operations.md)에 현재 근거와 미확인 항목을 정리했다. 초안 작성은 Play 제출이나 운영 처리 이행을 뜻하지 않는다.

2026-10-10 BE-21 감사 인증정보 점검. OperatorAccess.requireOperator의 authorization 인자가 이전 AuditLogAspect 비밀값 목록에서 빠져, 성공·실패 감사 요청에 Bearer 원문이 저장되는 것을 격리 테스트로 재현했다. 신규 기록은 authorization을 마스킹하도록 수정했다. 회귀는 실제 서비스 AOP 호출을 사용하며 권한 결과와 감사 상태를 보존한다. 이 수정은 기존 감사로그·백업을 정리하지 않는다. 운영 DB에서 원문 존재 여부나 유출을 확인한 것은 아니다. [운영 확인 절차](../release-audit-review/operations.md)를 따른다.

1. 계정에 연관된 기기 게임/익명 행을 구분하고 삭제 요청을 처리하는 운영 절차·본인 확인·처리기간을 확정해야 한다. 현재 자동 계정 삭제는 위 표 범위이며 **게임을 개인정보가 아니라고 단정해 제외하지 않는다**. 해당 범위를 광고하거나 Play 삭제 항목에 답하기 전에 실제 이행을 확인한다.
2. 감사로그·백업의 목적별 보관기간과 별도 삭제 요청 이행·복구 후 재삭제를 확정한다. 미구현 자동 만료를 구현됐다고 고지하지 않는다.
3. 국외 처리 계약/국가와 개인정보 안내, Data Safety 데이터 종류·수집/공유/목적·선택 여부를 운영자가 대조한다. 광고·분석 SDK를 쓰지 않는다는 이유로 ‘수집 없음’으로 제출하지 않는다.
4. 첫 운영 백업 확보·별도 로컬 복원은2026-10-10 완료했다. 정기 백업 운영·암호화 보관·삭제 요청 재적용·복구 전환 및 개인별 투자 구성 초안의 법률 검토는 BE-21에 남긴다. 코드/안내 대조가 이를 대신하지 않는다.

## 공식 정책 근거

[Google Play 계정 삭제 안내](https://support.google.com/googleplay/android-developer/answer/13327111)는 앱 내 삭제와 앱 재설치 없이 요청 가능한 웹 경로, 계정 관련 자료 삭제와 정당한 보관 범위 고지를 요구한다. 2026-10-09 확인. 웹에 직접 삭제와 이메일 요청 경로를 제공하는 것은 접근 경로의 보완이며 전체 정책 준수/심사 승인을 보증하지 않는다.
