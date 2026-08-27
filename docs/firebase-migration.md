# Firebase 移行計画

このドキュメントは、既存の Hono + MySQL + JWT Cookie 構成から Firebase Authentication + Cloud Firestore + Firebase Hosting 構成へ移行するための作業記録です。

移行が完了するまで、Docker Compose によるローカル環境と AWS 向けの資産は維持します。

## 目標構成

```mermaid
graph LR
    Browser[ブラウザ / スマートフォン] --> Hosting[Firebase Hosting]
    Hosting --> Frontend[React + Vite]
    Frontend --> Auth[Firebase Authentication]
    Frontend --> Firestore[Cloud Firestore]
```

- Firebase Hosting は SPA の静的ファイルを配信する。
- Firebase Authentication はメールアドレス・パスワード認証を担当する。
- Cloud Firestore は旅行、行きたい場所、旅程、費用を保存する。
- Cloud Functions、Cloud Run、Cloud SQL は使用しない。

## 段階的な移行

| 段階 | 内容 | 状態 |
| --- | --- | --- |
| 0 | 移行準備：現行動作の基準確認、対象資産とデータ方針の確定 | 完了 |
| 1 | Firebase プロジェクト、Auth、Firestore、Hosting、Emulator の土台を追加 | 完了 |
| 2 | Firestore データモデル、Security Rules、Rules テストを追加 | 完了 |
| 3 | JWT Cookie 認証を Firebase Authentication に移行 | 完了 |
| 4 | 旅行 CRUD を Firestore SDK に移行 | 進行中 |
| 5 | 場所・旅程・支出・予算を Firestore SDK に移行 | 未着手 |
| 6 | Hosting 公開、スマートフォン検証、不要資産の整理、ドキュメント更新 | 未着手 |

## 段階 0：移行準備

### 完了済みの基準確認

2026-08-26 時点で、次のコマンドは成功している。

```bash
cd backend && npm test   # 4 files / 24 tests
cd frontend && npm test  # 10 files / 45 tests
docker compose config --quiet
```

フロントエンドのテスト実行時に表示される `console.error` は、通信失敗・入力エラーを確認する既存の失敗系テストに由来する。テスト自体はすべて成功している。

### 現行資産の扱い

| 資産 | 移行中 | Firebase 版の受け入れ完了後 |
| --- | --- | --- |
| `frontend/` | Firestore / Auth 用に段階的に置換する | 維持 |
| `backend/` | ローカル動作のため維持する | Firebase 版の全機能検証後に削除候補 |
| `db/` | ローカル MySQL 用として維持する | データ移行方針の確定後に削除候補 |
| `cdk/` | AWS デプロイ資産として維持する | Firebase 運用へ完全移行後に削除候補 |
| `docker-compose.yml` | 変更しない | Firebase 版のローカル開発手順確立後に扱いを再検討 |

### 現行データと移行先の対応案

Firestore では、Firebase Authentication の UID を所有者 ID とし、旅行配下に関連データを置く。

```text
users/{uid}
  └─ trips/{tripId}
       ├─ places/{placeId}
       ├─ itineraryItems/{itemId}
       └─ expenses/{expenseId}
```

| MySQL テーブル | Firestore の配置 | 主な変更 |
| --- | --- | --- |
| `users` | `users/{uid}` | 数値 ID を Firebase Auth UID に置換。パスワードハッシュは Firebase Auth が管理 |
| `trips` | `users/{uid}/trips/{tripId}` | 数値 ID を文字列 ID に置換 |
| `trip_places` | `.../trips/{tripId}/places/{placeId}` | `trip_id` を親パスで表現 |
| `itinerary_items` | `.../trips/{tripId}/itineraryItems/{itemId}` | `trip_id` を親パスで表現。`trip_place_id` は文字列 ID または `null` |
| `trip_expenses` | `.../trips/{tripId}/expenses/{expenseId}` | `trip_id` を親パスで表現 |

### 決定事項

- ローカル MySQL の既存ユーザー・旅行データは移行しない。Firebase では新しいアカウントとデータを作成する。
- Firebase プロジェクトは開発・本番兼用の 1 プロジェクトで運用する。
- Firebase プロジェクト ID は `triply-73809`。`.firebaserc` とローカル専用の `frontend/.env` に設定する。

## 移行時の品質基準

- Firebase の実装を追加しても、既存の `docker compose up --build` によるローカル環境を壊さない。
- 各機能を移行する前後で、該当するフロントエンドテストを維持または Firebase Emulator 対応へ更新する。
- Firestore Security Rules をリポジトリで管理し、他ユーザーのデータを読み書きできないことを Emulator 上の Rules テストで確認する。
- Firebase 版を公開するまでは、AWS 関連のコード・手順を削除しない。

## 段階 1：Firebase 基盤

### 追加済みのローカル設定

- `firebase.json` に Firestore Rules / Indexes、Hosting の SPA fallback、Authentication・Firestore・Hosting Emulator のポートを定義した。
- `firestore.rules` は段階 1 ではすべての読み書きを拒否する安全な初期状態とし、段階 2 で所有者・入力値を検証する Rules に置き換えた。
- `frontend/.env.example` に Firebase Web アプリの公開設定値の雛形を追加した。実際の値は `frontend/.env` にだけ設定する。
- `frontend/src/lib/firebase.ts` に Firebase App、Authentication、Firestore の遅延初期化関数を追加した。既存画面からは呼び出していないため、JWT + MySQL によるローカル環境は従来どおり動作する。
- ルートの `firebase:emulators`、`firebase:deploy` スクリプトで Firebase CLI を呼び出せるようにした。

### 検証済み

以下を確認済み。

```bash
cd frontend && npm run build
cd frontend && npm test
XDG_CONFIG_HOME=.firebase-cli-config CI=true \
  npx firebase emulators:exec --only auth,firestore,hosting \
  --project demo-trip-app "node -e \"console.log('Firebase Emulator Suite is ready')\""
```

上記の Emulator 確認は `demo-trip-app` というデモプロジェクトを指定しており、実際の Firebase プロジェクトや本番データへは接続しない。

### Firebase Console の設定状況

実プロジェクト `triply-73809` で、次の設定を完了した。

1. Web アプリの Firebase 設定値を `frontend/.env` に設定
2. Authentication のメール/パスワードプロバイダを有効化
3. Cloud Firestore Database（Standard edition）を作成
4. `firebase deploy --only firestore` で Rules と Indexes を反映

`frontend/.env` は Git 管理外とし、Firebase の公開設定値をリポジトリへ含めない。

## 段階 2：データ設計と Security Rules

- [firestore-data-model.md](./firestore-data-model.md) に Firestore のパス構造、フィールド、整合性の責務分担を定義した。
- [firestore.rules](../firestore.rules) で、認証済み所有者だけが自身のユーザー配下を操作できる Rules と入力制約を実装した。
- Rules 専用の Emulator テストを `frontend/firebase-tests/` に追加した。通常の `frontend` テストとは分離しており、既存のローカル開発手順には影響しない。

```bash
npm run test:firestore-rules
```

このコマンドは `demo-trip-app` を用いて Firestore Emulator を起動し、実 Firebase プロジェクトには接続しない。所有権、未認証アクセス、想定外フィールド、旅行期間外の旅程、親旅行のないサブコレクション、費用カテゴリを確認する。

実 Firebase プロジェクトへの Rules / Indexes 反映は完了している。現行のローカルモードは Firestore を利用しないため、この変更は Docker Compose の動作に影響しない。

## 段階 3：Firebase Authentication 移行

- `AuthProvider` に認証プロバイダの切替を追加した。`VITE_AUTH_PROVIDER=local`（既定値）では、既存の Hono + JWT Cookie 認証を引き続き利用する。
- `VITE_AUTH_PROVIDER=firebase` では、Firebase Authentication のメールアドレス・パスワード認証を利用する。ログイン状態は Firebase SDK の `onAuthStateChanged` で監視する。
- Firebase での新規登録時は、Authentication のユーザー作成後に `users/{uid}` のプロフィール文書を Firestore に作成する。UID は画面内のユーザー ID として文字列で扱う。
- Firebase Emulator を使う場合は、`VITE_USE_FIREBASE_EMULATORS=true` で Authentication（9099）と Firestore（8080）へ接続する。

### この段階でのローカル環境

`frontend/.env` は次のままにしておくことで、`docker compose up --build` による従来どおりのローカル利用を維持できる。

```dotenv
VITE_AUTH_PROVIDER=local
VITE_USE_FIREBASE_EMULATORS=false
```

`frontend/.env.example` は雛形であり、Vite は読み込まない。設定を切り替える場合は必ず Git 管理外の `frontend/.env` を変更して、Vite を再起動する。

Firebase 認証を実プロジェクトで確認する場合だけ、一時的に次のように変更してから Vite を起動する。

```dotenv
VITE_AUTH_PROVIDER=firebase
VITE_USE_FIREBASE_EMULATORS=false
```

```bash
cd frontend
npm run dev
```

この状態では、新規登録・ログイン・ログアウトと `users/{uid}` 作成を確認できる。旅行データの API はまだ Hono + MySQL のままで、Firebase のログイン情報を受け取らない。そのため、Firebase モードで旅行 CRUD を実用するのは段階 4・5 の完了後とする。確認後は `VITE_AUTH_PROVIDER=local` に戻す。

Vite をホスト側で直接起動してローカル API を使う場合、`/api` は既定で `http://localhost:3000` へ転送される。Docker Compose 内では `http://backend:3000` を使用する。`backend` は Docker ネットワーク内のサービス名なので、ホスト側の `npm run dev` からは名前解決できない。

## 段階 4：旅行 CRUD の Firestore 移行

- `frontend/src/api/trips.ts` を認証プロバイダに応じて切り替える API 層に変更した。`local` モードは既存の Hono API を呼び、`firebase` モードは `users/{uid}/trips/{tripId}` を直接操作する。
- 一覧は `startDate` 昇順で取得する。旅行の作成時には Rules が必須とする `budgetAmount: null`、`createdAt`、`updatedAt` を含める。更新時は `updatedAt` を Firestore のサーバー時刻で更新する。
- Firestore の自動生成 ID に対応するため、旅行 ID は文字列・数値のどちらも受け入れる型にした。ローカルモードの数値 ID は従来どおり動作する。
- Firebase モードの旅行詳細では、段階 5 で移行する行きたい場所・旅程・費用を呼び出さない。旅行基本情報の CRUD だけを先に実用可能にする。

### 実プロジェクトでの確認項目

`frontend/.env` を Firebase モードにして Vite を再起動後、次を順に確認する。

1. 旅行一覧が表示される（初回は空状態）。
2. 旅行を作成し、Firestore の `users/{UID}/trips/{tripId}` に文書が作成される。
3. 作成した旅行の詳細表示と編集ができる。
4. 旅行を削除すると一覧から消え、Firestore の旅行文書も削除される。

この段階では旅行に子コレクションをまだ作成しないため、旅行削除は親文書だけを削除する。子コレクションを含めた batch delete は段階 5 で実装する。
