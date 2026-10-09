# 게임 그래프 API 계약

기존 웹/앱의 기본 응답은 바뀌지 않는다. 서버 반영 확인 후에만 클라이언트에서 compact를 선택한다.

## 턴 응답

`POST /api/game/start`, `GET /api/game/current`, `POST /api/game/trade`, `POST /api/game/next-turn`, `POST /api/game/end`에 `?compact=true`를 붙이면 각 assetHistories.points에는 현재·직전 최대2점만 있다. 첫 턴은1점이다. 기본/false는 기존 전체0..현재턴이다. 잘못된 Boolean은400이며 주문·턴 변경 전에 거절한다.

보유 평가/수익률·거래 원장·가격·픽·가격 변동 근거·게임 기업 메타데이터는 같다. 그래프를 원장에서 지우거나 가격 재현 규칙을 바꾸는 것이 아니다. compact 모드의 points를 전체 상세 그래프로 표시하면 안 된다.

## 선택한 자산의 전체 그래프

`GET /api/game/sessions/{sessionId}/assets/history?turnIndex=23&instrumentType=STOCK&symbol=005930.KS`

기존 게임 신원 계약의 `X-Device-Id`가 필요하다. 주식은 저장된 게임 규칙 목록의 symbol, 금/지수/환율은 instrumentType만 보내고 symbol은 생략한다. 이 계약은 계정 전체 게임 동기화나 새로운 신원 방식이 아니다.

응답은 `{sessionId, turnIndex, history: {instrumentType, symbol, name, points}}`다. 선택한 자산0..요청턴을 반환한다. 클라이언트는 sessionId/turnIndex/type/symbol을 캐시 키로 쓰고, 빠르게 선택이 바뀌거나 모달이 닫히면 이전 응답을 무시한다. 실패 시 가격/주문을 유지하고 그래프만 재시도한다.

다른 기기/없는 세션/그 규칙에 없는 자산/가상 시뮬레이션이 아닌 세션은404다. 미래·음수 턴, 미지원 저장 규칙, 잘못된 파라미터는400다. 종료된 게임과 이전 시험 시뮬레이션도 저장된 버전으로 조회한다. 다른 버전의 자산을 대체하지 않는다. 조회는 원장/상태를 바꾸지 않으며 외부 시세·뉴스·AI 요청을 하지 않는다. 상세 읽기는 쓰기 잠금/감사 DB 삽입 대신 기존 HTTP 요청 시간 측정을 사용한다.

## 검증 범위

전용 H2 HTTP 시험에서 게임 시작·금 매수·23회 턴 진행·종료, 전체/compact 비교, 상세와 기존 출력 일치·과거 첫 턴·타기기·미래·잘못된 자산·미지원 버전·이전 규칙 보존을 검사한다. 변동하는 가상 Briefing.createdAt만 비교에서 제외한다. 운영 HTTP 지연이나 실제 휴대폰 체감 측정은 아니다. 서버 기본 응답은 전체 그래프를 보존한다. 후속 WEB-40/APP-32에서 웹/앱은 compact를 선택하고 상세를 별도로 조회하도록 연결했다. 운영 시간/실기기 체감 검증은 별도다.
