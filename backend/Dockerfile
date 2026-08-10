# ─── 開発ステージ ───────────────────────────────────────
FROM node:20-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]

# ─── ビルドステージ ─────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
# devDependencies (TypeScript) も含めてインストールしないと tsc が実行できない
RUN npm ci

COPY . .
RUN npm run build

# ─── 本番ステージ ───────────────────────────────────────
FROM node:20-alpine AS prod

WORKDIR /app

COPY package*.json ./
# 本番環境用に依存パッケージのみを改めてインストールする
RUN npm ci --omit=dev

# ビルド成果物のみコピー（devDependencies は含まない）
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
