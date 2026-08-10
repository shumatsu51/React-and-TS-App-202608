# ─── 開発ステージ ───────────────────────────────────────
FROM node:20-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]

# ─── ビルドステージ ─────────────────────────────────────
# --platform=$BUILDPLATFORM: Vite（esbuild）は QEMU エミュレーション環境下で
# クラッシュすることがあるため、ビルドは常にホストのネイティブアーキテクチャで実行する。
# ビルド成果物（HTML/JS/CSS）はアーキテクチャに依存しないため、
# 最終ステージ（prod）だけ docker build --platform で指定したアーキテクチャになれば問題ない。
FROM --platform=$BUILDPLATFORM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── 本番ステージ（nginx で静的ファイルを配信）─────────────
FROM nginx:alpine AS prod

# ビルド成果物をコピー
COPY --from=build /app/dist /usr/share/nginx/html

# SPA フォールバック対応の nginx 設定をコピー
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
