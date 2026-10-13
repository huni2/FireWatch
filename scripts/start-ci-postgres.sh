#!/usr/bin/env bash
# Dedicated ephemeral CI database only. No URLs, credentials or image overrides accepted.
set -euo pipefail
[[ "${GITHUB_ACTIONS:-}" == true && "${RUNNER_OS:-}" == Linux ]] || {
  echo 'This database startup helper runs only on a Linux GitHub Actions runner.' >&2
  exit 1
}
images=(docker.io/library/postgres:17 public.ecr.aws/docker/library/postgres:17)
selected=''
for image in "${images[@]}"; do
  echo "Pulling CI PostgreSQL from $image"
  if timeout 120 docker pull "$image"; then
    selected="$image"
    break
  fi
  echo "::warning::Could not pull $image; trying the next official image source."
done
[[ -n "$selected" ]] || { echo 'All CI PostgreSQL image sources failed; stopping before tests.' >&2; exit 1; }

container=$(docker run --detach --rm --name firewatch-ci-postgres \
  --publish 127.0.0.1:5432:5432 \
  --env POSTGRES_DB=firewatch_test --env POSTGRES_USER=firewatch_test --env POSTGRES_PASSWORD=firewatch_test \
  --health-cmd 'pg_isready -U firewatch_test -d firewatch_test' \
  --health-interval 5s --health-timeout 5s --health-retries 10 "$selected")
[[ "$container" =~ ^[a-f0-9]{12,64}$ ]] || { echo 'Invalid CI container ID' >&2; exit 1; }
for ((attempt=0; attempt<12; attempt++)); do
  status=$(docker inspect --format '{{.State.Health.Status}}' "$container")
  if [[ "$status" == healthy ]]; then
    echo "container_id=$container" >> "${GITHUB_OUTPUT:?GitHub step output required}"
    echo "CI PostgreSQL is ready ($selected)."
    exit 0
  fi
  [[ "$status" != unhealthy ]] || break
  sleep 5
done
docker logs "$container" >&2
echo 'CI PostgreSQL did not become healthy within the startup limit.' >&2
exit 1
