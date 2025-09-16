# ----------------------------------------------------------------
# ステージ1: ビルド用ステージ (builder)
# ----------------------------------------------------------------
FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends curl openssl sqlite3 dos2unix && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Prisma Clientの型情報を生成する（DB接続は不要）
RUN npx prisma generate

# Next.jsのビルドを実行（DBアクセスは発生しない）
RUN npm run build


# ----------------------------------------------------------------
# ステージ2: 本番用ステージ (production)
# ----------------------------------------------------------------
FROM node:22-slim AS production

RUN apt-get update && apt-get install -y --no-install-recommends openssl sqlite3 dos2unix && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
# データインポートに必要なものも含めて全ての依存関係をインストール
RUN npm ci

# ビルダーからソースコードとビルド成果物をコピー
COPY --from=builder /app .

# 環境変数
ENV NODE_ENV production
ENV DATABASE_URL="file:/app/prisma/dev.db"

# ポート
EXPOSE 3000

# 起動スクリプトに実行権限を付与
RUN chmod +x /app/scripts/docker-entrypoint.sh

# コンテナ起動時に、まずこのスクリプトを実行するように設定
# （ここでDBの作成とデータ投入が行われる）
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]

# ENTRYPOINTのスクリプトに渡されるデフォルトのコマンド（本番サーバーの起動）
CMD ["npm", "start"]
