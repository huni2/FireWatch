# FireWatch — Open Questions

미결정·미검증 질문. **실제로 답을 모르는 것만** 여기 둔다.
답이 나오면 아래 해소 표로 옮기고, 구현 과제가 되면 [[Next-Tasks]]로 승격한다.

## 미해결 (Open)

- [ ] **FCM 디바이스 등록 방식** — 계정이 없으므로 디바이스 토큰을 어떻게 서버에 안전하게 등록·매칭할 것인가(익명 디바이스 ID? 설치 시 1회 발급 토큰?). Phase 2(mobile) Plan/Design에서 결정.
- [ ] **프로덕션 DB 선택** — 배포처는 Oracle Cloud Free Tier로 확정됐지만([[Decisions/0003-mvp-scope-and-user-model]]), SQLite/H2/PostgreSQL 중 무엇을 쓸지는 아직 미정. Oracle Autonomous DB(무료 등급, Oracle 방언)를 쓸지, 감사로그 적재 빈도(1일 1회+설정 변경 시)를 감안해 SQLite로 충분할지 `/pdca design firewatch`에서 결정.
- [ ] **Gemini API 키·Firebase 서비스 계정 등 시크릿 관리 방식** — 배포처는 확정됐으니(Oracle Cloud), Oracle Cloud에서 환경변수를 주입하는 구체적 방법(Compute Instance 환경변수 vs Vault 유사물)을 Design 단계에서 정한다.
- [ ] **다크 모드 기본값** — [[design]] 5절. Web은 AntD가 즉시 지원하지만 기본을 라이트/다크 중 뭘로 할지, 토글을 둘지는 미정.
- [ ] **알림 발송 시각의 시간대 기준** — "오전 8시"가 한국시간(KST) 고정인지, Oracle Cloud 리전 선택에 따라 cron을 보정해야 하는지 명세서에 명시 없음. 리전 확정 시(BE-8) 함께.

## 해소·결정 기록

| 질문 | 결론 | 근거·정본 |
|---|---|---|
| 사용자 인증 모델(단일 vs 다중 사용자) | 계정 없는 1인용으로 확정 | [[Decisions/0003-mvp-scope-and-user-model]] |
| 백엔드 배포처(Oracle Cloud vs Render/Railway) | Oracle Cloud Always Free Tier로 확정 | [[Decisions/0003-mvp-scope-and-user-model]] |
| 이번 Plan의 MVP 범위(3서비스 동시 vs 단계적) | backend+web을 Phase 1로, mobile은 별도 Phase 2 Plan | [[Decisions/0003-mvp-scope-and-user-model]] |
