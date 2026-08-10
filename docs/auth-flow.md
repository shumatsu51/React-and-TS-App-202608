# 認証フロー

JWT を httpOnly Cookie に保存する方式で認証を行っています。トークン自体には署名のみで暗号化はしていないため、Cookie に `httpOnly` / `sameSite: Lax` を設定し、本番（HTTPS）では `secure: true` にすることを前提にしています（`backend/src/routes/auth.ts` の `setAuthCookie`）。

## 1. 新規登録（Signup）

```mermaid
sequenceDiagram
    participant Browser as ブラウザ(React)
    participant API as Backend(Hono)
    participant DB as MySQL

    Browser->>API: POST /api/auth/signup { email, password }
    API->>API: email形式・password文字数を検証
    API->>DB: SELECT id FROM users WHERE email = ?
    DB-->>API: 該当なし
    API->>API: bcrypt.hash(password)
    API->>DB: INSERT INTO users (...)
    DB-->>API: insertId
    API->>API: JWTを生成し署名
    API-->>Browser: 201 Created + Set-Cookie: token=...(httpOnly)
    Browser->>Browser: AuthContext の user を更新
```

## 2. ログイン（Login）

```mermaid
sequenceDiagram
    participant Browser as ブラウザ(React)
    participant API as Backend(Hono)
    participant DB as MySQL

    Browser->>API: POST /api/auth/login { email, password }
    API->>DB: SELECT id, email, password_hash FROM users WHERE email = ?
    DB-->>API: 該当ユーザー行（or なし）
    API->>API: bcrypt.compare(password, password_hash)
    alt 一致しない、またはユーザーが存在しない
        API-->>Browser: 401 Unauthorized
    else 一致する
        API->>API: JWTを生成し署名
        API-->>Browser: 200 OK + Set-Cookie: token=...(httpOnly)
        Browser->>Browser: AuthContext の user を更新
    end
```

## 3. 認証チェック（ページ読み込み時 / 認証必須API）

```mermaid
sequenceDiagram
    participant Browser as ブラウザ(React)
    participant API as Backend(Hono)
    participant Mid as requireAuth middleware
    participant DB as MySQL

    Browser->>API: GET /api/auth/me （Cookie: token=...）
    API->>Mid: トークンをCookieから取得
    alt Cookieが無い、または検証失敗
        Mid-->>Browser: 401 Unauthorized
    else 検証成功
        Mid->>API: c.set("user", payload)
        API->>DB: SELECT id, email, created_at FROM users WHERE id = ?
        DB-->>API: ユーザー行（or なし）
        alt ユーザーが存在しない
            API-->>Browser: 404 Not Found
        else 存在する
            API-->>Browser: 200 OK { id, email, created_at }
        end
    end
```

フロントエンドでは `AuthProvider`（[frontend/src/context/AuthProvider.tsx](../frontend/src/context/AuthProvider.tsx)）がマウント時にこの `GET /api/auth/me` を呼び出し、ログイン状態を復元する。

## 4. ログアウト

```mermaid
sequenceDiagram
    participant Browser as ブラウザ(React)
    participant API as Backend(Hono)

    Browser->>API: POST /api/auth/logout
    API->>API: deleteCookie(token)
    API-->>Browser: 204 No Content
    Browser->>Browser: AuthContext の user を null に更新
```

## トークンの有効期限

- `TOKEN_TTL_SECONDS`（[backend/src/routes/auth.ts](../backend/src/routes/auth.ts)）で7日間に設定。Cookie の `maxAge` と JWT の `exp` クレームの両方に同じ値を使っている。
- 期限切れの場合、`requireAuth` の `verify()` が失敗し 401 を返すので、フロントエンドは再ログインを求める。
