#!/usr/bin/env bash
# wait-for-it.sh
# Usage: ./wait-for-it.sh host:port [-t|--timeout SECONDS] [--strict] [-- command args...]
# Example: ./wait-for-it.sh db:5432 -t 60 --strict -- echo "Postgres ready"

set -euo pipefail

TIMEOUT=15
STRICT=0
HOST=""
PORT=""
CMD=()

usage() {
  echo "Usage: $0 host:port [-t|--timeout seconds] [--strict] [-- command]" >&2
  exit 2
}

# parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    *:*) HOST="${1%:*}"; PORT="${1#*:}"; shift ;;
    -t|--timeout) TIMEOUT="$2"; shift 2 ;;
    --strict) STRICT=1; shift ;;
    --) shift; CMD=("$@"); break ;;
    -h|--help) usage ;;
    *) echo "Unknown argument: $1"; usage ;;
  esac
done

if [[ -z "$HOST" || -z "$PORT" ]]; then
  echo "host:port is required" >&2
  usage
fi

echo "Waiting for ${HOST}:${PORT} (timeout: ${TIMEOUT}s)..."

# helper to test TCP port: prefer nc, fallback to /dev/tcp
check_port() {
  if command -v nc >/dev/null 2>&1; then
    # -z: scan mode, -w: timeout for connect (GNU nc / busybox may differ)
    nc -z -w 5 "$HOST" "$PORT" >/dev/null 2>&1
    return $?
  else
    # bash TCP fallback
    (exec 3<>/dev/tcp/"$HOST"/"$PORT") >/dev/null 2>&1 && return 0 || return 1
  fi
}

i=0
while ! check_port; do
  i=$((i + 1))
  if [[ $i -ge $TIMEOUT ]]; then
    echo "${HOST}:${PORT} is not available after ${TIMEOUT} seconds."
    if [[ $STRICT -eq 1 ]]; then
      exit 1
    else
      exit 0
    fi
  fi
  sleep 1
done

echo "${HOST}:${PORT} is available!"
if [[ ${#CMD[@]} -gt 0 ]]; then
  exec "${CMD[@]}"
else
  exit 0
fi
