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

# データインポートチェック（初回起動時のみ）
if [ ! -f "/app/.data-imported" ] && [ -d "/app/nakano_src" ] && [ -f "/app/scripts/import-data.ts" ]; then
  echo "First time setup: Importing data..."
  
  # メインデータのインポート
  echo "Importing main COVID data..."
  if npm run import-data; then
    echo "Main data import successful"
  else
    echo "Error: Main data import failed, but continuing startup..."
  fi
  
  # ランクデータのインポート
  if [ -d "/app/nakano_src/visualize_tool" ] && [ -f "/app/scripts/import-rank-data.ts" ]; then
    echo "Importing rank data..."
    if npm run import-rank-data; then
      echo "Rank data import successful"
    else
      echo "Warning: Rank data import failed, but continuing startup..."
    fi
  else
    echo "Warning: Rank data directories or import script not found, skipping rank data import"
  fi
  
  # インポート完了フラグを作成
  touch /app/.data-imported
  echo "Data import completed, created flag file"
else
  if [ -f "/app/.data-imported" ]; then
    echo "Data already imported (found flag file), skipping import"
  else
    echo "Warning: nakano_src directory or import script not found, skipping data import"
  fi
fi

# Start the main application
echo "Starting application..."
exec npm run dev 