#!/usr/bin/env bash
# CI-only drill. Never accepts a database URL or production credentials.
set -euo pipefail
container="${1:?Dedicated CI PostgreSQL container ID required}"
[[ "$container" =~ ^[a-f0-9]{12,64}$ ]] || { echo 'Invalid CI container ID'; exit 1; }
source_db=firewatch_test
restore_db=firewatch_restore_check
psql_ci() { docker exec "$container" psql -X -U firewatch_test -v ON_ERROR_STOP=1 "$@"; }
[[ "$(psql_ci -d postgres -Atc "SELECT count(*) FROM pg_database WHERE datname='$restore_db'")" == 0 ]] || {
  echo 'Restore target already exists; refusing to overwrite'; exit 1;
}
psql_ci -d postgres -c "CREATE DATABASE $restore_db" >/dev/null
# pg_dump includes CREATE SCHEMA public. Remove only the empty default schema in
# this just-created, fixed-name restore database; never use CASCADE or the source DB.
[[ "$(psql_ci -d "$restore_db" -Atc "SELECT count(*) FROM pg_tables WHERE schemaname='public'")" == 0 ]] || exit 1
psql_ci -d "$restore_db" -c 'DROP SCHEMA public' >/dev/null
# Stream the archive directly into a separate database. No dump artifact is published.
docker exec "$container" pg_dump -U firewatch_test -d "$source_db" -Fc -n public --no-owner --no-privileges |
  docker exec -i "$container" pg_restore -U firewatch_test -d "$restore_db" --exit-on-error --no-owner --no-privileges
signatures() {
  local database="$1"
  psql_ci -d "$database" -Atc "SELECT format('SELECT %L || chr(58) || count(*) || chr(58) || coalesce(md5(string_agg(row_to_json(t)::text, chr(10) ORDER BY row_to_json(t)::text)), chr(45)) FROM public.%I t;', tablename, tablename) FROM pg_tables WHERE schemaname='public' ORDER BY tablename" |
    docker exec -i "$container" psql -X -U firewatch_test -d "$database" -At -v ON_ERROR_STOP=1
  psql_ci -d "$database" -Atc "SELECT 'sequence:' || sequencename || ':' || coalesce(last_value::text, '-') FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename"
}
original="$(signatures "$source_db")"
restored="$(signatures "$restore_db")"
[[ -n "$original" && "$original" == "$restored" ]] || { echo 'Restored table signatures differ'; exit 1; }
echo 'PostgreSQL public schema archive restored; every table count, row signature and sequence value matches.'
# The CI service container is ephemeral. Both databases are left intact for inspection.
