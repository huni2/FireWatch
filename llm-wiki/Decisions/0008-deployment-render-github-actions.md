---
source: "2026-08-20 bkit PDCA Do 단계(/pdca do firewatch --scope module-6,module-10) 배포 착수 중 대화 — [[log]] 2026-08-20"
verified: 2026-08-20
---

# 0008 — 백엔드는 Oracle Cloud 대신 Render, 스케줄러는 GitHub Actions가 외부에서 깨운다

## 상태
채택

## 맥락

[[0001-tech-stack-baseline]]은 백엔드 배포처를 Oracle Cloud Always Free Tier로 채택했다. 실제 가입을 시도하니 계정 생성 자체가 막혔다(카드/본인인증 단계 실패, 원인 불명). 대안을 조사한 결과:

- **Railway** — 2026년 기준 진짜 무료 티어가 사라지고 1회성 체험 크레딧 후 유료 전환(월 최소 $1) — $0 하드 제약 위반으로 제외.
- **Fly.io** — 무료 티어 폐지, 카드 필수 — 제외.
- **Google Cloud e2-micro Always Free** — 진짜 24/7 무료지만 Oracle과 동일하게 카드 인증 단계가 있어 같은 문제가 재발할 위험.
- **Render** — 카드 불필요, 무료 웹 서비스(월 750시간)가 있으나 **15분 무활동 시 슬립**.
- **Koyeb** — 카드 불필요, 무료 인스턴스 1개 영구 제공하나 **1시간 무활동 시 슬립**, 프랑크푸르트/워싱턴DC 리전만.

## 결정

**Render(백엔드) + GitHub Actions(스케줄러 트리거) + Cloudflare Pages(웹)** 조합을 채택한다.

- Render 무료 웹 서비스에 Docker로 배포(`backend/Dockerfile`, `render.yaml`).
- 매일 08:00 KST 실행은 백엔드 내부 `@Scheduled`에 맡기지 않는다 — 슬립 중엔 애초에 프로세스가 안 떠 있어 무의미하다.
  대신 **GitHub Actions 예약 워크플로**(`.github/workflows/daily-trigger.yml`, cron `0 23 * * *` UTC = 08:00 KST)가
  `POST /api/scheduler/trigger`(BE-7에서 이미 만든 `X-API-Key` 보호 엔드포인트, [[Decisions/0004-write-api-protection]])를
  호출해 Render를 깨운다. 콜드스타트 30~60초는 워크플로 타임아웃(120초)으로 흡수.
- 내부 `@Scheduled`(`SchedulerJob.runMorningBriefing`)는 코드에서 제거하지 않는다 — 로컬 개발/향후 상시구동 환경 전환 시를 위한 안전망으로 남겨둔다. 프로덕션(Render)에서는 사실상 죽은 경로이지만 해가 되지 않는다.

## 근거

- Render·Koyeb 둘 다 카드 없이 가입되는 후보였다. Render를 선택한 이유는 자료가 훨씬 많고(레퍼런스·트러블슈팅 정보), 15분 슬립이 Koyeb의 1시간보다 짧아 GitHub Actions가 깨운 뒤 실제 실행까지의 총 지연이 더 적기 때문.
- "24/7 상시 구동" 대신 "매일 정확히 한 번, 외부에서 깨워서 실행"으로 문제를 재정의하면 슬립 자체가 문제가 아니게 된다 — 이 프로젝트는 애초에 하루 1회 배치성 작업이라 상시 구동이 진짜로 필요한 적이 없었다(FCM 발송도 그 직후 1회뿐). Oracle Cloud를 못 쓰게 된 것이 오히려 아키텍처를 더 그 용도에 맞게 단순화한 계기.
- `POST /api/scheduler/trigger` 엔드포인트는 이미 BE-7(module-5)에서 디버그용으로 만들어져 있었다 — 새 기능 없이 기존 엔드포인트를 프로덕션 스케줄러의 정식 진입점으로 승격시킨 것뿐이다.

## 결과·트레이드오프

**얻는 것** — Oracle Cloud 가입 문제를 완전히 우회하면서도 $0 제약과 "매일 08:00 자동 실행" 요구사항을 동시에 만족. 스케줄링 로직이 GitHub(이미 인증된 계정)에 있어 별도 크론 서버가 필요 없다.

**감수하는 것**
- **Render 무료 티어에 영구 디스크가 없다** — H2 파일 DB가 재배포 시 초기화될 위험이 있다(`DEPLOY.md`에 명시). 감사로그·브리핑 이력이 배포 주기마다 유실될 수 있다는 뜻이라, 이 프로젝트의 핵심 가치(감사 가능성)와 정면으로 부딪히는 한계다. Phase 1은 이 리스크를 감수하고, 데이터 유실이 실제로 문제가 되면 외부 영속 DB(Turso 등) 도입을 재검토한다.
- GitHub Actions가 죽거나(계정 문제·GitHub 장애) cron이 안 돌면 그날 브리핑이 통째로 안 생긴다 — 단일 장애점이 Oracle Cloud의 자체 cron에서 GitHub Actions로 옮겨간 것뿐, 없어진 게 아니다.
- 콜드스타트 시간만큼 "08:00 정각"이 아니라 "08:00~08:02 사이"가 된다 — 명세서가 초 단위 정확도를 요구하진 않아 허용 가능하다고 판단.

## 재검토 트리거

- Render 재배포로 실제 데이터 유실이 발생하면 → 영속 DB(Turso/외부 Postgres) 도입.
- GitHub Actions 무료 한도(퍼블릭 무제한, 프라이빗 저장소는 월 2,000분)에 근접하면 → 이 저장소는 private이라 한도 안에 있는지 주기적 확인(이 워크플로는 1일 1회, 몇 초짜리라 한도에 걸릴 가능성은 매우 낮음).
- Render가 무료 티어 정책을 바꾸면(카드 요구 등) → Koyeb으로 전환.
