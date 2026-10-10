#!/usr/bin/env bash
# 백업 결과의 제한된 오류 코드만 기존 운영자 인증 API에 보고한다.
set -euo pipefail
umask 077
[[ "${BACKEND_URL:-}" == 'https://firewatch-backend-q3cv.onrender.com' ]] || { echo 'Backup report configuration missing.' >&2; exit 1; }
[[ -n "${OPERATOR_KEY:-}" && "$OPERATOR_KEY" != *$'\n'* && "$OPERATOR_KEY" != *$'\r'* ]] || exit 1
[[ "${BACKUP_RUN_ID:-}" =~ ^[0-9]{1,20}(-[0-9]{1,3})?$ ]] || exit 1
case "${FAILURE_CODE:-}" in
  '') payload=$(printf '{"runId":"%s"}' "$BACKUP_RUN_ID");;
  CONFIG_MISSING|TOOL_FAILED|DUMP_FAILED|ARCHIVE_INVALID|ENCRYPT_FAILED|SIZE_LIMIT|UPLOAD_FAILED|JOB_FAILED)
    payload=$(printf '{"runId":"%s","failureCode":"%s"}' "$BACKUP_RUN_ID" "$FAILURE_CODE");;
  *) exit 1;;
esac
# No retries: the workflow records this failure even if Render cannot accept the report.
if ! curl --fail --silent --connect-timeout 15 --max-time 280 --retry 0 \
  -H "X-API-Key: $OPERATOR_KEY" -H 'Content-Type: application/json' \
  --data "$payload" "$BACKEND_URL/api/operations/backup/report" >/dev/null 2>/dev/null; then
  echo 'Backup report delivery failed. Check the private workflow run.' >&2
  exit 1
fi
echo 'Backup report recorded.'
