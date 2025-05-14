#!/bin/sh
set -e

echo "Starting docker entrypoint script..."

# Make sure prisma directory exists
mkdir -p /app/prisma

# Ensure we have a valid DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set, using default"
  export DATABASE_URL="file:/app/prisma/dev.db"
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Push schema to database (with retry mechanism)
echo "Pushing schema to database..."
max_retries=3
retry_count=0

while [ $retry_count -lt $max_retries ]; do
  if npx prisma db push --accept-data-loss; then
    echo "Prisma schema push successful"
    break
  else
    retry_count=$((retry_count+1))
    echo "Prisma schema push failed, retrying ($retry_count/$max_retries)..."
    sleep 2
  fi
done

if [ $retry_count -eq $max_retries ]; then
  echo "Failed to push Prisma schema after $max_retries attempts"
  exit 1
fi

# 簡易的なデータインポートチェック
if [ -d "/app/nakano_src" ] && [ -f "/app/scripts/import-data.ts" ]; then
  echo "Checking if data import is needed..."
  # データが存在するかどうかをシンプルなクエリで確認
  # SQLiteのコマンドラインでチェック
  if [ -f "/app/prisma/dev.db" ]; then
    DATA_COUNT=$(sqlite3 /app/prisma/dev.db "SELECT count(*) FROM CovidData LIMIT 1;" 2>/dev/null || echo "0")
    
    if [ "$DATA_COUNT" = "0" ] || [ -z "$DATA_COUNT" ]; then
      echo "Database is empty, importing data..."
      npm run import-data
    else
      echo "Data already exists, skipping import"
    fi
  else
    echo "Database file does not exist yet, will be created during app startup"
  fi
else
  echo "Warning: nakano_src directory or import script not found, skipping data import"
fi

# Start the main application
echo "Starting application..."
exec npm run dev 