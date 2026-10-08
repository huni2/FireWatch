# 기업·ETF 시작 카탈로그

`shared/discovery.ts`의 공식 소개/IR 기반 기업26개와 `shared/etfs.json`의 공식 출처 기반 S&P500 ETF5개를 `node scripts/build-catalog-seed.cjs`로 서버 리소스에 생성한다. 2026-10-09에12기업을 추가했다. 기존 기업/ETF 확인일2026-10-07은 보존하며 새 기업만2026-10-09로 기록한다. 목록 확장 시 이름·별칭·분야·상장 국가·통화·공식 링크·실제 확인일을 검토한다. 자산 가격·보수·성과는 시드에 넣지 않는다.

서버 시작 시 `instrument_catalog`에 없는 항목과 이전 확인일의 항목만 저장한다. 최신 외부 수입 자료와 기존 카탈로그 행은 삭제하지 않는다. 전체 상장 종목 목록이나 추천 순위가 아니다.

생성기는 중복 symbol·상장국 불일치·이름/설명/분야/별칭 누락·잘못된 HTTPS 출처/실제 달력 날짜·시세/성과 혼입을 차단한다. 모든 검사가 통과한 뒤에만 리소스를 쓴다. `node --test scripts/build-catalog-seed.test.cjs`와 CI 생성 결과 비교로 원본/시드 차이를 검출한다. 추가 목록/분류 정책은 docs/product/catalog-expansion/plan.md, 공식 자료는 context-notes.md에 기록했다. 다각화 기업의 분야는 탐색 편의를 위한 편집 분류다.

공식 소개·주식 연결 자료의 예로 [카카오 IR](https://www.kakaocorp.com/ir/stockInformation?lang=ko), [SK하이닉스 상장정보](https://m.skhynix.com/ir/UI-FR-IR03/), [AMD IR](https://ir.amd.com/), [Alphabet IR](https://abc.xyz/)를 확인했다. 영문 사명/한국어 별칭은 직접 작성했다. Google 연결은 GOOGL Class A로 명시하며 전체 주식 종류를 제공한다고 표시하지 않는다.

`GET /api/catalog`은 이름·별칭·지수 키워드, assetClass·region·sectorId 필터와 최대 50건을 제공한다. 사용자 코드 입력은 필요 없으며 내부 symbol은 기존 시세·보유 저장 연결에 사용한다. 저장된 이름 검색은 외부 검색 호출 없이 처리하고, 카탈로그에 없으면 기존 제공처 검색을 사용한다. 실제 시세는 market_quotes의 기준 시각과 함께 읽으며 미수집을 0원으로 표시하지 않는다.

31개 시작 목록에서는 파라미터 바인딩·입력 길이·결과 상한으로 요청을 제한한다. 종류/상장국/분야 인덱스를 추가했다. 부분 일치 LIKE는 전체 검색 문자열을 스캔할 수 있으므로 전 시장 수입 전에 PostgreSQL 쿼리 계획·응답 시간·pg_trgm과 짧은 한국어 유사 검색을 검증해야 한다. OpenSearch는 도입하지 않았다. 상품의 최신 비용·계좌 매수 가능 여부·분배·환헤지는 추정하지 않고 공식 상품 설명을 확인하도록 안내한다.

## 페이지와 규모 검증 (2026-10-08)

카탈로그 API의 page는 0부터 시작하며 0~10000만 허용한다. 페이지당 최대50건이며 이름이 같은 경우에도 symbol로 안정적인 순서를 유지한다. hasMore는 현재 페이지의 끝을 기준으로 계산한다. 기존 page 없는 요청은 첫 페이지를 유지한다.

CatalogScaleIntegrationTest는 실제 데이터와 구분되는3,000개 합성 자료로 한 글자 한국어 검색·분야 필터·정확한 이름·페이지 중복/마지막/범위 밖·SQL/LIKE 입력을 검사한다. 테스트 트랜잭션은 종료 시 합성 자료를 롤백한다. PostgreSQL CI에서는 EXPLAIN ANALYZE/BUFFERS 결과도 남긴다. 이 검사는 전체 시장 자료 확보나 운영 성능 측정이 아니다.

부분 일치 검색의 전역 스캔은 여전히 가능하다. pg_trgm은 현재31개 시작 목록에 추가하지 않으며 OpenSearch도 보류한다. 전체 종목 수입 전 출처/사용 조건·별칭·갱신 주기와 실제 쿼리 계획을 검증한다. 전 시장 검색 구현 완료로 표시하지 않는다.
