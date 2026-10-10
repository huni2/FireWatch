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
# 복원본에서만 시험 등록을 만들고 세션·푸시 재사용 방지와 원본 보존을 검증한다.
docker exec -i "$container" psql -X -U firewatch_test -d "$restore_db" -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
BEGIN;
DO $$ BEGIN
  IF current_database() <> 'firewatch_restore_check' THEN
    RAISE EXCEPTION 'Only the dedicated restore database is allowed';
  END IF;
END $$;
INSERT INTO app_users(id, google_sub) VALUES (-2147483000, 'restore-safety-fixture');
INSERT INTO device_links(device_id, user_id) VALUES ('restore-safety-device', -2147483000);
INSERT INTO user_settings(id, user_id, interest_keywords, watched_stocks, fcm_tokens, web_push_subscriptions)
  VALUES (-2147483000, -2147483000, 'restore-preserved', '035720.KS', 'restore-fixture-token', '[{"endpoint":"https://example.invalid/push"}]');
INSERT INTO auth_sessions(token_hash, device_id, user_id, expires_at)
  VALUES (repeat('f', 64), 'restore-safety-device', -2147483000, CURRENT_TIMESTAMP + INTERVAL '1 day');
INSERT INTO collection_operator(id, settings_id) VALUES (-2147483000, -2147483000);
COMMIT;
SQL
# The fixture also exercises databases whose original backup had no registrations.
[[ "$(psql_ci -d "$restore_db" -Atc "SELECT count(*) FROM auth_sessions WHERE expires_at>CURRENT_TIMESTAMP")" -gt 0 ]] || exit 1
preserved_tables() {
  signatures "$restore_db" | sed '/^auth_sessions:/d; /^user_settings:/d; /^collection_operator:/d'
}
settings_signature() {
  psql_ci -d "$restore_db" -Atc "SELECT md5(coalesce(string_agg((to_jsonb(t)-'fcm_tokens'-'web_push_subscriptions')::text, chr(10) ORDER BY id), '')) FROM user_settings t"
}
preserved_before="$(preserved_tables)"
settings_before="$(settings_signature)"
docker exec -i "$container" psql -X -U firewatch_test -d "$restore_db" -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
BEGIN;
DO $$ BEGIN
  IF current_database() <> 'firewatch_restore_check' THEN
    RAISE EXCEPTION 'Only the dedicated restore database is allowed';
  END IF;
END $$;
DELETE FROM auth_sessions;
UPDATE user_settings SET fcm_tokens=NULL, web_push_subscriptions=NULL;
DELETE FROM collection_operator;
COMMIT;
SQL
[[ "$(psql_ci -d "$restore_db" -Atc "SELECT (SELECT count(*) FROM auth_sessions) + (SELECT count(*) FROM collection_operator) + (SELECT count(*) FROM user_settings WHERE nullif(btrim(fcm_tokens), '') IS NOT NULL OR nullif(btrim(web_push_subscriptions), '') IS NOT NULL)")" == 0 ]] || {
  echo 'Restored login or push registrations remain'; exit 1;
}
[[ "$preserved_before" == "$(preserved_tables)" && "$settings_before" == "$(settings_signature)" ]] || {
  echo 'Recovery invalidation changed unrelated records'; exit 1;
}
[[ "$original" == "$(signatures "$source_db")" ]] || { echo 'Source test database changed'; exit 1; }
echo 'Restored sessions and user/operator push registrations invalidated; other records and source database preserved.'
# The CI service container is ephemeral. Both databases are left intact for inspection.
