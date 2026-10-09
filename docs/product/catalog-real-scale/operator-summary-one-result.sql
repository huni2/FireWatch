-- 카탈로그 기준값·시세·용량 집계를 개인정보 없이 JSON 한 셀로 반환한다.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '5s';

WITH catalog AS (
    SELECT COUNT(*) AS catalog_rows,
           COUNT(*) FILTER (WHERE directory_baseline_json IS NOT NULL) AS official_baseline_rows,
           COUNT(*) FILTER (WHERE name_initials = '') AS missing_initial_rows
    FROM public.instrument_catalog
), groups AS (
    SELECT c.asset_class, c.region, COUNT(*) AS catalog_rows,
           COUNT(q.symbol) AS priced_rows,
           MIN(q.as_of) AS oldest_quote_at, MAX(q.as_of) AS newest_quote_at,
           MAX(q.collected_at) AS last_quote_collection_at
    FROM public.instrument_catalog c
    LEFT JOIN public.market_quotes q ON c.symbol = q.symbol
    GROUP BY c.asset_class, c.region
), quotes AS (
    SELECT COUNT(*) AS quote_rows,
           COUNT(*) FILTER (WHERE c.symbol IS NULL) AS quotes_outside_catalog,
           COUNT(*) FILTER (WHERE q.price <= 0) AS nonpositive_quote_rows
    FROM public.market_quotes q
    LEFT JOIN public.instrument_catalog c ON c.symbol = q.symbol
), sizes AS (
    SELECT pg_database_size(current_database()) AS database_bytes,
           pg_table_size('public.instrument_catalog'::regclass) AS catalog_table_bytes,
           pg_indexes_size('public.instrument_catalog'::regclass) AS catalog_index_bytes,
           pg_total_relation_size('public.market_quotes'::regclass) AS quotes_total_bytes
), indexes AS (
    SELECT indexrelname, pg_relation_size(indexrelid) AS index_bytes
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public' AND relname = 'instrument_catalog'
)
SELECT jsonb_pretty(jsonb_build_object(
    'catalog', (SELECT to_jsonb(catalog) FROM catalog),
    'groups', (SELECT COALESCE(jsonb_agg(to_jsonb(groups) ORDER BY asset_class, region), '[]'::jsonb) FROM groups),
    'quotes', (SELECT to_jsonb(quotes) FROM quotes),
    'sizes', (SELECT to_jsonb(sizes) FROM sizes),
    'indexes', (SELECT COALESCE(jsonb_agg(to_jsonb(indexes) ORDER BY indexrelname), '[]'::jsonb) FROM indexes)
)) AS catalog_operating_summary;

COMMIT;
