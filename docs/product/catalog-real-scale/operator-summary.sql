-- 카탈로그의 공식 기준값·실제 시세·용량을 개인정보 없이 읽기 전용으로 집계한다.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '5s';

SELECT COUNT(*) AS catalog_rows,
       COUNT(*) FILTER (WHERE directory_baseline_json IS NOT NULL) AS official_baseline_rows,
       COUNT(*) FILTER (WHERE name_initials = '') AS missing_initial_rows
FROM public.instrument_catalog;

SELECT c.asset_class, c.region, COUNT(*) AS catalog_rows,
       COUNT(q.symbol) AS priced_rows,
       MIN(q.as_of) AS oldest_quote_at, MAX(q.as_of) AS newest_quote_at,
       MAX(q.collected_at) AS last_quote_collection_at
FROM public.instrument_catalog c
LEFT JOIN public.market_quotes q ON c.symbol = q.symbol
GROUP BY c.asset_class, c.region ORDER BY c.asset_class, c.region;

SELECT COUNT(*) AS quote_rows,
       COUNT(*) FILTER (WHERE c.symbol IS NULL) AS quotes_outside_catalog,
       COUNT(*) FILTER (WHERE q.price <= 0) AS nonpositive_quote_rows
FROM public.market_quotes q LEFT JOIN public.instrument_catalog c ON c.symbol = q.symbol;

SELECT pg_database_size(current_database()) AS database_bytes,
       pg_table_size('public.instrument_catalog'::regclass) AS catalog_table_bytes,
       pg_indexes_size('public.instrument_catalog'::regclass) AS catalog_index_bytes,
       pg_total_relation_size('public.market_quotes'::regclass) AS quotes_total_bytes;

SELECT indexrelname, pg_relation_size(indexrelid) AS index_bytes
FROM pg_stat_user_indexes WHERE schemaname = 'public' AND relname = 'instrument_catalog'
ORDER BY indexrelname;

COMMIT;
