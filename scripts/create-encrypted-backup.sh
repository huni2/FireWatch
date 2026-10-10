#!/usr/bin/env bash
# DB 백업의 읽기 가능성과 공개키 암호화를 확인하고 암호화 파일만 보관 대상으로 남긴다.
set -euo pipefail
umask 077
stage=CONFIG_MISSING
work=''
cleanup() {
  result=$?
  if [[ -n "$work" ]]; then rm -f -- "$work/database.dump" "$work/errors"; rmdir -- "$work"; fi
  if (( result != 0 )); then
    printf 'Backup failed: %s\n' "$stage" >&2
    [[ -z "${GITHUB_OUTPUT:-}" ]] || printf 'failure_code=%s\n' "$stage" >> "$GITHUB_OUTPUT"
  fi
}
trap cleanup EXIT
for variable in PGHOST PGPORT PGUSER PGDATABASE PGPASSWORD AGE_RECIPIENT OUTPUT_DIR; do
  [[ -n "${!variable:-}" ]] || exit 1
done
[[ "$PGPORT" == 5432 && "$PGDATABASE" == postgres ]] || exit 1
[[ "$AGE_RECIPIENT" =~ ^age1[0-9a-z]{58}$ ]] || exit 1
[[ ! -e "$OUTPUT_DIR" ]] || exit 1
stage=TOOL_FAILED
for tool in pg_dump pg_restore age; do command -v "$tool" >/dev/null || exit 1; done
[[ "$(pg_dump --version)" =~ PostgreSQL\)\ 17\. ]] || exit 1
[[ "$(pg_restore --version)" =~ PostgreSQL\)\ 17\. ]] || exit 1
export PGSSLMODE=require PGCONNECT_TIMEOUT=15
work=$(mktemp -d)
stage=DUMP_FAILED
pg_dump -w --format=custom --schema=public --no-owner --no-privileges --lock-wait-timeout=30s --file="$work/database.dump" 2>"$work/errors" || exit 1
stage=ARCHIVE_INVALID
pg_restore --list "$work/database.dump" >/dev/null 2>"$work/errors" || exit 1
stage=ENCRYPT_FAILED
mkdir -- "$OUTPUT_DIR"
age -r "$AGE_RECIPIENT" -o "$OUTPUT_DIR/database.dump.age" "$work/database.dump" 2>"$work/errors" || { rm -f -- "$OUTPUT_DIR/database.dump.age"; rmdir -- "$OUTPUT_DIR"; exit 1; }
bytes=$(wc -c < "$OUTPUT_DIR/database.dump.age")
# Bound each artifact below 10MiB; actual free quota/budget is checked before activation.
if (( bytes < 1 || bytes > 10485760 )); then
  stage=SIZE_LIMIT
  rm -f -- "$OUTPUT_DIR/database.dump.age"; rmdir -- "$OUTPUT_DIR"; exit 1
fi
(cd "$OUTPUT_DIR" && sha256sum database.dump.age > checksum.sha256)
printf 'Encrypted backup ready (%s bytes).\n' "$bytes"
