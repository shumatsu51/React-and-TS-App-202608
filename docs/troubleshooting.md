# トラブルシューティングガイド

開発中によく遭遇する事象と対処法をまとめています。ここに無い場合は、エラーメッセージで検索する前に `docker compose logs <service名>` でログを確認してください。

## ローカル開発

### `docker compose up` でポートが既に使われていると言われる（`port is already allocated`）

5173（frontend）、3000（backend）、3306（db）のいずれかが既に使われている。

```bash
# 何が使っているか確認する（例: 3306番ポート）
lsof -i :3306
# 不要なプロセス（別の MySQL など）を止める。Docker コンテナが原因なら:
docker ps
docker stop <CONTAINER ID>
```

### backend が起動直後に DB 接続エラーで落ちる

`db` コンテナのヘルスチェックが通る前に `backend` が起動しようとすると失敗する。`docker-compose.yml` では `depends_on.db.condition: service_healthy` を設定済みなので、通常は自動で順番に起動するが、初回起動で MySQL の初期化（`init.sql` 実行含む）に時間がかかる場合は数十秒待ってから再度確認する。

```bash
docker compose logs db
docker compose ps
```

### `.env` を作っていない／編集後に反映されない

- `.env.example` をコピーして `.env` を作成しているか確認する（`cp .env.example .env`）。
- `.env` の変更はコンテナ再起動が必要（`docker compose up` のホットリロードはコード変更のみが対象）。
  ```bash
  docker compose down
  docker compose up -d
  ```

### フロントエンドから API を呼ぶと CORS エラーになる

ローカルでは frontend（`:5173`）と backend（`:3000`）のオリジンが異なるため、CORS 設定（[backend/src/index.ts](../backend/src/index.ts)）に許可していないオリジンからアクセスするとエラーになる。`http://localhost:5173` 以外のホスト名・ポートでアクセスしている場合（例: 別のポートにフォワードしている）は `origin` の配列にそのオリジンを追加する。

### ログインしてもすぐにログアウトされる/Cookie が保存されない

- `fetch` に `credentials: "include"` を指定しているか確認する（[frontend/src/api/auth.ts](../frontend/src/api/auth.ts) は対応済み）。
- ブラウザの開発者ツール → Application → Cookies で `token` が保存されているか確認する。
- サードパーティ Cookie をブロックする設定（Safari のITP等）が影響することがある。同一オリジン構成の AWS 環境では発生しない。

### テーブルを変更したのに反映されない

`db/init.sql` は MySQL のデータディレクトリが空の状態（初回起動）でのみ実行される。一度起動した DB には反映されないため、データを消してよい場合は以下でボリュームを作り直す。

```bash
docker compose down -v   # -v で db_data ボリュームも削除される
docker compose up -d
```

## テスト・Lint

### `npm run lint` がエラーになる

- ESLint と Prettier がコンフリクトしている場合はまず `npm run format` を実行してフォーマットを揃える。
- `npm run lint:fix` で自動修正可能なルールは直る。残りは手動で修正する。

### Vitest がモックのせいで失敗する

`vi.mock(...)` は呼び出し元のファイルから見た相対パスで指定する必要がある。テスト対象のコンポーネントが import しているパスと、テストファイルの `vi.mock` のパスが解決先（実ファイル）として一致しているか確認する（パス文字列が違っても実体が同じファイルを指していれば OK）。

## AWS デプロイ

### `cdk deploy` が `not authorized` 等の権限エラーで失敗する

`aws configure` で設定した IAM ユーザーに必要な権限（VPC, ECS, RDS, ECR, IAM, Secrets Manager 等の作成権限）が無い可能性がある。研修用に発行された IAM ユーザーのポリシーを確認する。

### `cdk bootstrap` を忘れて `deploy` が失敗する

CDK が使う S3 バケット・IAM ロールなどが未作成だと `deploy` がエラーになる。README の「4-3. CDK Bootstrap」を実行してから再度 `deploy` する。

### ECS のタスクが起動直後に停止する（`STOPPED` を繰り返す）

ECS コンソールでサービス → タスク → 「停止済みの理由」を確認する。多くの場合は以下のいずれか。

- コンテナ起動時のエラー（環境変数不足、DB 接続失敗など）→ CloudWatch Logs（`/ecs/react-hono-app/backend` など）を確認する。
- イメージの push 漏れ・タグ違い（`latest` タグで push したか確認する）。
- ヘルスチェックに失敗している（ALB のターゲットグループのヘルスチェックパスが `/api/health` または `/` になっているか確認する）。

### ブラウザでアクセスしても画面が表示されない

- ALB のセキュリティグループが `80` 番ポートをインターネットから許可しているか確認する（`AlbSecurityGroup`）。
- ECS サービスが起動しているか（`desiredCount` に対して `runningCount` が足りているか）を ECS コンソールで確認する。
- それでも繋がらない場合は CloudWatch Logs でアプリケーション側のエラーを確認する。

### RDS に手元の PC から接続できない

README の「4-5. RDS にテーブルを作成する」にあるとおり、RDS のセキュリティグループに自分のグローバル IP からの `3306` 番ポート接続を**一時的に**許可する必要がある。作業が終わったら許可ルールを削除すること（恒久的に開けたままにしない）。
