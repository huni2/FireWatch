# FireWatch 배포·운영 안내

2026-10-08 기준. 현재 구성은 **Cloudflare Pages(웹) + Render(백엔드) + Supabase PostgreSQL(DB)**이며 GitHub Actions가 예약 수집을 호출합니다. Android 설치 빌드는 EAS로 별도 관리합니다.

[서비스 소개](README.md) · [운영자 설정](docs/deployment/operator-access.md) · [웹 Google 로그인](docs/deployment/google-web-login.md) · [Android 검증](docs/deployment/android-release-check.md)

## 1. 운영 DB

운영은 `SPRING_PROFILES_ACTIVE=prod`로 실행합니다. DB는 컨테이너 로컬 파일이 아닌 Supabase PostgreSQL을 사용합니다. 로컬 개발용 H2 파일을 운영 영속 저장소로 사용하지 않습니다.

Render 환경변수에 다음 값을 등록합니다. 실제 값은 저장소에 커밋하지 않습니다.

| 변수 | 의미 |
|---|---|
| `SPRING_DATASOURCE_URL` | Supabase 연결 정보로 구성한 `jdbc:postgresql://<host>:<port>/<database>` |
| `SPRING_DATASOURCE_USERNAME` | DB 사용자 |
| `SPRING_DATASOURCE_PASSWORD` | DB 비밀번호 |

현재 운영 설정은 session pooler 기준 Hikari 최대 연결 3개·최소 유휴 0개·유휴 반환 60초입니다. session pooler의 연결 한도에는 배포 중 구/신 인스턴스와 다른 연결 주체도 포함되므로 함께 계산합니다. [실제 설정](backend/src/main/resources/application-prod.yml)을 기준으로 관리합니다.

배포와 검증을 위해 뉴스·시세·사용자 기록을 초기화하지 않습니다. 스키마 변경은 기존 데이터 보존과 롤백 가능성을 확인한 후 적용합니다. 보관량·백업/복구 절차도 운영 규모에 맞춰 별도로 관리해야 합니다.

## 2. Render 백엔드

저장소의 [render.yaml](render.yaml)을 기준으로 배포합니다. 웹과 문서 변경만으로 백엔드를 재시작할 필요는 없습니다. Blueprint의 빌드 필터 동기화와 자동 배포 설정은 실제 Render 화면에서 확인합니다.

| 환경변수 | 용도와 경계 |
|---|---|
| `GEMINI_API_KEY` / `GEMINI_MODEL` | 확보한 시장 자료·뉴스의 요약/해석. Search Grounding에 의존하지 않음 |
| `EXIM_API_KEY` | 한국수출입은행 환율 조회 |
| `ECOS_API_KEY` | 한국은행 ECOS 자료. 한국국채 지표용 |
| `GOOGLE_OAUTH_CLIENT_IDS` | 서버가 허용할 OAuth audience. 기존 Android ID와 웹 ID를 쉼표로 함께 등록 |
| `SETTINGS_API_KEY` | 일부 클라이언트 쓰기 경로의 설정 키. 앱/웹에 포함될 수 있어 운영자 인증 비밀로 간주하지 않음 |
| `OPERATOR_API_KEY` | 서버/예약 작업 전용 비밀. 클라이언트 빌드에 넣지 않음 |
| `FIREWATCH_OPERATOR_EMAIL` | 검증된 로그인 세션의 운영자 계정 판정에 사용 |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push 공개키/서버 비밀키 |
| `FIREWATCH_ALLOWED_ORIGINS` | 허용할 웹 origin. 운영 웹은 `https://firewatch-eqp.pages.dev` |

FCM 서버 자격증명과 Expo 전송 설정은 [서버 코드 설정](backend/src/main/resources/application.yml), [Android 안내](mobile/README.md), [운영자 알림 안내](docs/deployment/operator-access.md)를 함께 확인합니다. Firebase 서비스 계정 비밀 파일은 클라이언트에 포함하지 않습니다.

## 3. GitHub Actions 예약 작업

[예약 워크플로](.github/workflows/daily-trigger.yml)는 시간당 `:07/:22/:37/:52`에 `/api/scheduler/trigger-if-due`를 호출합니다. 서버에서 KST 날짜·수집 조건·수신 설정을 판정합니다. 외부 폴링은 서버 기동 보조와 놓친 작업 확인에 사용하며 예약 실행 시각을 정확히 보장하지는 않습니다.

저장소 Actions secrets에 다음 두 값을 등록합니다.

- `RENDER_BACKEND_URL`: `https://firewatch-backend-q3cv.onrender.com`
- `OPERATOR_API_KEY`: Render와 동일한 서버 전용 운영 키

기존 설정용 공개 키를 운영 트리거 키로 사용하지 않습니다. 워크플로 이름은 **Briefing Scheduler Poll**, 현재 curl 제한은 280초입니다. 수동 실행도 due 판정을 거칩니다. HTTP 200 또는 `triggered:true`는 요청 접수 증거이며 실제 수집 완료 여부는 작업 기록·저장 데이터·감사로그로 확인합니다.

수집에는 종류별 KST 하루 실패 한도와 제한된 재시도 간격이 적용됩니다. 장애가 있다고 반복 수동 실행으로 한도를 우회하지 않습니다. 마지막 정상 자료를 유지하고 운영자 진단에서 원인을 확인합니다.

## 4. Cloudflare Pages 웹

직접 업로드 구성입니다. 로컬에서 빌드할 때 사용하는 `web/.env`는 [예제](web/.env.example)를 참고합니다. Cloudflare 대시보드 값을 바꾸는 것만으로 이미 로컬에서 만든 번들의 값은 바뀌지 않습니다.

| 변수 | 값의 종류 |
|---|---|
| `VITE_API_BASE_URL` | Render API URL |
| `VITE_GOOGLE_CLIENT_ID` | 웹 애플리케이션 OAuth 공개 클라이언트 ID |
| `VITE_SETTINGS_API_KEY` | 필요한 클라이언트 설정 키. 운영자 권한 부여에 사용하지 않음 |
| `VITE_VAPID_PUBLIC_KEY` | 서버 VAPID 공개키와 동일 값 |

`VITE_*` 값은 브라우저 번들에서 확인할 수 있습니다. 운영 키, DB 비밀번호, VAPID 비밀키를 넣지 않습니다.

저장소 루트 PowerShell에서 실행합니다.

```powershell
npm --prefix web ci
npm --prefix web run lint
npm --prefix web run build
npx wrangler pages deploy web/dist --project-name firewatch --branch main
```

Cloudflare 인증은 로그인 또는 Pages 편집 권한이 있는 토큰으로 구성합니다. 토큰 값을 문서·커밋·화면 캡처에 남기지 않습니다. 실제 프로젝트 이름은 `firewatch`, 운영 URL은 [firewatch-eqp.pages.dev](https://firewatch-eqp.pages.dev)입니다.

## 5. Android

웹 배포와 별개로 최신 소스의 설치 빌드가 필요합니다. `preview`는 APK, `production`은 AAB입니다. EAS 프로젝트는 기존 설정에 연결돼 있으므로 재생성하지 않습니다.

```powershell
# mobile/에서 실행
npm run release:check
npx eas-cli build --platform android --profile preview
```

Firebase Android 설정 파일, EAS의 FCM V1 자격증명, OAuth ID와 서명 SHA-1은 각각 확인합니다. 서버 비밀과 OAuth 클라이언트 비밀번호는 앱에 넣지 않습니다. Expo Go 화면 확인과 설치 앱의 Google 로그인·원격 푸시 실수신은 다른 검증입니다.

[Play 제출 안내](mobile/PLAY_STORE.md)와 [설치 검증 목록](docs/deployment/android-release-check.md)을 사용합니다. 최신 기능의 실제 설치 검증은 아직 완료하지 않았습니다.

## 6. 배포 후 점검

- 공개 health와 웹 정적 파일 응답, API origin/CORS와 새 번들 적용 확인.
- 기존 뉴스·시세·브리핑·사용자 기록 보존 여부 확인. 테스트를 위해 운영 기록을 삭제하지 않음.
- 익명 운영 API 접근 거절, 일반 계정 권한 제한, 운영자 세션의 진단 접근 확인.
- 사용자 본인이 계정 로그인과 저장/기기 연결 확인. 비밀 토큰을 테스트 로그에 출력하지 않음.
- 예약 작업 접수와 실제 수집 완료를 구분해 확인. 내부 장애 상세는 일반 사용자에게 노출하지 않음.
- 웹·Android 각각 공지, 문제 신고, 기록/게임의 핵심 흐름 확인. 운영에 가짜 문의·게임 순위·주문을 자동 생성하지 않음.
- 푸시 제공처의 수락과 실제 기기 수신을 구분해 기록.

CI는 [.github/workflows/validate.yml](.github/workflows/validate.yml)에 정의돼 있습니다. 테스트 성공은 현재 제공처 장애 복구나 실기기 검증을 대체하지 않습니다.

## 운영 제약

무료 범위 운영을 목표로 구성했으며 요금·한도·지속 가용성을 보장하지 않습니다. Render 콜드스타트와 예약 작업 지연, 외부 데이터 누락/제한, PostgreSQL 연결 예산, 뉴스·관측·감사로그의 보관량을 관리해야 합니다. 현재 금융 수집 장애 복구와 최신 Android 설치 검증은 남은 과제입니다.
