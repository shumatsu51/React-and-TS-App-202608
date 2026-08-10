# API 仕様書

ベース URL:
- ローカル（Vite dev server 経由）: `http://localhost:5173/api`（Vite のプロキシ経由でバックエンドの `http://localhost:3000` に転送される）
- AWS（ALB 経由）: `http://<ALB の DNS 名>/api`（パスベースルーティングでバックエンドに転送される）

認証が必要なエンドポイントは、ログイン時に発行される httpOnly Cookie（`token`）をブラウザが自動送信することで認証される。`fetch` を使う場合は `credentials: "include"` を指定する必要がある（[frontend/src/api/auth.ts](../frontend/src/api/auth.ts) を参照）。

実装本体は [backend/src/routes/auth.ts](../backend/src/routes/auth.ts) と [backend/src/routes/health.ts](../backend/src/routes/health.ts)。

---

## POST /api/auth/signup

新規ユーザー登録。成功時にログイン状態の Cookie もセットされる。

**リクエストボディ**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

| フィールド | 型 | 制約 |
|---|---|---|
| `email` | string | メール形式（`xxx@yyy.zzz`） |
| `password` | string | 8文字以上 |

**レスポンス**

| ステータス | ボディ | 条件 |
|---|---|---|
| `201 Created` | `{ id, email, created_at }` | 登録成功 |
| `400 Bad Request` | `{ message: "メールアドレスの形式が正しくありません" }` | email が不正な形式 |
| `400 Bad Request` | `{ message: "パスワードは8文字以上で入力してください" }` | password が8文字未満 |
| `409 Conflict` | `{ message: "このメールアドレスは既に登録されています" }` | email が既に登録済み |

---

## POST /api/auth/login

ログイン。成功時に Cookie がセットされる。

**リクエストボディ**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**レスポンス**

| ステータス | ボディ | 条件 |
|---|---|---|
| `200 OK` | `{ id, email, created_at }` | ログイン成功 |
| `401 Unauthorized` | `{ message: "メールアドレスまたはパスワードが正しくありません" }` | email が存在しない、またはパスワード不一致（どちらの場合も同じメッセージを返し、メールアドレスの存在を推測されないようにしている） |

---

## POST /api/auth/logout

ログアウト。Cookie を削除する。認証は不要（未ログイン状態で呼んでもエラーにならない）。

**レスポンス**

| ステータス | ボディ |
|---|---|
| `204 No Content` | なし |

---

## GET /api/auth/me

ログイン中のユーザー情報を取得する。**認証必須**（`requireAuth` ミドルウェア適用）。

**レスポンス**

| ステータス | ボディ | 条件 |
|---|---|---|
| `200 OK` | `{ id, email, created_at }` | ログイン中 |
| `401 Unauthorized` | `{ message: "ログインが必要です" }` | Cookie が無い、またはトークンが無効 |
| `404 Not Found` | `{ message: "ユーザーが見つかりません" }` | トークンは有効だが、ユーザーが DB に存在しない（退会後など） |

---

## GET /api/health

ALB のヘルスチェック・死活監視用。DB には依存しない（サーバープロセスが応答できるかのみを確認する）。

**レスポンス**

| ステータス | ボディ |
|---|---|
| `200 OK` | `{ status: "ok" }` |

---

## 共通レスポンス型

```ts
type User = {
  id: number;
  email: string;
  created_at: string;
};
```

## 新しい API を追加する場合

[README.md の「新しい API を追加する」](../README.md#新しい-api-を追加する) の手順に従い、実装後はこの仕様書にもエンドポイントを追記してください。
