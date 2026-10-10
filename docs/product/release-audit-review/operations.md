# 감사 인증정보 운영 확인

신규 authorization 마스킹 반영과 과거 기록 처리는 구분한다. 2026-10-10 사용자가 제공한 실제 DB 집계에서 최근2일 OperatorAccess 감사49행 중 Bearer 형태18행·완전 마스킹4행을 확인했다. 이는 인증정보 형태의 보관 근거이며 실제 외부 유출이나 현재 유효 세션 여부는 판정하지 않는다. [운영 집계](../collection-recovery/operator-audit-summary-20261010.json)를 보존한다.

1. 최신 서버 배포 후 신규 OperatorAccess 감사 요청이 마스킹되는지 운영자 권한으로 확인한다. 토큰 원문·request_payload·백업을 채팅/스크린샷/GitHub에 올리지 않는다.
2. historical-authorization-summary.sql로 작업명·상태별 총건수와 Bearer 형태 의심 건수만 읽는다. 패턴 집계는 정확한 세션 유효성이나 유출 여부를 판정하지 않는다. 시간 제한에 걸리면 반복 실행하지 않고 범위를 조정한다.
3. `authorization-impact-summary.sql`로 전체 기간의 형태 건수·최신 시각·현재 유효하고 연결된 세션과의 해시 일치 건수만 확인한다. 토큰/해시/기기/계정ID는 결과에 출력하지 않는다. 서버 AuthSessions와 같은 SHA-256을 사용한다. [PostgreSQL 해시 함수](https://www.postgresql.org/docs/current/functions-binarystring.html)의 `sha256`/`encode`를 사용하며 추가 확장을 설치하지 않는다. 운영 실행 전이며 SQL 준비를 실제 조회 결과로 표시하지 않는다.
4. 유효 세션 일치가 있으면 해당 세션 폐기와 재로그인을 우선 검토한다. 기존 로그아웃/기기 연결 해제/재로그인은 해당 기기 세션을 폐기하거나 대체한다. 연동 기기 해제에는 로그인 확인이 필요하다. 현재 기기 재로그인만으로 모든 연결 기기의 과거 토큰이 폐기됐다고 간주하지 않는다. 해당 작업의 실제 이행을 기록한다.
5. 원문 정리 대상은 OperatorAccess의 Bearer 형태 요청으로 한정해 건수·시각과 행 변경 범위를 확인한다. 작업명·상태·소요시간·시각 등 감사 증거는 보존하며 인증 원문만 가리는 변경을 준비한다. 기존 요청 원문 덮어쓰기 전 처리 범위를 확정한다. 아직 UPDATE/DELETE를 실행하지 않았으며 다른 감사/뉴스/게임 기록을 정리 대상에 넣지 않는다.
6. 기존 백업의 인증 원문도 별도로 검토하고 접근을 제한한다. 자동 대량 삭제·전체 계정 강제 로그아웃·VAPID 키 회전은 이 변경에 포함되지 않는다. 해시 일치0은 모든 백업·로그에 원문이 없다는 뜻이 아니다.

관련 처리 대조는 ../privacy-deletion-review/data-processing.md, 백업은 ../../deployment/data-preservation.md를 따른다. 실제 운영 백업/삭제 이행·보관기간·국외 처리 계약/법률 확인은 BE-21의 남은 출시 기준이다.
