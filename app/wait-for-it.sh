#!/bin/bash
# wait-for-it.sh

# Usage: ./wait-for-it.sh host:port [--command args]
# Example: ./wait-for-it.sh db:5432 -- echo "PostgreSQL is ready"

TIMEOUT=15
STRICT=0
HOST=""
PORT=""
CMD=""
ERR=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    *:* ) HOST=${1%:*} PORT=${1#*:}; shift 1;;
    --timeout) TIMEOUT="$2"; shift 2;;
    --strict) STRICT=1; shift 1;;
    --) CMD="$@"; break;;
    *) echo "Unknown argument: $1"; exit 1;;
  esac
done

for ((i=1;i<=TIMEOUT;i++)); do
  nc -z -v -w5 $HOST $PORT
  RESULT=$?
  if [ $RESULT -eq 0 ]; then
    echo "$HOST:$PORT is available!"
    if [ -n "$CMD" ]; then
      exec $CMD
    fi
    exit 0
  fi
  sleep 1
done

echo "$HOST:$PORT is not available after $TIMEOUT seconds."
exit 1
