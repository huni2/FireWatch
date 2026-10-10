-- 인증 원문 형태 기록의 시점과 현재 유효 세션 일치 건수를 원문 없이 읽는다.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5s';
SET LOCAL TIME ZONE 'UTC';

WITH recorded AS (
    SELECT created_at,
           request_payload = '[[REDACTED], [REDACTED], [REDACTED]]' AS fully_redacted,
           substring(request_payload FROM '(?i)Bearer[[:space:]]+([A-Za-z0-9_-]{40,64})') AS candidate_token
    FROM public.audit_logs
    WHERE action_name = 'OperatorAccess.requireOperator'
), token_hashes AS (
    SELECT DISTINCT encode(sha256(convert_to(candidate_token, 'UTF8')), 'hex') AS token_hash
    FROM recorded WHERE candidate_token IS NOT NULL
), matches AS (
    SELECT COUNT(*) AS unexpired_session_matches,
           COUNT(*) FILTER (WHERE EXISTS (
               SELECT 1 FROM public.device_links d
               WHERE d.device_id = s.device_id AND d.user_id = s.user_id
           )) AS active_linked_session_matches
    FROM public.auth_sessions s JOIN token_hashes h ON h.token_hash = s.token_hash
    WHERE s.expires_at > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
)
SELECT jsonb_pretty(jsonb_build_object(
    'checked_at_utc', CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
    'audit_rows_all_time', (SELECT COUNT(*) FROM recorded),
    'bearer_pattern_rows_all_time', (SELECT COUNT(*) FROM recorded WHERE candidate_token IS NOT NULL),
    'fully_redacted_rows_all_time', (SELECT COUNT(*) FROM recorded WHERE fully_redacted),
    'latest_bearer_at', (SELECT MAX(created_at) FROM recorded WHERE candidate_token IS NOT NULL),
    'latest_fully_redacted_at', (SELECT MAX(created_at) FROM recorded WHERE fully_redacted),
    'session_matches', (SELECT to_jsonb(matches) FROM matches)
)) AS authorization_impact_summary;

COMMIT;
