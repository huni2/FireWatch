# Android AAB 출시 절차

Play Console에 새 버전을 올릴 때마다 반복하는 절차다. 2026-10-15 release 키스토어 설정 이후 기준.

## 매번 업데이트할 때 할 일

1. **코드 수정**
2. **버전 올리기** — `mobile/android/app/build.gradle`의 `versionCode 17`과 `versionName "1.0.12"`를 수동으로 올린다(예: `versionCode 18`, `versionName "1.0.13"`). 이거 안 올리면 Play가 업로드 자체를 거부한다(같은 versionCode 재업로드 불가). 자동 증가 스크립트는 아직 없음 — 매번 손으로 수정.
3. **AAB 빌드**
   ```bash
   cd mobile/android
   ./gradlew bundleRelease --no-daemon
   ```
   `mobile/android/keystore.properties`(gitignored)에 등록된 release 키스토어가 자동으로 쓰인다. 결과물: `mobile/android/app/build/outputs/bundle/release/app-release.aab`
4. **Play Console에 업로드**
   - 지금처럼 비공개 테스트 트랙에 새 버전 추가, 또는
   - 나중에 프로덕션 액세스를 받은 뒤엔 "프로덕션" 트랙에 바로 업로드 가능
   - 출시 노트 작성 → 저장 → "검토를 위해 Google에 버전 전송"
5. **Google 검토 대기** — 보통 몇 시간~며칠. 승인되면 자동 배포(단계적 출시 비율 설정 가능).

## 서명 키

- 파일: `E:\창훈\FireWatch-release-keystore\firewatch-release.keystore` (저장소 밖, 로컬 전용)
- 비밀번호·지문: `E:\창훈\FireWatch-release-keystore\release-keystore-passwords.txt`
- **이 키를 분실하면 이 앱의 업데이트를 영구히 올릴 수 없다**(Google에 소유권 증빙 후 키 재설정 요청 필요). 분실·유출 금지.
- `mobile/android/app/build.gradle`이 `keystore.properties` 파일 존재 여부로 release 서명 설정을 자동 분기한다. 파일이 없으면 기존 `debug.keystore`로 서명되며, 그 경우 Play 업로드는 거부된다(디버그 서명 금지).

## 문제 해결 — `bundleRelease`가 이상하게 실패할 때

2026-10-28에 `bundleRelease`가 연속 4번 실패했다(OOM처럼 보이는 네이티브 크래시 → ninja 크래시 → 명시적 "디스크 공간이 부족합니다"). 근본 원인은 전부 **C 드라이브가 거의 꽉 찬 것**(한 자리 GB대)이었다 — 프로젝트는 E 드라이브에 있어도 Gradle 캐시(`C:\Users\<user>\.gradle`, 수 GB)와 Windows 임시 폴더(`%TEMP%`, 패키징 단계의 스크래치 공간)는 기본적으로 C 드라이브를 쓴다. 증상이 매번 다르게 나타나(OOM/네이티브 크래시/디스크 공간 부족) 처음엔 원인을 특정하기 어려웠다.

**해결**: 이 한 번의 빌드에만 적용되는 환경변수로 캐시·임시 폴더를 여유 있는 드라이브로 돌린다(시스템 전역 설정은 안 건드림):
```bash
export GRADLE_USER_HOME="E:/gradle-home"
export TEMP="E:\\winotemp"
export TMP="E:\\winotemp"
cd mobile/android && ./gradlew bundleRelease --no-daemon
```
`GRADLE_USER_HOME`만 돌려서는 부족했다 — 패키징 단계(`:app:packageReleaseBundle`)가 Gradle 캐시가 아니라 Java/Windows 임시 디렉터리를 쓰기 때문에 `TEMP`/`TMP`까지 같이 돌려야 실제로 해결됐다.

C 드라이브 공간 자체를 정리하거나, `GRADLE_USER_HOME`/`TEMP`를 시스템 환경변수로 영구 설정해두면 매번 이 변수를 안 줘도 된다.

## 참고

- 과거 버전(1.0.1~1.0.12)은 `debug.keystore`로 서명되어 GitHub 직접 배포만 가능했고 Play 제출은 불가능했다. 2026-10-15 release 키 신규 발급 후 Play 제출 가능해짐.
- Play 앱 서명(Play App Signing) 사용 시 실제 배포 인증서는 업로드 키와 다를 수 있다 — Google 로그인(OAuth)·Firebase(FCM)에 등록해야 하는 지문은 Play Console의 설정 > 앱 무결성 > 앱 서명 메뉴에서 확인한다.
