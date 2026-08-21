# FireWatch 배포 가이드 (BE-8 / WEB-5)

카드 등록 없이 가입 가능한 무료 등급 조합: **Render(백엔드) + Supabase(DB) + Cloudflare Pages(웹) + GitHub Actions(스케줄러 트리거)**.
근거: Oracle Cloud 가입 실패 → 대안 검토 → `llm-wiki/Decisions/`의 최신 ADR 참고.

## 0. DB — Supabase (Render 배포보다 먼저 해야 함)

Render 무료 웹서비스는 **영구 디스크가 없어서** 슬립→재기동(15분 무활동마다)할 때 컨테이너 파일시스템이 통째로
새로 뜬다 — H2 파일 DB를 그대로 썼다가 배포 몇 시간 만에 이력이 전부 사라지는 걸 실제로 겪었다([[Decisions/0009-persistent-db-supabase]]).
그래서 프로덕션은 외부 Postgres(Supabase)를 쓴다. 로컬 개발은 기존 H2 그대로라 영향 없음.

1. [supabase.com](https://supabase.com)에서 가입(카드 불필요) → 새 프로젝트 생성.
2. 프로젝트 생성 후 **Project Settings → Database → Connection string** → **Session pooler** 탭 선택
   (Render는 상시 연결이라 Session pooler가 적합, Transaction pooler 아님).
3. 다음 세 값을 확인해둔다 — 1번(Render) 배포 시 그대로 입력한다.

   | 값 | Supabase 화면상 위치 |
   |---|---|
   | `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<Host>:<Port>/<Database>` 형태로 직접 조립(Host/Port/Database는 Connection string 화면에 표시됨) |
   | `SPRING_DATASOURCE_USERNAME` | Connection string의 User |
   | `SPRING_DATASOURCE_PASSWORD` | 프로젝트 생성 시 설정한 DB 비밀번호(분실 시 같은 화면에서 재설정 가능) |

## 1. 백엔드 — Render

Render 무료 티어는 15분 무활동 시 슬립한다. 내부 `@Scheduled` cron 대신 **GitHub Actions가 매일 08:00 KST에
`/api/scheduler/trigger`를 호출해 깨우는 방식**을 쓴다(`.github/workflows/daily-trigger.yml`).

1. [render.com](https://render.com)에서 GitHub 계정으로 가입(카드 불필요).
2. Render 대시보드 → **New > Blueprint** → `huni2/FireWatch` 저장소 연결. `render.yaml`을 자동 인식한다.
3. 배포 전 다음 환경변수를 Render 대시보드에서 채운다(`sync: false`로 표시된 항목 — 절대 repo에 커밋하지 않음):

   | 변수 | 값 |
   |---|---|
   | `GEMINI_API_KEY` | Google AI Studio에서 발급(2026-08-21 기준 무료 티어에서 Search Grounding이 막혀 있어 FALLBACK으로 운영 중 — [[Decisions/0010-naver-news-instead-of-gemini-grounding]]) |
   | `EXIM_API_KEY` | 한국수출입은행 Open API 포털에서 발급 |
   | `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | [developers.naver.com/apps](https://developers.naver.com/apps) → 애플리케이션 등록 → 사용 API에 "검색" 체크 → 발급된 Client ID/Secret. 관련 뉴스 링크 제공용([[Decisions/0010-naver-news-instead-of-gemini-grounding]]) |
   | `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > 새 비공개 키 생성(JSON 파일 내용 전체를 문자열로 붙여넣기) |
   | `SETTINGS_API_KEY` | `a5d86a770681da35bdbc73ccfc6c873fa20953008985b701` (이미 GitHub Actions 시크릿으로도 등록됨 — 아래 2번과 값이 반드시 같아야 한다) |
   | `SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | 0번에서 확인한 Supabase 값 |

   `SPRING_PROFILES_ACTIVE=prod`는 `render.yaml`에 이미 고정값으로 들어있어 따로 입력할 필요 없다.

4. 배포 완료 후 Render가 부여한 URL을 확인한다(예: `https://firewatch-backend.onrender.com`).
5. `render.yaml`의 `FIREWATCH_ALLOWED_ORIGINS`는 `https://firewatch-eqp.pages.dev`로 이미 채워져 있다(3번에서 실제 배포해 확인한 값).

## 2. GitHub Actions 시크릿

```bash
gh secret set RENDER_BACKEND_URL --body "https://firewatch-backend.onrender.com" --repo huni2/FireWatch
```

`SETTINGS_API_KEY`는 이미 등록되어 있음(위 표와 동일 값). 등록 확인: `gh secret list --repo huni2/FireWatch`.

수동 테스트: GitHub 저장소 → Actions 탭 → "Daily Morning Briefing Trigger" → **Run workflow**로 즉시 실행 가능
(`workflow_dispatch` 트리거 포함됨).

## 3. 웹 — Cloudflare Pages

프로젝트는 이미 만들어져 있다(`firewatch`, 배포 URL `https://firewatch-eqp.pages.dev` — "firewatch" 이름이 겹쳐 자동으로
"-eqp" 접미사가 붙었다). Render 백엔드 URL이 정해지면(1번의 4단계) `web/.env`의 `VITE_API_BASE_URL`을 그 값으로 바꾸고 재배포한다.

```bash
cd web
npm run build
CLOUDFLARE_API_TOKEN=<Pages:Edit 권한 토큰> npx wrangler pages deploy dist --project-name=firewatch
```

빌드 전 프로덕션 환경변수 확인(`web/.env` 또는 Cloudflare Pages 대시보드의 환경변수):

| 변수 | 값 |
|---|---|
| `VITE_API_BASE_URL` | Render 백엔드 URL (1번의 4단계에서 확인한 값) |
| `VITE_SETTINGS_API_KEY` | `a5d86a770681da35bdbc73ccfc6c873fa20953008985b701` (Render/GitHub Actions와 동일 값 — ADR 0004: 진짜 비밀 아님, 클라이언트에 노출됨) |

`CLOUDFLARE_API_TOKEN`은 Cloudflare 대시보드 → 프로필 → **Account API Tokens**(User API Tokens 아님) → Create Token →
"Edit Cloudflare Workers" 템플릿 선택 후 **Pages: Edit** 권한을 추가해서 발급한다. 기본 "Edit Cloudflare Workers" 템플릿에는
Pages 권한이 빠져 있어 그대로 쓰면 `pages/projects/.../upload-token`에서 `Authentication error [code: 10000]`가 난다.

## 4. 배포 후 확인

- [ ] `curl https://<render-url>/api/settings` → 200
- [ ] GitHub Actions에서 워크플로 수동 실행 → 성공, `/api/audit-logs`에 SCHEDULER 이벤트 기록 확인
- [ ] Cloudflare Pages URL 접속 → 대시보드 로드, CORS 에러 없음(브라우저 콘솔 확인)
- [ ] 설정 화면에서 저장 테스트 → 200, 감사로그에 USER_SETTING 기록

## 알려진 한계

- Supabase 무료 티어는 0.5GB 저장공간 제한이 있다 — 이 프로젝트 데이터 규모(하루 1건 브리핑 + 소량 감사로그)로는
  충분하고도 남지만, 참고([[Decisions/0009-persistent-db-supabase]]).
- Render 무료 티어 콜드스타트가 30~60초라 GitHub Actions 워크플로 타임아웃(120초)을 여유 있게 잡아뒀다.
