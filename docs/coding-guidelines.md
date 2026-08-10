# コーディング規約

このテンプレートで実装済みの認証機能（`routes/auth.ts`, `context/` 配下など）が規約のサンプルです。迷ったときはまずこれらのファイルの書き方を参考にしてください。

## 1. 共通

- **Lint / Format は必ず通す**: コミット前に `npm run lint` と `npm run format` をルートで実行する（ESLint + Prettier が backend / frontend に導入済み）。
- **TypeScript の `any` は使わない**: `strict: true` を有効にしているので、型が合わない場合は型を直すか `unknown` + 型ガードを使う。
- **コメントは「なぜ」を書く**: 何をしているかはコードを読めば分かるので、コメントは「なぜこの実装にしたか」（例: [cdk/lib/ecs-stack.ts](../cdk/lib/ecs-stack.ts) の循環依存を避ける理由）のような、コードだけでは伝わらない背景を書く。
- **未使用のコード・コメントアウトは残さない**: 使わなくなったコードは削除する。「念のため残す」をしない。

## 2. ファイル・ディレクトリの命名規則

| 種類 | 規則 | 例 |
|---|---|---|
| React コンポーネント | PascalCase、ファイル名 = コンポーネント名 | `LoginForm.tsx`, `AuthGate.tsx` |
| カスタムフック | camelCase、`use` で始める | `useAuth.ts` |
| コンポーネント以外の TS/TSX 以外の補助ファイル | camelCase | `authContext.ts` |
| 型定義・API クライアント・DB 接続など単語1つのモジュール | 小文字 | `types/user.ts`, `api/auth.ts`, `db/index.ts` |
| ディレクトリ | 小文字（複数形/役割名） | `components/`, `routes/`, `middleware/` |

PascalCase / camelCase を同じディレクトリ内で混在させない。1ファイル1モジュール（コンポーネントなら1コンポーネント、フックなら1フック）を原則とし、「コンポーネントとフックを同じファイルに書かない」（`react-refresh/only-export-components` の ESLint ルールが検出する）。

## 3. フロントエンド（React）

- Props の型は `type Props = { ... }` で定義し、コンポーネントの直前に置く。
- 状態管理はまず `useState` / Context API（`AuthContext`）で十分か検討する。グローバルなライブラリ（Redux 等）はこのテンプレートの規模では不要。
- API 呼び出しは直接 `fetch` をコンポーネントに書かず、`frontend/src/api/` にクライアント関数を作成して呼び出す（[frontend/src/api/auth.ts](../frontend/src/api/auth.ts) を参照）。
- フォームのエラー表示は `try/catch` + `useState<string | null>` でエラーメッセージを保持し、`{error && <p>...</p>}` で表示するパターンに統一する（`LoginForm.tsx` / `SignupForm.tsx` を参照）。

## 4. バックエンド（Hono）

- ルーターは1ファイル1リソース（例: `routes/auth.ts` は認証関連のみ）。新しいリソースを追加するときは `routes/` に新規ファイルを作成する。
- レスポンスは原則 `c.json(...)` で返す。ボディが不要な場合のみ `c.body(null, 204)` を使う（ログアウト処理を参照）。
- エラーレスポンスは `c.json({ message: "..." }, <ステータスコード>)` の形式に統一する。日本語でユーザーに表示してよいメッセージを書く。
- 認証情報・トークン名などの定数は1箇所で定義し、複数ファイルに同じ値をハードコードしない（`COOKIE_NAME` / `JWT_SECRET` は `middleware/auth.ts` に集約し、他ファイルはそこから import する）。
- DB アクセスは必ずパラメータ化クエリ（`pool.query(sql, [params])`)を使う。文字列結合で SQL を組み立てない（SQL インジェクション対策）。
- ログイン必須にしたい API には `requireAuth` ミドルウェアを渡す（[backend/src/middleware/auth.ts](../backend/src/middleware/auth.ts)）。

## 5. テスト（Vitest）

- ToDo.md の方針どおり、**ビジネスロジックを含む関数にのみテストを書く**（単純な型定義・受け渡しのみの関数にはテスト不要）。
- バックエンド: `pool.query` をモックして DB に依存せずテストする（[backend/src/__tests__/auth.test.ts](../backend/src/__tests__/auth.test.ts) を参照）。
- フロントエンド: API クライアント（`frontend/src/api/`）を `vi.mock` でモックし、コンポーネントの表示・操作をテストする（[frontend/src/__tests__/AuthGate.test.tsx](../frontend/src/__tests__/AuthGate.test.tsx) を参照）。
- テストファイルは `__tests__/` ディレクトリに置き、`*.test.ts` / `*.test.tsx` で命名する。

## 6. コミット・ブランチ運用

- `skills.md` にあるとおり GitHub Flow（Issue → Branch → PR → Merge）を基本とする。
- コミットメッセージは `<種別>: <内容>` 形式を推奨（`feat:`, `fix:`, `refactor:`, `chore:`, `docs:` など）。過去のコミットログ（`git log`）を参考にする。
- 1コミットは1つの目的に留める（機能追加とリファクタを混ぜない）。

## 7. やってはいけないこと

- `.env` や認証情報をコミットしない（`.env.example` のみコミット対象）。
- `eslint-disable` や `@ts-ignore` で警告・エラーを握りつぶさない。直せない理由がある場合は、その場にコメントで理由を書く。
- 既存のテストが落ちる状態でコミットしない。
