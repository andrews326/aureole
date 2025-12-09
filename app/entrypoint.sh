#!/usr/bin/env bash
set -euo pipefail

# Config
WAIT_SCRIPT="/wait-for-it.sh"   # adjust path if different inside image
DB_HOST="db"
DB_PORT=5432
TIMEOUT=60

echo "Entry point: waiting for PostgreSQL (${DB_HOST}:${DB_PORT})..."

# If wait-for-it exists, use it; otherwise use internal loop
if [[ -x "${WAIT_SCRIPT}" ]]; then
  # Use strict mode to fail startup if DB not ready
  "${WAIT_SCRIPT}" "${DB_HOST}:${DB_PORT}" -t "${TIMEOUT}" --strict -- echo "PostgreSQL is up"
else
  echo "wait-for-it.sh not found or not executable; falling back to built-in check"
  i=0
  while ! bash -c "</dev/tcp/${DB_HOST}/${DB_PORT}" >/dev/null 2>&1; do
    i=$((i+1))
    if [ "$i" -ge "$TIMEOUT" ]; then
      echo "ERROR: PostgreSQL did not become ready after ${TIMEOUT}s"
      exit 1
    fi
    echo "Postgres not ready yet (attempt $i). Sleeping 1s..."
    sleep 1
  done
  echo "PostgreSQL is accepting connections."
fi

echo "Running Alembic migrations..."
alembic upgrade head

echo "Starting FastAPI (uvicorn)..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
