#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required to run Alembic migrations." >&2
  exit 1
fi

exec alembic upgrade head
