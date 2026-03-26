#!/bin/sh
set -eu

echo "Applying DB migrations from /migrations ..."
for file in /migrations/*.sql; do
  echo " -> $file"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done
echo "DB migrations applied successfully."
