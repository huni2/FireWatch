# 수집 자료 보관·백업·복구

기준일 2026-10-08. 운영 DB는 Supabase PostgreSQL이며 배포·시작·수집 실패를 이유로 데이터를 초기화하지 않는다.

## 보관과 용량

- 뉴스·날짜별 추천 근거·관측 시세·게임 기록은 누적 보관한다. 최근 조회 개수 제한은 삭제 정책이 아니다. 중복 URL·관측 키는 중복 저장하지 않는다.
- 개인 보유·관심·문의·게임 기록은 해당 계정 삭제 처리와 연결한다. 운영자의 실제 계정을 삭제 시험에 사용하지 않는다.
- 운영 장애·감사 기록은 원인과 복구 확인을 위해 보관한다. 자동 정리 작업을 추가하지 않는다. 요청 URL·OAuth 토큰·운영 키는 로그와 백업 파일명에 넣지 않는다.
- 무료 DB 용량의 70%에 도달하면 신규 자료 증가량·인덱스·중복을 점검하고 백업 후 보관 범위를 결정한다. 85%에서는 운영자가 제공처 수집 중단 여부를 판단한다. 용량 경고만으로 기록을 자동 삭제하지 않는다. 이 비율은 운영 절차이며 자동 용량 감시 구현을 의미하지 않는다.

## 무료 운영 백업

**2026-10-10 첫 운영 백업·별도 로컬 복원 완료** — 최초에는 별도 백업이 없었으나 사용자가 19:45:46에890563bytes의 첫 백업을 생성했다. 이 파일을 별도 PostgreSQL17.11 로컬 DB에 실제 복원해31개 public 테이블과 세션/푸시 비활성화 후 다른 기록 보존·원본 파일 해시 불변·시험 서버 종료를 확인했다. [집계 결과](../product/release-submission-review/operating-backup-restore-20261010.json). 운영 Supabase 접속·복원·전환은 없었으며 당시 운영 DB와 행 서명을 직접 대조한 검증은 아니다. 백업 이후 삭제 요청 재적용·주기/보관기간 결정과 보관 위치 암호화 확인은 별도로 남아 있다.

이 첫 백업의 OperatorAccess 감사128행에서 Bearer 패턴0·마스킹63을 복원본 읽기 전용 집계로 확인했다. [첫 백업 감사 집계](../product/release-submission-review/first-backup-authorization-summary-20261010.json). 폐기 후 복원본의 세션 집계를 원본 세션 상태로 해석하지 않는다. 가운영 주기/보관 기준은 아래 승인된 기준을 따르고 출시 후 기간은 미확정이다.

운영 서버 버전은 사용자 `SHOW server_version` 결과 **17.6**이다. 이 PC의 허용된 로컬 아티팩트 폴더에 공식 PostgreSQL Windows 페이지가 연결한 EDB Windows x64 바이너리 **17.11**의 클라이언트를 준비했다. `pg_dump`/`pg_restore`/`psql --version` 모두17.11 확인. DB 서버 설치·서비스 시작·운영 DB 접속은 하지 않았다. 바이너리/덤프는 Git에 포함하지 않는다.

이 PC의 실행 파일은 `C:/Users/changhun/.codex/visualizations/2026/10/06/01a10ef2-3e85-7190-9a00-d19c7acd3f40/postgres17-client/first-backup.ps1`이다. 아래 PowerShell 예제를 실행하는 로컬 입력 도우미이며 구문 검사만 완료했다. 연결 정보/비밀번호/저장 폴더를 사용자 PC에서 입력해야 실제 백업이 생성된다. 비밀번호는 pg_dump의 숨김 프롬프트로 입력하며 채팅·GitHub에 제출하지 않는다. 다운로드 ZIP SHA256은 `80379B2C04D51C30225532E0AE04509899141E9957ED096FE749D7FD9DF8F82F`이다. 이는 로컬 파일 식별용이며 제공업체 서명 검증을 대신하지 않는다.

Supabase 무료 프로젝트의 자동 복구 기능을 보장된 백업으로 가정하지 않는다. 공식 문서도 무료 프로젝트의 정기 외부 내보내기를 권고한다. [Supabase 백업 안내](https://supabase.com/docs/guides/platform/backups).

**2026-10-10 운영자 결정** — 가운영과 출시 후 기준을 나눈다. 가운영은 주1회와 DB 구조 변경/대량 수정 전에 백업하며 최근 주간4개와 마지막 변경 전 백업을 보관한다. `public` 스키마의 구조·데이터를 PostgreSQL 버전에 맞는 `pg_dump`로 외부 보관한다. 암호화 보관 확인은 아래 미완료 항목을 따른다. 오래된 파일 정리는 새 백업 검증 후 운영자가 수행하며 자동 삭제는 적용하지 않았다. 서버 디스크나 공개 Git 저장소/GitHub artifact에 개인 자료 덤프를 보관하지 않는다. 첫 백업은 확보했으며 정기 실행 이행은 첫 회 이후 확인 대상이다.

| 단계 | 승인된 기준 | 실제 완료 상태 |
|---|---|---|
| 출시 전 가운영 | 주1회+DB 구조/대량 변경 전·최근 주간4개 및 마지막 변경 전 백업 보관 | 첫 백업/별도 복원 완료. 정기 반복 이행·암호화 보관 미확인 |
| 출시 직전 | 최종 백업/별도 복원 확인·매일 백업 자동화·실패 알림 준비 | 미완료. 예약 실행과 실패 실수신까지 확인하고 출시 |
| 출시 후 | 매일 백업+중요 DB 변경 전·삭제 정책과 함께 보관기간 확정 | 매일 운영 방향 승인. 출시 후 보관기간·저장 위치·자동화 실행 환경은 미확정 |

시장 뉴스·시세·분석 기록은 가운영에서도 누적 보존한다. 시험 계정/게임 기록은 출시 전에 범위를 확인하고 필요한 경우에만 정리한다. 이 결정은 전체 DB 초기화·시험 기록 즉시 삭제를 승인한 것이 아니다. 출시 전 자동화/실패 알림은 기존 BE-21 완료 기준이며 새 과제 번호로 파생하지 않는다.

주간 백업만 사용하면 장애 시 마지막 성공 백업 이후 최대 약7일의 자료를 잃을 수 있다. 매일 백업은 손실 범위를 줄이지만 누락/실패 시 해당 주기보다 손실 기간이 길어진다. 별도 PC 백업은 PC 가동·네트워크·DB 인증정보 준비가 필요하다. 운영 기준 결정만으로 예약 실행이 구성됐다고 표시하지 않는다.

2026-10-10 보관 암호화 점검: 첫 덤프의 Windows EFS 파일 속성은 false다. E: 볼륨 BitLocker 상태는 현재 권한으로 확인하지 못했으므로 **암호화 보관은 미확인**이다. 폴더가 저장소 밖에 있다는 사실은 암호화 확인을 대신하지 않는다. 복원 시험 폴더는 현재 Windows 사용자에게만 접근 권한을 주었으며 이 접근 제한도 암호화와 구분한다.

연결은 Supabase Connect의 direct 또는 session pooler를 사용한다. transaction pooler를 덤프 연결로 사용하지 않는다. 암호는 `PGPASSWORD` 등 로컬 프로세스 환경으로 전달하며 명령줄·문서·스크린샷에 입력하지 않는다. 런타임 Hikari와 별도로 최대 한 백업 연결만 사용한다.

```sh
# PGHOST/PGPORT/PGUSER/PGDATABASE/PGPASSWORD/PGSSLMODE를 로컬에서 설정한 뒤 실행.
pg_dump --format=custom --schema=public --no-owner --no-privileges --file=firewatch-private.dump
```

이 서비스의 Google 계정·세션·보유 기록은 public 테이블에 있다. 덤프에 세션·기기·푸시 정보도 포함되므로 개인정보와 동일하게 취급한다. Firebase 자격증명·Render 환경변수·Storage 파일은 DB 덤프에 포함되지 않는다. 플랫폼 auth/storage 등 관리 스키마를 raw 덤프에 포함시키지 않는다.

### Windows에서 첫 백업 만들기

1. Supabase 프로젝트의 **Connect**에서 DB 버전과 연결 정보를 확인한다. IPv4 PC에서는 **Session pooler**를 선택하고 표시된 host/port/user/database를 사용한다. transaction pooler를 선택하지 않는다. DB 비밀번호는 Google/운영 API 키와 별개다. 값을 채팅으로 보내지 않는다.
2. [PostgreSQL Windows 설치 안내](https://www.postgresql.org/download/windows/)를 통해 DB 서버 버전과 같거나 호환되는 최신 `pg_dump`/`pg_restore` 클라이언트를 설치한다. 로컬 DB 서버 설치는 백업 내보내기 자체의 필수 조건이 아니다. 설치된 `bin` 폴더에서 PowerShell을 열어 아래를 실행한다.
3. 저장 폴더는 Git 저장소 밖의 암호화된 개인 저장소로 선택한다. 파일을 공개 첨부하거나 GitHub에 올리지 않는다.

```powershell
# Connect 화면의 값을 로컬 입력한다. 비밀번호는 화면·명령 기록에 표시하지 않는다.
$env:PGHOST = Read-Host 'Session pooler host'
$env:PGPORT = Read-Host 'Session pooler port'
$env:PGUSER = Read-Host 'DB user'
$env:PGDATABASE = Read-Host 'DB name'
$env:PGSSLMODE = 'require'
$backupFolder = Read-Host '저장소 밖의 기존 암호화 백업 폴더 절대 경로'
if (-not [IO.Path]::IsPathRooted($backupFolder) -or -not (Test-Path -LiteralPath $backupFolder -PathType Container)) {
    throw '존재하는 절대 경로 폴더가 필요합니다.'
}
$backupFile = Join-Path $backupFolder ('firewatch-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N') + '.dump')
& .\pg_dump.exe --password --format=custom --schema=public --no-owner --no-privileges --file=$backupFile
if ($LASTEXITCODE -ne 0) { throw '백업 실패. 생성된 파일은 정상 백업으로 사용하지 마세요.' }
& .\pg_restore.exe --list $backupFile > $null
if ($LASTEXITCODE -ne 0) { throw '백업 목록 확인 실패.' }
Get-Item -LiteralPath $backupFile | Select-Object Length,LastWriteTime
Get-FileHash -LiteralPath $backupFile -Algorithm SHA256
```

`pg_dump --password`의 프롬프트에만 DB 비밀번호를 입력한다. 목록 확인은 파일을 읽을 수 있다는 검사이며 실제 복원 성공을 의미하지 않는다. 첫 백업이 성공하면 날짜·파일 크기·목록 확인 성공 여부만 운영 기록에 남긴다. 다음 단계는 아래 절차에 따른 **별도 빈 로컬 DB 복원**이며 운영 DB로 복원하지 않는다. 다운로드에는 운영 네트워크 전송량이 발생하므로 무료 플랜 사용량도 함께 확인한다.

## 복구 절차

1. 장애 시 쓰기/수집을 중단하고 현재 DB를 추가 보관한다. 원본을 덮어쓰지 않는다.
2. 별도 빈 PostgreSQL DB에 `pg_restore --exit-on-error --no-owner --no-privileges`로 복구한다. 운영 DB로 직접 restore하거나 `--clean`을 실행하지 않는다.
3. 테이블별 행 수·데이터 서명, 뉴스/추천의 과거 날짜 조회, 보유/게임 원장 관계, 최신 시세 기준 시각을 확인한다. 행 수만 같다고 내용 복구 성공으로 처리하지 않는다.
4. 복구 백업에 있던 로그인 세션과 알림 등록을 그대로 운영 재개하지 않는다. 모든 복원된 세션을 폐기하고 재로그인·알림 재등록을 요구한다. 백업 이후 계정 삭제 요청도 다시 적용해야 한다. 이 처리는 운영 전환 승인 전에 별도 DB에서 수행한다.
5. 운영자가 검증 결과와 손실 기간을 확인한 뒤 서버 연결을 바꾼다. 실패 알림·제한 재시도·예약 작업을 다시 켜고 정상 수집을 확인한다.

CI의 `scripts/verify-postgres-restore.sh`는 전용 로컬 PostgreSQL17 컨테이너만 받고 테스트 DB를 별도 DB에 복원해 모든 public 테이블의 행 수와 정렬된 행 서명을 비교한다. 운영 주소·암호를 받지 않으며 원본 DB와 기존 복구 DB를 덮어쓰지 않는다. 이 검사는 실제 운영 백업 확보나 전환 승인과 구분한다.

2026-10-10 후속 시험에서는 일치 확인 후 복원본에만 시험 세션·푸시 등록을 넣는다. 고정된 `firewatch_restore_check` DB에서 로그인 세션·사용자 FCM/웹 구독·운영자 푸시 등록을 비활성화하고 나머지 테이블·관심/보유 설정과 원본 시험 DB의 서명이 그대로인지 확인한다. 테스트 등록이 없던 백업에서도 이 단계가 실제로 검증되도록 한다. 실제 운영 복구에 사용할 SQL 배포·운영 자료 삭제·백업 이후 삭제 요청 재적용을 수행한 것은 아니다. 해당 재적용과 운영 전환 판단은 위 복구 절차에 남긴다.
