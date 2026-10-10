-- 감사 인증 헤더 의심 기록을 원문 없이 작업명과 상태별 건수로 집계한다.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5s';

SELECT action_name, status, COUNT(*) AS audit_rows,
       COUNT(*) FILTER (WHERE request_payload ~* 'Bearer[[:space:]]+[A-Za-z0-9_-]{40,64}') AS bearer_pattern_rows
FROM public.audit_logs
WHERE action_name = 'OperatorAccess.requireOperator'
GROUP BY action_name, status
ORDER BY action_name, status;

COMMIT;
