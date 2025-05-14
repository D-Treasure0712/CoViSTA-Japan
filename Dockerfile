# ---- 開発用ステージ (development) ----
FROM node:22-alpine AS development

# アプリケーションの作業ディレクトリを設定
WORKDIR /app

# 依存関係ファイルをコピー (package.json と package-lock.json または yarn.lock)
# まずこれらをコピーして先に依存関係をインストールすることで、
# ソースコードの変更時に毎回依存関係のインストールが走るのを防ぎ、ビルドキャッシュを効率的に利用します。
COPY package*.json ./
# yarn を使用する場合は yarn.lock もコピー
# COPY yarn.lock ./

# 依存関係をインストール
RUN npm install
# yarn を使用する場合
# RUN yarn install

# アプリケーションのソースコードをコピー
COPY . .

# Next.js のデフォルトポート (3000) を公開
EXPOSE 3000

# 開発サーバーを起動するコマンド
CMD ["npm", "run", "dev"]
# yarn を使用する場合
# CMD ["yarn", "dev"]

# ---- 本番用ステージ (production) ----
FROM node:22-alpine AS production

WORKDIR /app

# 依存関係ファイルをコピー
COPY package*.json ./
# yarn を使用する場合
# COPY yarn.lock ./

# 本番用に最適化された依存関係をインストール
# npm ci は package-lock.json に基づいてクリーンインストールを行います
RUN npm ci --only=production
# yarn を使用する場合
# RUN yarn install --production --frozen-lockfile

# 開発ステージからビルド済みのアセットをコピー
# .next/standalone を使用する場合 (Next.js 12.2 以降で推奨)
# COPY --from=development /app/.next/standalone ./
# COPY --from=development /app/public ./public
# COPY --from=development /app/.next/static ./.next/static

# 従来の方法 (standalone を使用しない場合)
COPY --from=development /app/.next ./.next
COPY --from=development /app/public ./public
# package.json は本番起動に必要なのでコピー
COPY --from=development /app/package.json ./package.json
# next.config.js や tsconfig.json も必要に応じてコピー
# COPY --from=development /app/next.config.js ./next.config.js
# COPY --from=development /app/tsconfig.json ./tsconfig.json


# Next.js のデフォルトポート (3000) を公開
EXPOSE 3000

# 環境変数で Next.js が本番モードで動作するように設定
ENV NODE_ENV production

# 本番サーバーを起動するコマンド
# .next/standalone を使用する場合
# CMD ["node", "server.js"]
# 従来の方法
CMD ["npm", "start"]
# yarn を使用する場合
# CMD ["yarn", "start"]