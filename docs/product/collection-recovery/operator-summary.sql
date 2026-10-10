-- 최근 수집 작업·장애·저장 상태를 개인정보 없이 읽기 전용 JSON 한 셀로 집계한다.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '5s';

WITH jobs AS (
    SELECT split_part(id, ':', 1) AS category, status, COUNT(*) AS job_count,
           MAX(last_attempt_at) AS last_attempt_at, MAX(last_success_at) AS last_success_at,
           MAX(next_attempt_at) AS latest_next_attempt_at,
           SUM(collected_count) AS last_attempt_collected_rows
    FROM public.collection_jobs
    WHERE last_attempt_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '2 days'
    GROUP BY split_part(id, ':', 1), status
), errors AS (
    SELECT split_part(id, ':', 1) AS category,
           CASE WHEN error_code ~ '^[A-Za-z0-9_:,.-]{1,80}$' THEN error_code ELSE 'REDACTED' END AS error_code,
           COUNT(*) AS job_count, MAX(last_attempt_at) AS last_attempt_at
    FROM public.collection_jobs
    WHERE last_attempt_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '2 days'
      AND status IN ('FAILED','PARTIAL','PAUSED')
    GROUP BY split_part(id, ':', 1),
             CASE WHEN error_code ~ '^[A-Za-z0-9_:,.-]{1,80}$' THEN error_code ELSE 'REDACTED' END
), circuits AS (
    SELECT split_part(id, ':', 1) AS category, split_part(id, ':', 2) AS kst_date,
           failure_count, next_attempt_at,
           lease_until > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AS lease_active
    FROM public.collection_circuits
    WHERE split_part(id, ':', 2) >= ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::date - 1)::text
), alerts AS (
    SELECT category, COUNT(*) AS unresolved_count,
           COUNT(*) FILTER (WHERE paused) AS paused_count,
           COUNT(*) FILTER (WHERE notified_at IS NOT NULL) AS provider_accepted_count,
           MAX(push_attempts) AS max_push_attempts, MAX(updated_at) AS latest_updated_at
    FROM public.collection_alerts WHERE resolved_at IS NULL GROUP BY category
), observations AS (
    SELECT CASE WHEN asset LIKE 'STOCK:%' THEN 'STOCK' ELSE asset END AS asset_group,
           COUNT(*) AS row_count, MAX(collected_at) AS latest_collected_at,
           MAX(source_as_of) AS latest_source_as_of
    FROM public.market_observations
    WHERE collected_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '2 days'
    GROUP BY CASE WHEN asset LIKE 'STOCK:%' THEN 'STOCK' ELSE asset END
), stored AS (
    SELECT (SELECT COUNT(*) FROM public.news_feed) AS news_rows,
           (SELECT MAX(collected_at) FROM public.news_feed) AS latest_news_collected_at,
           (SELECT MAX(completed_at) FROM public.collection_runs WHERE id='news') AS latest_news_run_at,
           (SELECT COUNT(*) FROM public.market_quotes) AS quote_rows,
           (SELECT MAX(collected_at) FROM public.market_quotes) AS latest_quote_collected_at
), audit AS (
    SELECT action_name, status, COUNT(*) AS row_count, MAX(created_at) AS latest_at
    FROM public.audit_logs
    WHERE created_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '2 days'
      AND action_name IN ('PushService.testOperatorNotification', 'CollectionJobRunner.run',
                          'MarketCollectionService.collectIfDue', 'collection.operatorPush')
    GROUP BY action_name, status
), operator AS (
    SELECT COUNT(*) AS registered_rows,
           COUNT(s.id) AS existing_settings_rows,
           COUNT(*) FILTER (WHERE NULLIF(trim(s.fcm_tokens), '') IS NOT NULL) AS fcm_configured_rows,
           COUNT(*) FILTER (WHERE NULLIF(trim(s.web_push_subscriptions), '') IS NOT NULL
                              AND trim(s.web_push_subscriptions) <> '[]') AS web_push_configured_rows
    FROM public.collection_operator o LEFT JOIN public.user_settings s ON s.id=o.settings_id
)
SELECT jsonb_pretty(jsonb_build_object(
    'checked_at_utc', CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
    'jobs', (SELECT COALESCE(jsonb_agg(to_jsonb(jobs) ORDER BY category,status),'[]'::jsonb) FROM jobs),
    'errors', (SELECT COALESCE(jsonb_agg(to_jsonb(errors) ORDER BY category,error_code),'[]'::jsonb) FROM errors),
    'circuits', (SELECT COALESCE(jsonb_agg(to_jsonb(circuits) ORDER BY category,kst_date),'[]'::jsonb) FROM circuits),
    'unresolved_alerts', (SELECT COALESCE(jsonb_agg(to_jsonb(alerts) ORDER BY category),'[]'::jsonb) FROM alerts),
    'recent_observations', (SELECT COALESCE(jsonb_agg(to_jsonb(observations) ORDER BY asset_group),'[]'::jsonb) FROM observations),
    'stored', (SELECT to_jsonb(stored) FROM stored),
    'operator_registration', (SELECT to_jsonb(operator) FROM operator),
    'audit', (SELECT COALESCE(jsonb_agg(to_jsonb(audit) ORDER BY action_name,status),'[]'::jsonb) FROM audit)
)) AS collection_operating_summary;

COMMIT;
