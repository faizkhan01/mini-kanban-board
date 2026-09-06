#!/bin/sh
# Container entrypoint: apply migrations (retrying while the database comes up),
# then start the API. The server starts even if migrations never succeed so the
# platform healthcheck can report the failure instead of a bare crash loop.
set -u

attempts=0
max_attempts=8
until npx prisma migrate deploy; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge "$max_attempts" ]; then
    echo "prisma migrate deploy failed after ${attempts} attempts; starting server anyway"
    break
  fi
  echo "database not ready, retrying in 5s (attempt ${attempts}/${max_attempts})"
  sleep 5
done

exec node dist/main.js
