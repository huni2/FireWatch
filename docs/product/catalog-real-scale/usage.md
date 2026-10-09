# 실제 검색 비용 확인

`CatalogRealScaleIntegrationTest`는 현재 공식 회사·큐레이션의 코드 집합과 DB의 코드 집합을 대조한 뒤10개 검색 조건을 측정한다. 이번 자료는2669상품이다. 실제 서비스에서 사용하는 COUNT와 전체 메타데이터·시세 JOIN·정렬·페이지 SQL을 공유한다.

로컬 H2 검사는 다음 명령으로 실행한다.

```powershell
cd backend
.\gradlew.bat test --tests '*CatalogRealScaleIntegrationTest'
```

PostgreSQL 검사는 GitHub CI의 전용 localhost DB에서 실행한다. TestDatabase는 외부 URL을 거절한다. pg_trgm 후보 두 개는 이 테스트 DB에서만 생성·삭제하며 운영 DB 설정이나 스키마에 추가하지 않는다.

CI의 `catalog-search-measurement` artifact에는 `catalog-search-h2.json`, `catalog-search-postgresql.json` 보고서가 담긴다. 실제 상품 수·시세 행수·7회 서비스 중앙값/최댓값, PostgreSQL COUNT/목록 단일 실행 시간과 전체 계획, 카탈로그·후보 인덱스 공간을 확인할 수 있다.

- `serviceMedianMs`는 COUNT·목록 조회와 JSON 파싱을 포함한 서비스 호출7회 중앙값이다. HTTP·TLS·Render 기동·Supabase 네트워크·동시 접속을 포함하지 않는다.
- `countSqlMs`, `rowsSqlMs`는 별도로 실행한 EXPLAIN ANALYZE의 단일 실행 시간이다. 서비스 중앙값과 합산하지 않는다.
- 후보 전후 검색 결과와 카탈로그·시세 행이 같음을 검사한다. 후보가 있는 단계에서도 옵티마이저가 선택한 인덱스를 전체 계획에서 확인한다. 인덱스를 강제로 사용하지 않는다.
- 비교 순서는 기존→후보로 고정돼 있고 캐시/JVM 준비 차이가 있다. CI 표본의 개선율을 운영 개선율로 표현하지 않는다. 시세가 빈 테스트 DB의 JOIN 결과를 운영 시세 전체 비용으로 확대하지 않는다.

성능에 고정된 밀리초 통과 기준을 두지 않는다. CI 머신 변동으로 기능 검사를 불안정하게 만드는 대신 측정값과 계획을 보관하고 판단 근거를 남긴다. 자료 규모가 늘거나 운영 지연이 발생하면 동일 검사를 다시 실행하고 운영 관측과 대조한다.
