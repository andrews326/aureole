#!/bin/bash

# Wait for PostgreSQL to be ready before running migrations
echo "Waiting for PostgreSQL to be ready..."
/wait-for-it.sh db:5432 --timeout=60 --strict -- echo "PostgreSQL is up"

# Run Alembic migrations
echo "Running Alembic migrations..."
alembic upgrade head

# Start FastAPI using Uvicorn
echo "Starting FastAPI..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
