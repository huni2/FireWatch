---
source: "2026-08-19 bkit PDCA Do 단계(/pdca do firewatch --scope module-3,module-4) SchedulerJob 구현 중 판단 — [[log]] 2026-08-19"
verified: 2026-08-19
---

# 0006 — FALLBACK은 "Gemini 실패" 전용이고, 금융 API 단독 실패는 NORMAL+필드 누락으로 처리한다

## 상태
채택

## 맥락

원본 명세서 5.1절은 FALLBACK을 "Gemini API 장애로 Yahoo/수출입은행 기본 지표로 대체 발송"이라고만 정의한다. 즉 **Gemini가 실패했을 때 금융 데이터로 때우는 경우만** FALLBACK이다. 그런데 module-3(BE-4)을 구현하면서 "금융 API만 실패하고 Gemini는 성공하는 경우"는 어떻게 다룰지가 스펙에 없다는 걸 발견했다 — 상태값은 SUCCESS/WARNING/FALLBACK/FAILURE 4개뿐이라 새 상태를 만들 수도 없다.

## 결정

- **Gemini 실패** → `SchedulerJob`이 `AuditContext.markFallback(...)`을 호출 → SCHEDULER 이벤트가 FALLBACK으로 기록되고, `Briefing.dataSourceStatus = FALLBACK`. 브리핑 텍스트는 고정 안내 문구로 대체하고 금융 필드만 채운다.
- **금융 API만 실패** → 마킹하지 않는다. `Briefing.dataSourceStatus = NORMAL`을 유지하되 금/은/환율 필드는 `null`로 저장한다. 실패 자체는 별도의 `FINANCIAL_API`/`FAILURE` 감사로그 행으로 이미 남는다.
- **둘 다 실패** → `SchedulerJob`이 예외를 던진다 → SCHEDULER 이벤트가 FAILURE로 기록되고, 아무 `Briefing`도 저장되지 않는다.

## 근거

- 명세서 문구를 그대로 좁게 해석했다 — "Gemini 장애 → 대체"만 FALLBACK이라고 쓰여 있지 "아무 API나 실패하면 FALLBACK"이라고 쓰여 있지 않다. 새 상태를 만드는 대신 기존 4개 상태의 의미를 넓히지 않는 쪽을 택했다.
- 금융 API 단독 실패를 SCHEDULER 레벨의 FALLBACK/FAILURE로 올리면, "브리핑이 저장됐다"는 사실과 "그 안의 특정 필드가 비어있다"는 사실이 감사로그 조회 화면에서 뭉뚱그려진다. `FINANCIAL_API` 이벤트가 이미 그 실패를 정확히 담고 있으므로, `briefings` 테이블의 null 필드 자체가 웹 대시보드에서 "이 지표만 없음"으로 정직하게 드러나는 게 낫다고 판단했다.
- Design §2.2가 "저장·조회는 서버" 원칙을 이미 세워뒀고, 웹은 받은 걸 그대로 그리기만 하면 되므로 null 필드 표시는 WEB-2(대시보드) 쪽에서 자연스럽게 처리 가능하다(빈 값은 "—"로 표시하는 정도).

## 결과·트레이드오프

**얻는 것** — 4개 상태의 의미가 명세서와 정확히 일치한 채 유지된다. 감사로그를 보는 사람이 "오늘 브리핑이 왜 이런 모양인지"를 이벤트별로 정밀하게 추적할 수 있다.

**감수하는 것** — `Briefing.dataSourceStatus`만 보고는 "금/은/환율이 비어 있을 수 있다"는 걸 알 수 없다(NORMAL인데 null 필드가 있을 수 있음). 대시보드가 각 필드의 null 여부를 개별적으로 처리해야 한다 — WEB-2 완료 기준에 반영 필요.

## 재검토 트리거

- 사용자가 "지표 하나만 빠져도 그걸 명확히 알고 싶다"고 요구하면 → `dataSourceStatus`를 열거형에서 비트마스크나 별도 필드(`missing_fields`)로 확장 검토.
