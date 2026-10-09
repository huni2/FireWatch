# 구현 근거

BE-40 배포 확인 후 실제 카탈로그는2669상품이며 CatalogController의 페이지당 한도는50이다. 웹 CatalogExplorer는 page를 보내지 않고 hasMore일 때 검색어를 더 입력하라는 안내만 표시했다. shared/catalog.ts의 query 생성기에 선택형 page를 추가한다. 모바일 ETF 전용 목록의 기존 호출은 유지한다.

useApi는 조회 실패 때 이전 data를 남긴다. 응답에 요청 query key를 함께 저장하고 현재 key와 일치할 때만 결과를 렌더링한다. 이전 값으로 새 페이지의 범위나 조건을 표시하지 않는다. 전체 시장 분류·정기 갱신은 BE-22에 유지한다.
