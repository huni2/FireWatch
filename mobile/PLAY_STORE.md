# FireWatch 모바일 — Play 스토어 제출 가이드

**현재 상태(2026-10-10)** — APP-21 실제 설치/제출 미완료·사용자 APK/EAS 보류 유지. 현재 모바일 마지막 변경5f77550과 과거 접수7594daa/versionCode5를 구분한다. 아래 빌드 명령은 보류 해제 후 사용할 안내이며 자동 실행 지시가 아니다. 첫 운영 백업/별도 로컬 복원은 완료, 가운영 주1회/최근4개 보관은 승인됐다. 정기 운영·암호화·출시 전 매일 백업 자동화/실패 알림·출시 후 보관기간/계약/최종 SDK 확인은 BE-21에 남아 있다. [현행 데이터 보안 초안](../docs/product/release-submission-review/data-safety-draft.md)과 [설치 체크리스트](../docs/product/android-preview-20261009/checklist.md)를 함께 대조한다.

2026-10-07 현재 구현 기준의 제출 초안이다. 실제 설치 빌드, 서버 기록, SDK/서비스 제공자의 처리 내역을 대조한 뒤 Console 양식을 확정한다. 심사 통과나 법률 검토 완료를 의미하지 않는다.

## 데이터 보안: 현재 저장하는 자료

| 자료 | 양식에서 검토할 유형 | 목적 / 선택 여부 |
|---|---|---|
| 익명 기기 ID, 연결 기기, Expo 푸시 토큰 | 기기 또는 기타 ID | 기기별 기록·계정 연결. 푸시는 동의 및 알림 권한 허용 후 등록하며 권한 거부 상태에서도 앱 이용 가능 |
| Google 이메일, Google sub, 계정 ID | 이메일 주소 / 사용자 ID | 선택적 로그인·계정 관리·동기화 |
| 보유 종목·수량·매수 원금·현금·투자 조건 | 금융 정보의 기타 금융 정보 등 | 선택적 포트폴리오·분석. 증권계좌 연동이 없어도 사용자가 입력한 금융 자료를 저장함 |
| 관심 종목·키워드·설정·가상 주문/턴 기록 | 기타 사용자 생성 콘텐츠·앱 내 상호작용 등 | 사용자 설정·기록·시뮬레이션. 실제 필드별로 유형 대조 |
| 문의 본문·답변·상태·제출 경로/버전 | 기타 사용자 생성 콘텐츠, 문의 방식에 따라 기타 인앱 메시지 등 | 선택적 문제 신고·지원. 본인과 운영자만 조회 |
| 선택적 게임 순위 닉네임·수익률·조건·등록 시각·우승 기록 | 기타 사용자 생성 콘텐츠·앱 내 상호작용 등 | 명시적 동의한 기록 공개. 이메일/매매 상세 비공개, 공개 철회 및 계정 삭제 검증 |
| 공지 오늘 숨김·계정별 만료 시각 | 앱 내 상호작용 등 | 비로그인 로컬 보관과 로그인 서버 보관을 구분 |
| API 감사/운영 로그의 식별 자료와 요청 결과 | 기기/사용자 ID, 실제 필드에 따라 진단 등 | 운영·보안·장애 대응. 운영자 전용이라고 수집이 아닌 것은 아님 |

위 유형은 검토 목록이다. 동일 자료를 중복 신고하라는 뜻이 아니며 현재 Console 상세 정의에 맞춰 선택한다. 수집 없음은 SDK·호스팅 로그까지 확인 후 확정한다.

Render·Supabase·Google 인증·Expo Push/FCM 등 실제 서비스와 AI 요청 필드를 확인한다. 공유 여부는 서비스 제공자 예외 조건에 따라 판단하며, **판매/광고를 하지 않는다는 이유만으로 모든 공유를 '없음'으로 선택하지 않는다.** 외부 전송은 일시 처리라도 신고 검토 대상이다.

- 운영 API가 HTTPS인지 설치 빌드에서 확인한다. 로컬 HTTP 설정으로 암호화 전송을 주장하지 않는다.
- 현재 광고 SDK는 없으며 제출 빌드도 대조한다.
- 개인정보 URL과 외부 삭제 안내: [개인정보처리방침](https://firewatch-eqp.pages.dev/privacy). 공개 삭제 요청 절차와 앱 내 계정 삭제를 둘 다 검증한다.
- 삭제 대상 포트폴리오·문의 등과 실제 보존/삭제 범위를 방침과 대조한다.

근거: [데이터 보안 정의](https://support.google.com/googleplay/android-developer/answer/10787469?hl=ko), [사용자 데이터 정책](https://support.google.com/googleplay/android-developer/answer/10144311?hl=ko).

## 금융 기능 선언

FireWatch는 포트폴리오 작성·분석과 AI 종목 후보를 제공하므로 **모든 항목을 '없음'으로 선택하라는 이전 안내를 폐기한다.**

- '주식 거래 및 포트폴리오 관리' 범주에서 포트폴리오 관리 해당 여부를 검토한다. 실제 매매·증권계좌 연결·입출금은 제공하지 않는다.
- AI 종목 후보와 개인 조건 기반 분석은 '금융 조언' 범주도 검토한다. 참고용 고지만으로 정책 분류에서 제외된다고 판단하지 않는다.
- 가상 게임의 자산·뉴스·거래는 가상임을 별도로 설명한다.
- 스토어 소개·위험 안내·실제 AI 출력이 일치해야 한다. 수익 보장·실시간 시세·실거래 기능을 광고하지 않는다.

근거: [금융 기능 선언](https://support.google.com/googleplay/android-developer/answer/13849271?hl=ko), [금융 서비스 정책](https://support.google.com/googleplay/android-developer/answer/9876821?hl=ko).

## 콘텐츠 등급과 테스트 트랙

가상 게임의 결제·보상·현금 환전 여부를 그대로 답한다. 등급은 IARC 설문 결과로 정해지므로 전체 이용가/3+를 미리 확정하지 않는다.

내부 테스트(internal testing)와 비공개 테스트(closed testing)는 다르다. 내부 테스트에서 설치·서명·로그인 등을 확인하고, 계정에 요구되는 출시 자격/비공개 테스트 조건은 Console에서 확인한다. 내부 테스트 성공만으로 바로 프로덕션 출시 가능하다고 가정하지 않는다.

## 빌드 및 검증

mobile/eas.json의 base 프로필에 운영 API와 사용자 제공 Android 공개 OAuth ID를 반영했다. 로컬 .env에도 Android ID를 반영했다. 웹 ID로 대체하지 않으며 Render는 기존 Android·웹 audience를 유지한다.

~~~bash
cd mobile
npm run release:check
npx eas-cli build --profile preview --platform android
~~~

preview/production Android EAS 빌드는 의존성 설치 후 출시 설정 검사를 실행한다. Firebase 파일 누락·패키지 불일치 등은 실패로 처리한다. 개발 클라이언트는 강제 검사를 건너뛰며 출시 완료를 의미하지 않는다.

Firebase Console에 com.firewatch.mobile을 등록한 뒤 받은 **앱 설정 파일** google-services.json을 mobile/에 두거나, EAS preview/production 환경의 파일 변수 GOOGLE_SERVICES_JSON으로 공급한다. app.config.js가 파일을 연결한다. Firebase 관리자 서비스 계정 private_key 파일과 다르다. 서비스 계정 키는 앱·저장소·채팅에 넣지 말고 EAS Credentials의 FCM V1 설정에서 직접 관리한다.

OAuth 패키지와 실제 APK/Play 앱 서명 SHA-1을 대조한다. 현재 브라우저 기반 Android 로그인은 실기기 왕복 미검증이며 Expo는 Google 전용 네이티브 인증을 권장한다. ID 반영만으로 로그인 성공이 검증되지는 않는다.

[Android 검증 목록](../docs/deployment/android-release-check.md)을 따른다. Expo Go/JS export는 APK 검증을 대신하지 않는다. 확인 후 production AAB를 만들어 Console 테스트 트랙에 제출한다. 빌드 ID·커밋·서명·결과를 기록하고 예전 공개 APK를 최신으로 안내하지 않는다.

근거: [Expo FCM 설정](https://docs.expo.dev/push-notifications/fcm-credentials/), [EAS 환경변수](https://docs.expo.dev/eas/environment-variables/), [Expo Google 인증](https://docs.expo.dev/guides/google-authentication/).
