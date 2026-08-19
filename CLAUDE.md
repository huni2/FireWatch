# LLM-WIKI 연동 규칙 (repo 내장 모드)

이 프로젝트의 **정본(설계 결정·ADR·과제·로그)은 repo 안의 `llm-wiki/`다.** 코드와 함께 버전 관리되고 함께 커밋된다. **요구사항의 정본은 `docs/specs/`의 원본 명세서 3종**이며, llm-wiki는 그것을 해석·기록하는 층이다 — 자세한 건 `llm-wiki/Reference/README.md`.

- **세션 시작**: SessionStart 훅이 `llm-wiki/`의 최근 로그·열린 과제를 자동 주입한다. 상세가 필요하면 `llm-wiki/index.md`부터 진입한다(전체를 읽지 않는다).
- **세션 종료 전**: 의미 있는 작업을 했으면 `llm-wiki/log.md` 오늘 날짜 섹션(`## YYYY-MM-DD`)에 `- **[태그] 제목**: 내용` 형식으로 기록한다. **담당 태그는 `[BE]`(백엔드/Kotlin·Spring) · `[WEB]`(웹/React·AntD) · `[APP]`(모바일/React Native) · `[PROJ]`(위키·문서·설정 등 코드 외) 중 하나**이며, 여러 영역을 건드렸으면 태그를 두 개 붙이지 말고 항목을 쪼갠다. 코드 변경이 있는데 오늘 기록이 없으면 Stop 훅이 경고한다. 커밋은 코드와 함께 한다.
- **과제 관리**: 새 과제는 `llm-wiki/Next-Tasks.md`에 추가하고, 종료되면 종료 기록 표로 옮긴다. 상세 규칙은 아래 「Next-Tasks 작성 규칙」.
- **설계 결정**: ADR은 `llm-wiki/Decisions/NNNN-*.md`로 남긴다.

---

# Next-Tasks 작성 규칙 — 백엔드/웹/모바일 3분할

`llm-wiki/Next-Tasks.md`의 열린 과제는 **백엔드(BE)·웹(WEB)·모바일(APP) 세 섹션으로 나눠서** 쓴다. 한 목록에 섞으면 "Kotlin/Spring을 띄워야 하는 일"과 "브라우저만 열면 되는 일"과 "Expo를 띄워야 하는 일"이 구분되지 않아, 세션 시작 시 주입된 목록만 보고는 착수 비용을 가늠할 수 없다.

## 형식 계약 (훅이 파싱한다)

SessionStart 훅은 `### BE-` 또는 `### WEB-` 또는 `### APP-`로 시작하는 줄만 추출해 주입한다(`.claude/settings.json`).

- **계약은 제목 접두사뿐이다.** `### BE-N. 제목` / `### WEB-N. 제목` / `### APP-N. 제목` 형식을 지키면 된다. 섹션 제목은 파싱에 관여하지 않으므로 자유롭게 바꿔도 되고, 종료 기록으로 옮긴 과제는 접두사를 떼면 자동으로 주입에서 빠진다.
- 접두사가 없으면 세션에 주입되지 않는다.
- 번호는 **BE·WEB·APP 각각 독립**으로 매긴다. 과제 하나가 끝나도 남은 번호를 다시 매기지 않는다 — 로그·ADR의 참조가 깨진다.
- 추출 결과가 0건이면 빈 목록 대신 형식 오류를 알리는 문구가 주입된다.

## 어디에 넣을지 판단하는 기준

| 과제의 성격 | 섹션 |
|---|---|
| `backend/`의 스케줄러·API·감사로그·DB | BE |
| `web/`의 화면·상호작용·스타일 | WEB |
| `mobile/`의 화면·상호작용·FCM 수신 | APP |
| 여러 서비스를 가로지름 | **쪼갠다** — 각 섹션에 나눠 넣고 의존 관계를 `무엇`에 명시(예: `BE-5 완료 후 착수`) |

의존 순서는 **BE 섹션 안에서만** 번호로 표현한다. WEB·APP 과제는 서로 독립이어야 하며, 끼리 순서 의존이 생기면 과제를 잘못 쪼갠 신호다.

---

# bkit PDCA와 llm-wiki의 관계

이 프로젝트는 **bkit(.bkit/) PDCA 워크플로**와 **llm-wiki(코드 옆 위키)**를 함께 쓴다. 역할이 다르다:

- **bkit** — `docs/01-plan/`, `docs/02-design/` 등 표준 경로에 Plan/Design/Do/Check/Report 문서를 생성하고, `.bkit/state/`에 PDCA 진행 상태·체크포인트·감사 로그를 자동 축적한다. 기능 단위(feature)로 계획을 확정하고 승인 체크포인트를 거쳐 구현을 진행하는 **공식 절차**다. `/pdca status`, `/pdca plan {feature}`, `/pdca design {feature}` 등으로 조작한다.
- **llm-wiki** — 세션 간 컨텍스트 연속성(오늘 뭘 했는지, 다음에 뭘 할지, 왜 이렇게 결정했는지)을 담당하는 **가벼운 기억층**이다. bkit 문서보다 빨리 갱신되고, 사람이 읽기 쉬운 서술형이다.

**우선순위(SoR)**: ① 코드 자체 ② `llm-wiki/Decisions/`의 ADR·`llm-wiki/Context.md` ③ `docs/01-plan/`·`docs/02-design/`의 bkit 문서 — 코드와 다르면 코드가 맞다.

이 프로젝트는 bkit `enterprise` 스킬의 `init` 액션(Turborepo/FastAPI/K8s 템플릿)을 실행하지 않았다 — 근거는 [[llm-wiki/Decisions/0001-tech-stack-baseline]]. bkit은 PDCA 문서 워크플로만 쓰고, 실제 기술 스택은 원본 명세서(`docs/specs/`)를 따른다.

---

# 이 저장소의 검증 단계

세 서비스 모두 아직 스캐폴딩 전(2026-08-19)이라 공식 검증 명령이 없다. 서비스가 만들어지면 각 디렉터리에 검증 명령을 채우고 이 표를 갱신한다.

| 변경한 곳 | 1차로 돌릴 것 | 비고 |
|---|---|---|
| `backend/` | `./gradlew build` | BE-1 스캐폴딩 후 확정 |
| `web/` | `npm run lint` / `npm run build` | WEB-1 스캐폴딩 후 확정 |
| `mobile/` | `npm run lint` / `expo start` | APP-1 스캐폴딩 후 확정 |
