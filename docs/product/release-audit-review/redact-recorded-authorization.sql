-- 확인된 감사 인증 원문과 일치 유효 세션만 정리하고 기본 실행은 롤백한다.
-- 전체 파일을 한 번 실행한다. 결과는 트랜잭션 안의 미리보기이며 아직 적용되지 않는다.
-- 건수/시각이 달라졌다면 중단한다. 임의로 기대 건수를 바꾸지 말고 집계를 다시 확인한다.
-- 실제 적용을 선택한 경우에만 마지막 ROLLBACK을 COMMIT으로 바꿔 전체 파일을 실행한다.
-- 현재 해당 로그인 1개는 해제된다. 다른 세션/기기 연결/감사 행/시장/게임/투자 자료는 유지한다.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';

DO $cleanup$
DECLARE
    expected_audits CONSTANT integer := 51;
    expected_sessions CONSTANT integer := 1;
    reviewed_at CONSTANT timestamp := TIMESTAMP '2026-10-10 02:09:42.028318';
    audit_ids bigint[];
    session_hashes text[];
    revoked_hashes text[];
    changed integer;
BEGIN
    -- 대상 행을 먼저 잠그고 원문 대신 내부 ID/해시만 메모리에 보관한다.
    SELECT array_agg(a.id), array_agg(DISTINCT encode(sha256(convert_to(
        substring(a.request_payload FROM '(?i)Bearer[[:space:]]+([A-Za-z0-9_-]{40,64})'),
        'UTF8')), 'hex')))
    INTO audit_ids, session_hashes
    FROM (
        SELECT id, request_payload, created_at
        FROM public.audit_logs
        WHERE action_name = 'OperatorAccess.requireOperator'
          AND substring(request_payload FROM '(?i)Bearer[[:space:]]+([A-Za-z0-9_-]{40,64})') IS NOT NULL
        FOR UPDATE
    ) a;

    IF coalesce(cardinality(audit_ids), 0) <> expected_audits THEN
        RAISE EXCEPTION 'Audit target count changed; run authorization-impact-summary.sql again.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.audit_logs WHERE id = ANY(audit_ids) AND created_at > reviewed_at) THEN
        RAISE EXCEPTION 'New authorization record found after reviewed snapshot; stop and investigate.';
    END IF;

    SELECT array_agg(s.token_hash) INTO revoked_hashes
    FROM (
        SELECT token_hash FROM public.auth_sessions
        WHERE token_hash = ANY(session_hashes)
          AND expires_at > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
        FOR UPDATE
    ) s;
    IF coalesce(cardinality(revoked_hashes), 0) <> expected_sessions THEN
        RAISE EXCEPTION 'Active session target count changed; run authorization-impact-summary.sql again.';
    END IF;

    DELETE FROM public.auth_sessions WHERE token_hash = ANY(revoked_hashes);
    GET DIAGNOSTICS changed = ROW_COUNT;
    IF changed <> expected_sessions THEN
        RAISE EXCEPTION 'Session revocation count mismatch; transaction must be rolled back.';
    END IF;

    UPDATE public.audit_logs
    SET request_payload = '[[REDACTED], [REDACTED], [REDACTED]]'
    WHERE id = ANY(audit_ids);
    GET DIAGNOSTICS changed = ROW_COUNT;
    IF changed <> expected_audits THEN
        RAISE EXCEPTION 'Audit masking count mismatch; transaction must be rolled back.';
    END IF;
    RAISE NOTICE 'PREVIEW ONLY until COMMIT: masked_audit_rows=51, revoked_sessions=1';
END;
$cleanup$;

SELECT jsonb_pretty(jsonb_build_object(
    'mode', 'transaction_preview_check_final_ROLLBACK_or_COMMIT',
    'audit_rows_all_time', COUNT(*),
    'bearer_pattern_rows_all_time', COUNT(*) FILTER (WHERE
        substring(request_payload FROM '(?i)Bearer[[:space:]]+([A-Za-z0-9_-]{40,64})') IS NOT NULL),
    'fully_redacted_rows_all_time', COUNT(*) FILTER (WHERE
        request_payload = '[[REDACTED], [REDACTED], [REDACTED]]')
)) AS authorization_cleanup_preview
FROM public.audit_logs WHERE action_name = 'OperatorAccess.requireOperator';

-- 기본 실행은 영구 변경 없음. 실제 적용은 위 주석을 확인하고 이 한 줄을 COMMIT으로 변경한다.
ROLLBACK;
