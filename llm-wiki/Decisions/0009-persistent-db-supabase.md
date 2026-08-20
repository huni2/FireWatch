---
source: "2026-08-20 Render 배포 직후 사용자가 대시보드 확인 중 'DB가 통째로 비어있다'고 보고 — [[log]] 2026-08-20"
verified: 2026-08-20
---

# 0009 — H2 파일 DB를 버리고 Supabase Postgres로 전환한다

## 상태
채택

## 맥락

[[0008-deployment-render-github-actions]]에서 이미 위험으로 명시해뒀다: "Render 무료 티어에 영구 디스크가 없다 — H2 파일 DB가 재배포 시 초기화될 수 있다." 감수할 리스크로 분류하고 넘어갔는데, 실제로는 **재배포 때만이 아니라 무활동 슬립 후 재기동 한 번만으로도** 벌어졌다 — Blueprint 배포 직후 수동 트리거로 만든 브리핑 1건·감사로그 전부가 몇 시간 안에 흔적도 없이 사라졌다(`GET /api/audit-logs` → `total: 0`). Render 무료 웹서비스는 컨테이너가 재시작될 때마다 파일시스템이 완전히 새로 뜨는 구조라, "재배포"뿐 아니라 "슬립→깨어남" 사이클도 사실상 컨테이너 재시작이었던 것.

이 프로젝트의 핵심 가치는 [[Context]]에 명시된 대로 "감사로그로 매일 이력을 쌓아 모니터링"이다. 이력이 몇 시간마다 사라지면 그 가치 자체가 성립하지 않는다 — 감수 가능한 리스크가 아니라 정면으로 부딪히는 결함이었다.

## 결정

**Supabase의 무료 Postgres**로 데이터소스를 전환한다. Spring profile(`prod`, `SPRING_PROFILES_ACTIVE=prod`)로 분기해 로컬 개발은 기존 H2 파일 DB 그대로 두고, Render 배포만 외부 Postgres를 쓴다.

- `application-prod.yml` — `SPRING_DATASOURCE_URL`/`_USERNAME`/`_PASSWORD` env var 3개로 Supabase Session Pooler에 연결.
- 스키마는 `spring.sql.init.platform`으로 분기(`schema-h2.sql` / `schema-postgresql.sql`) — Hibernate DDL 자동생성은 여전히 안 쓴다(`ddl-auto: none`, Design §3.1 원칙 유지). 두 파일은 `AUTO_INCREMENT`+`MERGE`(H2) vs `BIGSERIAL`+`ON CONFLICT`(Postgres) 문법 차이만 있고 나머지는 동일.
- `org.postgresql:postgresql` 드라이버를 `runtimeOnly`로 추가, 기존 H2 드라이버는 로컬/테스트용으로 그대로 유지.

## 근거

- **Neon 대신 Supabase를 쓴 이유는 순전히 사용자가 먼저 만들었기 때문**이다. 대안 비교 중 Neon(카드 불필요·만료 없음·유휴 시 컴퓨트만 정지하고 데이터는 보존)을 권했으나, 사용자가 대화 중 이미 Supabase 프로젝트를 만들어와 그대로 채택했다. Supabase도 동일하게 카드 불필요·표준 Postgres·만료 없는 무료 티어라 기술적으로 문제없다.
- **Render 자체 무료 Postgres는 검토 후 기각** — 30일 후 자동 만료(14일 유예 후 삭제)라는 걸 확인했다. Render 안에서 다 해결하고 싶었지만, 이 프로젝트가 "매일 쌓이는 이력"이 핵심인 이상 30일마다 재생성해야 하는 DB는 근본 해결책이 아니다.
- **Turso(libSQL)는 후보에서 제외** — [[0008-deployment-render-github-actions]] 작성 시점엔 재검토 후보로 적어뒀지만, 실제로 붙여보려니 JDBC/Hibernate 생태계 성숙도가 표준 Postgres 드라이버에 비해 훨씬 불확실해 리스크가 더 크다고 판단. Spring Data JPA + Postgres 조합은 업계 표준 경로라 그대로 감.
- **Spring profile 분기 vs 전면 전환** — 로컬 개발 경험을 그대로 유지하고 싶어서(H2 파일 DB가 로컬에선 문제 없었음) 프로덕션만 분기했다. 전면 Postgres 전환도 가능했지만, 로컬 개발자가 Supabase 계정에 의존하게 만드는 건 이 시점에 불필요한 결합.

## 결과·트레이드오프

**얻는 것** — 이력이 더 이상 슬립 사이클마다 사라지지 않는다. Supabase 무료 티어(0.5GB, 만료 없음)로 이 프로젝트의 실제 데이터 규모(하루 1건 브리핑 + 소량 감사로그)를 감당하기엔 충분하고도 남는다.

**감수하는 것**
- Render(컴퓨트)와 Supabase(DB)가 물리적으로 분리된 네트워크라 매 요청마다 외부 DB 왕복이 생긴다 — 이 프로젝트는 트래픽이 극히 적어(1인용, 하루 1회 배치) 성능에 실질적 영향은 없을 것으로 판단, 별도 벤치마크는 하지 않음.
- Supabase도 결국 제3자 무료 서비스라 정책이 바뀔 가능성은 있다 — Neon이 애초 1순위 후보였으니, Supabase가 문제가 되면 그쪽으로 갈아타는 게 다음 선택지.
- 기존에 쌓여있던 브리핑 1건·감사로그는 복구 불가능하게 유실됐다(H2 파일이라 백업이 없었음) — 데이터 자체의 가치보다 "파이프라인이 실제로 작동한다"는 검증 목적이었어서 재생성으로 충분하다고 판단, 별도 복구 시도는 안 함.

## 재검토 트리거

- Supabase 무료 티어 정책이 바뀌면(카드 요구, 저장공간 축소 등) → Neon으로 전환.
- 트래픽이 늘어 외부 DB 왕복 지연이 체감되면 → Render 유료 플랜의 영구 디스크나 같은 리전의 매니지드 DB 재검토.
