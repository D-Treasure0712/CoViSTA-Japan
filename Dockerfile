# ---- 開発用ステージ (development) ----
FROM node:22-slim AS development

# 必要なツールをインストール
RUN apt-get update && apt-get install -y curl openssl sqlite3 dos2unix && rm -rf /var/lib/apt/lists/*

# アプリケーションの作業ディレクトリを設定
WORKDIR /app

# 依存関係ファイルをコピー (package.json と package-lock.json または yarn.lock)
COPY package*.json ./

# 依存関係をインストール (csv-parserも含む)
RUN npm install

# prismaフォルダをコピー（スキーマなど）
COPY prisma ./prisma/

# Prismaクライアントを生成
RUN npx prisma generate

# スクリプトフォルダを先にコピー
COPY scripts ./scripts/

# アプリケーションのソースコードをコピー
COPY . .

# スクリプトに実行権限を付与
RUN chmod +x ./scripts/docker-entrypoint.sh
RUN dos2unix ./scripts/docker-entrypoint.sh

# Prisma設定とデータベースの初期化
ENV DATABASE_URL="file:/app/prisma/dev.db"

# Next.js のデフォルトポート (3000) を公開
EXPOSE 3000

# 開発サーバーを起動するコマンド（docker-compose.ymlでオーバーライドされます）
CMD ["./scripts/docker-entrypoint.sh"]

# ...existing code...