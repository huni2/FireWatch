# BE-21 백업 복구 키를 PC 밖에 보관하기

클라우드 백업은 암호화돼 있다. 현재 PC의 `E:/FireWatch-backup/backup-identity.txt`만 보유하면 PC나 Windows EFS 복구수단을 잃었을 때 백업을 열지 못할 수 있다. **복구 키를 비밀번호로 암호화한 파일**을 USB·외장 저장장치나 별도의 비밀번호 관리자에 보관한다. EFS 파일을 그대로 복사한 것만으로 복구 확인을 완료하지 않는다.

현재 상태: 클라우드 백업/별도 DB 복원은 완료. PC 밖 복구 키 보관과 이 파일을 사용한 확인은 아직 미완료다. 키 내용·암호·DB 비밀번호를 채팅, GitHub, 감사로그에 넣지 않는다.

## 1. 비밀번호로 암호화한 복구 키 만들기

사용자는 2026-10-11 별도 보관 장소가 없다고 답했다. USB를 새로 구매하는 대신 기존 휴대폰을 별도 보관 기기로 사용할 수 있다. 아래에서 `$recoveryFile`을 `E:/FireWatch-backup/backup-identity-recovery.age`로 지정해 암호화 파일을 먼저 만들고 확인한 뒤, USB 파일 전송으로 휴대폰의 `Download/FireWatch-recovery` 폴더에 **`.age` 파일만** 복사한다. 원래 `backup-identity.txt`는 복사하지 않는다. 휴대폰에 복사한 파일을 새 로컬 파일명으로 다시 가져와 2단계 검증을 수행하면 전송 중 손상 여부도 확인할 수 있다. PC에 파일을 만든 것만으로 휴대폰 보관 완료를 기록하지 않는다. 휴대폰만 보관 수단인 경우 그 기기도 잃으면 복구 파일을 잃는다는 한계가 있다.

사용자가 자신의 PowerShell에서 실행한다. 아래는 휴대폰으로 옮길 암호화 파일을 기존 Git 밖 폴더에 만드는 예다. USB에 직접 저장할 경우 `$recoveryFile`을 실제 별도 저장장치의 새 경로로 바꾼다. 같은 PC의 다른 폴더나 파티션은 PC 밖 보관으로 기록하지 않는다. 비밀번호 관리자에 넣을 경우 새 암호화 파일을 관리자의 비공개 첨부 기능으로 보관한다.

```powershell
$ageBin = 'C:/Users/changhun/.codex/visualizations/2026/10/06/01a10ef2-3e85-7190-9a00-d19c7acd3f40/age-client/age/age.exe'
$identityFile = 'E:/FireWatch-backup/backup-identity.txt'
$recoveryFile = 'E:/FireWatch-backup/backup-identity-recovery.age' # 확인 후 휴대폰에 복사
if (!(Test-Path -LiteralPath $identityFile -PathType Leaf)) { throw '기존 개인키 파일을 확인해주세요.' }
if (!(Test-Path -LiteralPath (Split-Path -Parent $recoveryFile) -PathType Container)) { throw '복구 파일을 보관할 폴더를 먼저 만들어주세요.' }
if (Test-Path -LiteralPath $recoveryFile) { throw '기존 복구 파일을 덮어쓰지 않습니다. 다른 파일명을 선택해주세요.' }
& $ageBin --passphrase --output $recoveryFile $identityFile
if ($LASTEXITCODE -ne 0) { throw '복구 키 암호화 실패. 기존 개인키는 그대로 유지해주세요.' }
```

age가 요청할 때 긴 비밀번호를 직접 입력한다. 명령·환경변수에 비밀번호를 넣지 않는다. 원래 개인키와 암호화된 DB 백업을 삭제하지 않는다. 복구 파일을 여는 비밀번호도 PC 고장 후 찾을 수 있어야 하며 같은 USB의 메모 파일에 함께 두지 않는다.

## 2. 원래 개인키 대신 복구 파일로 확인하기

저장 완료만으로 끝내지 않는다. 아래 검증 파일은 실제 DB 자료가 아닌 공개 고정 문장 `FireWatch recovery key verification`을 현재 백업 공개키로 암호화한 파일이다. 원래 EFS 개인키를 입력으로 사용하지 않고 새 복구 파일을 통해 열리는지 확인한다.

```powershell
& $ageBin --decrypt --identity $recoveryFile 'E:/huni_private/FireWatch/docs/deployment/backup-key-check.age'
if ($LASTEXITCODE -ne 0) { throw '복구 키 확인 실패. 완료로 기록하지 마세요.' }
```

비밀번호 입력 후 `FireWatch recovery key verification`이 나오면 현재 백업 공개키와 일치하는 복구 파일을 확인한 것이다. 개인키 내용은 출력하지 않는다. 가능하면 다른 PC에서 공식 age 도구와 이 두 파일만으로 같은 확인을 수행한다. 현재 PC에서 확인했다면 **현재 PC 확인**으로 기록하고 다른 PC 검증으로 표시하지 않는다. 실제 DB 전체 복원을 대신하는 검사도 아니다.

## 3. 결과 기록

운영자에게 필요한 기록은 보관 수단(휴대폰/USB/외장 저장장치/비밀번호 관리자), 확인 날짜, 위 고정 문장 출력 여부, 다른 PC 확인 여부다. 키·암호·개인 파일을 제출할 필요 없다. 외부 보관과 확인이 끝나기 전 BE-21 체크리스트는 미완료로 유지한다.

복구 키를 교체하면 과거 백업을 읽는 기존 키도 보관해야 한다. 공개키를 바꿨다고 과거 백업이 새 키로 바뀌지 않는다. 키를 잃었을 때 새 키 생성만으로 과거 백업을 복구했다고 기록하지 않는다.

현재 도구: 로컬 age v1.3.2의 `--help`로 `--passphrase`, 암호화 identity 입력을 확인했다. 도구를 새 PC에 준비할 때는 [공식 age 배포](https://github.com/FiloSottile/age/releases)를 사용한다.
