# 맥락

- 기본 라이트·오렌지와 기존 사용자 기록을 유지한다.
- 기존 CSS는 Select 내부 selector만 44px로 늘리며 Segmented는 라벨만 40px로 늘린다. 실제 외곽 높이와 팝업 위치를 확인한다.
- 공개 서버 capabilities200, optionalAverageCost=true, MARKET_VALUE, portfolio-rules-v3 확인. 이전 첫 등록 웹 개편과 함께 배포할 수 있다.
- Select 외곽32px/내부44px/옆 Segmented44px였으며 실제12px 수직 차이를 확인했다. 공통 controlHeight/SM44, LG48로 외곽·내부·팝업 기준을 일치시켰다.
- 게임 폼 label 규칙이 Ant Design 매수/매도 Segmented 내부 label까지 적용되어 여백과 grid를 주입했다. 해당 항목은 제외하고 노트북 주문 필드 여백을6px로 조정했다. 1280×720 및1366×768에서 수량·다음 턴 노출과 고정 주문창, 거래·복기를 검증했다.
- 컨트롤4폭과 다크, 등록5조건, 뉴스/종목/시장4폭과 다크 검증 성공. 검색/필터 초기화·팝업 폭/간격 검증은 전부 fixture이며 공개 데이터 쓰기는 없다. lint 기존 설정 관련 경고2개만 남아 있다.
