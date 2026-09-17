
set -a -e
source .env
set +a

echo "$DATABASE_URL" "$DB_PORT" "$DB_USER"

# psql "$DATABASE_URL" -f schema.sql
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f scripts/schema.sql

echo "Schema applied successfully."