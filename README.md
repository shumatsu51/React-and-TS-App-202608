# Triply

旅行・行きたい場所・旅程・費用・予算を管理する Web アプリです。公開版は **Firebase Authentication + Cloud Firestore + Firebase Hosting** を利用します。

従来の Hono + MySQL + JWT Cookie 構成と AWS CDK 資産は、ローカル動作の維持と移行完了後の判断のため残しています。認証・旅行データを Firebase に切り替えるかは `VITE_AUTH_PROVIDER` で選べます。

開発を始める前に [docs/](./docs/README.md) のドキュメント（コーディング規約・DB設計・API仕様・アーキテクチャ構成図など）に目を通すことをおすすめします。

---

## 技術スタック

| 領域 | 技術 |
|------|------|
| フロントエンド | React 18, TypeScript, Vite |
| 公開・認証・データ | Firebase Hosting, Firebase Authentication, Cloud Firestore |
| テスト | Vitest, React Testing Library |
| 従来のローカル環境 | Docker Compose, Hono, MySQL, JWT Cookie |
| 従来のクラウド資産 | AWS CDK（ECS Fargate, RDS, ALB など。削除せず維持中） |

---

## 事前準備

以下のツールをあらかじめインストールしてください。

- [Rancher Desktop](https://rancherdesktop.io/)
- [Node.js 20+](https://nodejs.org/)
- Firebase CLI（リポジトリの `firebase-tools` を使用するため、別途グローバルインストールは不要）
- [AWS CLI](https://aws.amazon.com/cli/)（従来の AWS デプロイを行う場合のみ）

---

## 手順 1: テンプレートから自前のリポジトリを作成する

1. このリポジトリのページ右上にある **「Use this template」** ボタンをクリックする
2. リポジトリ名を入力して **「Create repository」** をクリックする
3. 自分のアカウントに新しいリポジトリが作成される

---

## 手順 2: ローカルにリポジトリを clone する

```bash
# <your-username> と <your-repo-name> を自分のものに書き換えてください
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
```

環境変数ファイルをコピーします。

```bash
cp .env.example .env
```

> `.env` ファイルは Git に含まれません。必要に応じて値を変更してください。

---

## 手順 3: ローカルでアプリを動かす

### 起動

```bash
docker compose up --build
```

初回はイメージのダウンロードとビルドに数分かかります。`db` コンテナの起動時に `db/init.sql` が自動実行され、`users` テーブルが作成されます（2回目以降の起動では実行されません）。

### アクセス

| サービス | URL |
|---------|-----|
| フロントエンド | http://localhost:5173 |
| バックエンド API（ヘルスチェック） | http://localhost:3000/api/health |

ブラウザで http://localhost:5173 を開くとログイン画面が表示されます。画面下部の「新規登録」からメールアドレスとパスワード（8文字以上）でアカウントを作成すると、ログイン後の画面に進めます。

### API の確認（curl サンプル）

```bash
# サーバーが起動しているか確認する
curl http://localhost:3000/api/health

# 新規登録（レスポンスの Cookie にログイン用トークンが保存される）
curl -i -c cookie.txt -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# ログイン
curl -i -c cookie.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# ログイン中のユーザー情報を取得する（-b で Cookie を送信する）
curl -b cookie.txt http://localhost:3000/api/auth/me

# ログアウト
curl -i -b cookie.txt -X POST http://localhost:3000/api/auth/logout
```

### テストを実行する

```bash
# バックエンド
cd backend && npm install && npm test

# フロントエンド
cd frontend && npm install && npm test
```

### 停止

```bash
docker compose down
```

> データを完全に削除したい場合は `docker compose down -v` を実行してください。

---

## 手順 4: Firebase に公開する

Firebase Console で作成した Web アプリの設定値を `frontend/.env` に設定します。雛形は `frontend/.env.example` を参照してください。公開版では次を設定します。

```dotenv
VITE_AUTH_PROVIDER=firebase
VITE_USE_FIREBASE_EMULATORS=false
```

Firebase にログインして公開します。

```bash
npm run firebase -- login
npm run firebase -- deploy --only firestore,hosting
```

公開 URL はデプロイ完了時に表示される `Hosting URL` です。詳しい移行状況・公開後の確認項目は [docs/firebase-migration.md](./docs/firebase-migration.md) を参照してください。

## 従来の AWS 構成

AWS CDK を使った ECS Fargate + RDS へのデプロイ手順は、移行期間中の参考情報として [docs/deploy-to-aws.md](./docs/deploy-to-aws.md) に残しています。

---

## ディレクトリ構成

```
react-hono-app-template/
├── frontend/          # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── api/       # バックエンド API クライアント（auth）
│   │   ├── components/ # UI コンポーネント（機能別・共通UI別に分類）
│   │   ├── context/   # AuthContext（ログイン状態をアプリ全体で共有）
│   │   ├── types/     # 型定義
│   │   ├── App.tsx    # ログイン後のメイン画面（ここから機能を実装していく）
│   │   └── __tests__/ # Vitest テスト
│   ├── nginx.conf     # 本番用 nginx 設定（SPA フォールバック）
│   └── Dockerfile
├── backend/           # Hono + Node.js
│   ├── src/
│   │   ├── db/        # DB 接続
│   │   ├── middleware/# 認証ミドルウェア（JWT Cookie 検証。requireAuth をログイン必須の API に適用する）
│   │   ├── routes/    # API ルーター（auth: signup/login/logout/me, health: ヘルスチェック）
│   │   ├── types/     # 型定義
│   │   └── __tests__/ # Vitest テスト
│   └── Dockerfile
├── cdk/               # AWS CDK (TypeScript)
│   ├── bin/app.ts     # スタックのエントリーポイント
│   └── lib/
│       ├── vpc-stack.ts
│       ├── ecr-stack.ts
│       ├── database-stack.ts
│       └── ecs-stack.ts
├── db/
│   └── init.sql       # テーブル DDL（users）。自分のテーブルもここに追加していく
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 新しい API を追加する

`backend/src/routes/auth.ts` を例に、以下の流れで追加するとこのテンプレートの作法に沿った実装になります。

1. `backend/src/types/` に必要な型（リクエスト・レスポンスの型）を定義する
2. `backend/src/routes/` に新しいルーターファイルを作成し、入力チェック → DB 操作 → レスポンスの順で実装する
3. ログイン必須にしたい場合は `requireAuth`（`backend/src/middleware/auth.ts`）をルートに渡す
4. `backend/src/index.ts` で `app.route("/api/xxx", xxx)` を追加してルーターを登録する
5. `backend/src/__tests__/` に、`pool.query` をモックしたテストを書く（`auth.test.ts` を参考）

フロントエンドから呼び出す場合は `frontend/src/api/` にクライアント関数を追加し、`frontend/src/types/` に型を定義してください。
