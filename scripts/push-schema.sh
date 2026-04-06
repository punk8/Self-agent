#!/bin/bash
# Push Prisma schema to Turso cloud database
# Usage: DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." ./scripts/push-schema.sh

set -e

if [ -z "$DATABASE_URL" ] || [ -z "$DATABASE_AUTH_TOKEN" ]; then
  echo "Error: DATABASE_URL and DATABASE_AUTH_TOKEN must be set"
  echo 'Usage: DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." ./scripts/push-schema.sh'
  exit 1
fi

node scripts/push-to-turso.mjs
