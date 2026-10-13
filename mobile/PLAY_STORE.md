# FireWatch 모바일 — Play 스토어 제출 가이드

**현재 상태(2026-10-13)** — 최신 설치본은 **1.0.9 / versionCode 14**, 소스 `a95f702254ba34b380ae08aeaa4decad371dfde0`다. 로컬 Gradle 빌드·동일 서명·파일 검증·GitHub 공개 다운로드·빌드 소스 CI를 확인했다. [APK](https://github.com/huni2/FireWatch/releases/download/v1.0.9-android-preview/FireWatch-1.0.9-android.apk)는 직접 설치 테스트용이며 Play 제출용 AAB가 아니다. 실제 Android 로그인·푸시·접근성과 Play 제출은 미확인이다. 추가 APK/AAB/EAS 빌드는 사용자 요청 전 실행하지 않는다. [설치 체크리스트](../docs/product/android-preview-20261009/checklist.md)와 [데이터 보안 초안](../docs/product/release-submission-review/data-safety-draft.md)을 대조한다.

2026-10-13 공식 정책을 재확인한 제출 초안이다. 실제 설치 빌드, 서버 기록, SDK/서비스 제공자의 처리 내역을 대조한 뒤 Console 양식을 확정한다. 심사 통과나 법률 검토 완료를 의미하지 않는다.

## 먼저 확인할 개발자 계정 유형

Google은 금융 제품·서비스 제공 개발자에게 조직 계정을 요구한다. 금융 서비스 정책은 자금 관리·투자 및 개인화된 조언을 포함하며, 금융 기능 선언은 주식 거래 및 포트폴리오 관리와 금융 조언을 별도 항목으로 둔다.

FireWatch는 수동 보유 기록·구성 점검·AI 후보를 제공한다. 실제 주문이 없다는 이유만으로 금융 기능이 없다고 선언하거나 개인 계정 출시가 가능하다고 확정하지 않는다. 현재 기능은 위 범주와 관련될 가능성이 있으므로 **개인 계정 제출 적합성은 미확인**이다. 이것은 FireWatch에 대한 Google의 개별 판정이 아니라 공식 정책과 기능을 대조한 판단이다.

Play Console 도움말에 실제 기능을 설명하고 필요한 계정 유형을 확인한다. 금융 앱 해당 시 조직 계정 전환/등록과 필요한 검증 자료를 준비한다. 카테고리를 교육·게임으로 바꾸거나 참고용 고지를 붙이는 것으로 계정 요건을 우회하지 않는다. D-U-N-S 등 조직 자료가 없으면 임의 정보를 입력하지 않는다.

문의 문안: “FireWatch는 증권계좌 연결·실제 주문·입출금을 제공하지 않습니다. 사용자가 입력한 보유 수량·매입가로 구성과 집중도를 점검하고, 수집된 시장 뉴스 및 AI 분석 후보를 제공합니다. 별도로 가상 가격과 뉴스로 진행하는 투자 연습이 있습니다. 이 기능 범위로 개인 개발자 계정 제출이 가능한지, 조직 계정이 필요한지 확인 부탁드립니다.”

근거: [계정 유형](https://support.google.com/googleplay/android-developer/answer/13634885?hl=ko), [Play Console 요구사항](https://support.google.com/googleplay/android-developer/answer/18258653?hl=ko), [금융 서비스](https://support.google.com/googleplay/android-developer/answer/9876821?hl=ko).

## 스토어 등록정보 초안

- 앱 이름: FireWatch
- 짧은 설명: 직접 기록한 투자와 시장 소식을 연결해 보유 구성을 점검하세요.
- 상세 설명: “보유 기업과 수량·매입가를 직접 기록하고, 기업·분야·통화별로 투자가 몰린 곳을 살펴보세요. 수집된 기업 가격과 관련 뉴스, AI 분석의 근거를 함께 확인할 수 있습니다. 가상투자 연습에서는 가상의 가격·뉴스·자금으로 투자 결정을 돌아볼 수 있습니다.”
- 기능 한계: “증권계좌 자동 연결과 실제 주식 주문은 제공하지 않습니다. 가격과 뉴스는 수집 시점 기준이며 일부 기업에는 자료가 없을 수 있습니다. AI 분석은 오류가 있을 수 있는 참고 정보이며 수익을 보장하지 않습니다. 투자 연습의 결과는 실제 투자 성과를 예측하지 않습니다.”

소개 문구는 초안이다. 최신 APK의 실제 Android 화면으로 스크린샷을 확보하고 웹 화면·예전 APK·미구현 목업을 제출하지 않는다. 국내 전체 기업 검색을 전체 시세/AI 분석 제공으로 소개하지 않는다. 가격 기준 시각과 누락 화면도 실제 기능에 맞춘다. [출시 기능 범위](../docs/product/release-scope.md).

## 심사자가 접근할 수 있는지 확인

Google 연결이 필요한 문의·계정 자료·순위 등록 등은 앱 액세스 선언에 적는다. 일부 화면을 비로그인으로 볼 수 있어도 전체 기능이 공개됐다고 답하지 않는다. 일반 사용자 검토용 계정과 영어 로그인 절차를 Console의 비공개 입력란에 제공하고, Google 보안 확인/OTP·지역 제한·만료 때문에 막히지 않는지 확인한다. 운영자 계정·API 키·토큰·비밀번호는 README/Issue/PR에 넣지 않는다. 운영자 관리 화면은 일반 사용자 기능과 구분한다. 현재 검토용 계정 접근 검증은 미완료다.

영어 안내 초안: “Open FireWatch and complete the initial privacy notice. Market information and investment practice can be explored without Google sign-in. To review account-linked features, open the account screen and select Google sign-in using the review account details provided separately. Notification permission is optional. The app does not execute real stock orders.” 실제 설치본의 화면명·검토 계정으로 최종 대조한다.

근거: [심사용 로그인 정보 요구사항](https://support.google.com/googleplay/android-developer/answer/15748846?hl=ko).

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

내부 테스트(internal testing)와 비공개 테스트(closed testing)는 다르다. 2023-11-13 이후 생성된 개인 계정은 비공개 테스트에서 최소12명이 연속14일 참여한 뒤 프로덕션 액세스를 신청해야 한다. 조건을 채워도 자동 승인되는 것은 아니다. 계정 유형 확인 후 Console에 표시되는 조건과 실제 테스트 기록을 따른다. GitHub APK 직접 설치는 이 트랙 참여 요건을 대신하지 않는다. [개인 계정 테스트 요건](https://support.google.com/googleplay/android-developer/answer/14151465?hl=ko).

## 빌드 및 검증

mobile/eas.json의 base 프로필에 운영 API와 사용자 제공 Android 공개 OAuth ID를 반영했다. 로컬 .env에도 Android ID를 반영했다. 웹 ID로 대체하지 않으며 Render는 기존 Android·웹 audience를 유지한다.

~~~bash
cd mobile
npm run release:check
npx eas-cli build --profile preview --platform android
~~~

preview/production Android EAS 빌드는 의존성 설치 후 출시 설정 검사를 실행한다. Firebase 파일 누락·패키지 불일치 등은 실패로 처리한다. 개발 클라이언트는 강제 검사를 건너뛰며 출시 완료를 의미하지 않는다.

Firebase Console에 com.firewatch.mobile을 등록한 뒤 받은 **앱 설정 파일** google-services.json을 mobile/에 두거나, EAS preview/production 환경의 파일 변수 GOOGLE_SERVICES_JSON으로 공급한다. app.config.js가 파일을 연결한다. Firebase 관리자 서비스 계정 private_key 파일과 다르다. 서비스 계정 키는 앱·저장소·채팅에 넣지 말고 EAS Credentials의 FCM V1 설정에서 직접 관리한다.

현재 Android 로그인은 네이티브 Google 계정 선택 방식이다. 실제 기기 로그인 성공은 별도 확인한다. Play App Signing의 앱 서명 인증서는 로컬 APK/업로드 인증서와 다를 수 있으므로 Console 앱 서명 SHA-1과 패키지를 Google OAuth/Firebase 설정에 대조한다. 로컬 APK에서 로그인된다고 Play 설치본까지 검증된 것은 아니다. 기존 GitHub APK에서 Play 설치본으로의 업데이트 호환도 인증서에 따라 달라질 수 있다. [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756?hl=ko).

새 앱의 Play 제출 형식은 AAB다. production 프로필의 ABI와 target SDK·최종 병합 권한·16KB 네이티브 라이브러리 호환성은 제출 AAB/Play 생성 APK에서 다시 확인한다. 기존 preview APK의 ARM32/64·ZIP 정렬 검증만으로 production 전체 ABI 검증을 완료 처리하지 않는다. 위 preview EAS 명령은 선택 가능한 직접 설치용 절차이며 Play AAB 제출 명령이 아니다. [AAB 안내](https://support.google.com/googleplay/android-developer/answer/9844279?hl=ko).

[Android 검증 목록](../docs/deployment/android-release-check.md)을 따른다. Expo Go/JS export는 APK 검증을 대신하지 않는다. 확인 후 production AAB를 만들어 Console 테스트 트랙에 제출한다. 빌드 ID·커밋·서명·결과를 기록하고 예전 공개 APK를 최신으로 안내하지 않는다.

근거: [Expo FCM 설정](https://docs.expo.dev/push-notifications/fcm-credentials/), [EAS 환경변수](https://docs.expo.dev/eas/environment-variables/), [Expo Google 인증](https://docs.expo.dev/guides/google-authentication/).
