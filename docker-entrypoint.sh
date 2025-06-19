// filepath: [docker-entrypoint.sh](http://_vscodecontentref_/0)
#!/bin/bash

echo "Starting CoViSTA-Japan application..."

# データベースの初期化
echo "Initializing database..."
npx prisma migrate dev --name init

# CSVデータのインポート（初回のみ）
if [ ! -f /app/prisma/.data-imported ]; then
    echo "CSV data not found. Importing CSV data..."
    
    # csv-parserがインストールされていない場合はインストール
    if ! npm list csv-parser > /dev/null 2>&1; then
        echo "Installing csv-parser..."
        npm install csv-parser @types/csv-parser
    fi
    
    # データインポートスクリプトを実行
    npx ts-node scripts/import-wave-data-docker.ts
    
    if [ $? -eq 0 ]; then
        touch /app/prisma/.data-imported
        echo "✅ CSV data import completed successfully."
    else
        echo "❌ CSV data import failed."
        exit 1
    fi
else
    echo "✅ CSV data already imported. Skipping import."
fi

# データの確認
echo "Checking imported data..."
npx prisma db execute --stdin <<EOF
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT prefectureId) as prefecture_count,
    COUNT(DISTINCT lineageId) as lineage_count,
    MIN(wave) as min_wave,
    MAX(wave) as max_wave
FROM CovidData;
EOF

echo "🚀 Starting Next.js development server..."
# Next.jsの開発サーバーを起動
exec npm run dev