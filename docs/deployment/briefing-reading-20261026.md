# 브리핑·읽기 화면 보완

- Android 1.0.15 / versionCode 20. 기존 직접 다운로드 APK 서명을 유지하는 APK와 별도 업로드 키를 쓰는 Play AAB를 구분한다.
- 브리핑 상세는 고정 헤더와 독립 스크롤을 가진 전체 화면이다.
- 공통 패널은 드래그 손잡이를 제거하고 native Modal·ScrollView·KeyboardAvoidingView를 사용한다. 바깥 터치로 닫히지 않으며 저장 중 닫기를 차단한다. 긴 하단 동작도 별도 스크롤을 제공한다.
- 추천 이유·위험, 투자 메모, 기업 뉴스 제목의 줄 수 제한을 제거했다.
- 저장된 브리핑의 표시와 앱·웹 알림 발송 시 마크다운을 정리한다. 생성 프롬프트에도 일반 텍스트 문단을 요청한다. API 계약·저장 원문은 유지한다.
- 알림 길이 제한은 UTF-16 서로게이트 쌍을 분리하지 않는다.

## 검증

- 모바일 Node 검사 85개 통과, 타입·린트·출시 구성 검사 통과.
- 브리핑 텍스트 검사 3개 통과.
- 서버 전체 검사 265개 중 264개 통과·1개 제외, 실패 0.
- 실물 Android 연결 기기 없음. 실제 키보드·큰 글씨·스크롤·푸시 수신 검증은 자동 검사와 별개이며 아직 미완료다.

## 배포

소스 `b6489617de2490214296b6c13c45a800e24b4096`. [전체 CI](https://github.com/huni2/FireWatch/actions/runs/40335311195) 성공. Render 배포 7333744886 success 및 운영 health OK 확인.

[Android 1.0.15 공개 다운로드](https://github.com/huni2/FireWatch/releases/tag/v1.0.15-android-preview)에 APK·AAB·SHA256SUMS.txt를 게시했다. 기존 직접 다운로드 APK와 서명 일치, GitHub 업로드 파일의 크기·SHA-256 일치, APK 16KB ZIP 정렬, AAB bundletool·JAR 서명, 두 파일의 manifest와 내장 Expo 설정 1.0.15/20을 확인했다. [파일 검증 기록](android-115-build.json).

Play Console에서 기존 Alpha 1.0.14(19)의 운영 상태를 확인하고 새 버전 초안을 준비했다. 확장프로그램의 로컬 파일 접근이 꺼져 `fileChooser.setFiles`가 거절됐으므로 AAB 업로드·심사 전송은 미완료다. Chrome의 ChatGPT 확장프로그램에서 ‘파일 URL에 대한 액세스 허용’을 사용자가 활성화한 뒤 제출을 이어간다. 프로덕션 트랙이나 테스터·국가·권한 설정은 변경하지 않았다.

Play AAB는 기존 release 업로드 키로 빌드한다. 직접 다운로드 APK는 별도 출력 파일에 Android SDK `apksigner`로 기존 공개 APK의 로컬 키를 적용하고, 이전 APK의 인증서와 대조한다. AAB에는 직접 다운로드용 서명을 적용하지 않는다. `mobile/android`는 생성된 로컬 파일이며 Git에서 제외된다.
