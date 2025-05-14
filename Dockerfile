# ---- 開発用ステージ (development) ----
FROM node:22-slim AS development

# 必要なツールをインストール
RUN apt-get update && apt-get install -y curl openssl sqlite3

# アプリケーションの作業ディレクトリを設定
WORKDIR /app

# 依存関係ファイルをコピー (package.json と package-lock.json または yarn.lock)
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# prismaフォルダをコピー（スキーマなど）
COPY prisma ./prisma/

# Prismaクライアントを生成
RUN npx prisma generate

# アプリケーションのソースコードをコピー
COPY . .

# スクリプトに実行権限を付与
RUN chmod +x ./scripts/docker-entrypoint.sh

# Prisma設定とデータベースの初期化
ENV DATABASE_URL="file:/app/prisma/dev.db"

# Next.js のデフォルトポート (3000) を公開
EXPOSE 3000

# 開発サーバーを起動するコマンド（docker-compose.ymlでオーバーライドされます）
CMD ["npm", "run", "dev"]

# ---- 本番用ステージ (production) ----
FROM node:22-slim AS production

# 必要なツールをインストール
RUN apt-get update && apt-get install -y openssl sqlite3

WORKDIR /app

# 依存関係ファイルをコピー
COPY package*.json ./

# 本番用に最適化された依存関係をインストール
RUN npm ci --only=production

# prismaフォルダをコピー（スキーマなど）
COPY prisma ./prisma/

# Prismaクライアントを生成
RUN npx prisma generate

# ソースコードとPrismaファイルをコピー
COPY . .

# Prisma設定
ENV DATABASE_URL="file:/app/prisma/dev.db"

# 開発ステージからビルド済みのアセットをコピー
COPY --from=development /app/.next ./.next
COPY --from=development /app/public ./public

# Next.js のデフォルトポート (3000) を公開
EXPOSE 3000

# 環境変数で Next.js が本番モードで動作するように設定
ENV NODE_ENV production

# 本番サーバーを起動するコマンド
CMD ["npm", "start"]