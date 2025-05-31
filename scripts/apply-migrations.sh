#!/bin/bash

# Apply Supabase migrations script
# This script applies all pending migrations to the Supabase database

# Exit on any error
set -e

# Set environment variables from arguments
SUPABASE_URL="https://eaclljwvsicezmkjnlbm.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhY2xsand2c2ljZXpta2pubGJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDAyOTc3MiwiZXhwIjoyMDU5NjA1NzcyfQ.qAwl1_vgAK8qMv44dOWPoZ6u_w5PqwGEdRmOgXeKJbY"

# Extract project ID from SUPABASE_URL
PROJECT_ID=$(echo $SUPABASE_URL | sed -E 's/https:\/\/(.+)\.supabase\.co.*/\1/')

# Construct the database URL with direct connection
DB_HOST="db.${PROJECT_ID}.supabase.co"
DB_PORT=5432
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="${SUPABASE_SERVICE_ROLE_KEY}"

echo "Applying migrations to database: ${PROJECT_ID}"

# Apply migrations using psql with SSL mode and connection timeout
for migration in supabase/migrations/*.sql; do
  echo "Applying migration: $migration"
  PGSSLMODE=verify-full \
  PGSSLCERT=/opt/homebrew/etc/openssl@3/cert.pem \
  PGCONNECT_TIMEOUT=10 \
  psql "host=${DB_HOST} port=${DB_PORT} dbname=${DB_NAME} user=${DB_USER} password=${DB_PASSWORD}" \
  -f "$migration"
done

echo "✅ All migrations applied successfully" 