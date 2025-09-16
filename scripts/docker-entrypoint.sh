#!/bin/sh
# このスクリプトは、Dockerコンテナの起動時に実行されるエントリーポイントです。
# 主に、データベースのマイグレーションとアプリケーションの起動を行います。

# エラーが発生した場合は、直ちにスクリプトを終了します。
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

# ---- ここから修正箇所 ----

# データインポートが必要かどうかのチェック
# nakano_srcディレクトリとインポートスクリプトが存在する場合のみ実行
if [ -d "/app/nakano_src" ] && [ -f "/app/scripts/import-data.ts" ]; then
  echo "Checking if data import is needed..."

  # データベースファイルが存在することを確認
  if [ -f "/app/prisma/dev.db" ]; then
    # 最初にテーブルから行数を取得しようと試みる
    DATA_COUNT=$(sqlite3 /app/prisma/dev.db "SELECT count(*) FROM CovidData;")

    # sqlite3コマンドが失敗したか(終了コードが0以外)、結果が空文字だった場合は、
    # テーブルが存在しないか空であるとみなし、カウントを0に設定する
    if [ $? -ne 0 ] || [ -z "$DATA_COUNT" ]; then
      DATA_COUNT=0
    fi

    # デバッグ用に取得したカウント数を表示
    echo "Debug: Data count retrieved from database is '$DATA_COUNT'."

    # カウント数が0の場合のみデータインポートを実行
    if [ "$DATA_COUNT" -eq 0 ]; then
      echo "Database appears to be empty. Importing data..."
      npm run import-data
    else
      echo "Data already exists (Count: $DATA_COUNT). Skipping import."
    fi
  else
    # データベースファイル自体が存在しない場合は、インポートを実行
    echo "Database file not found. Assuming first run and importing data..."
    npm run import-data
  fi
else
  echo "Warning: nakano_src directory or import script not found, skipping data import."
fi

# ---- ここまで修正箇所 ----

# Start the main application
echo "Starting application... with command: $@"
exec "$@"
