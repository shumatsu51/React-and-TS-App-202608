# ドキュメント一覧

このディレクトリには、開発を始める前に読んでおくと役立つドキュメントをまとめています。
セットアップ手順やコマンド一覧はリポジトリルートの [README.md](../README.md) を参照してください。

| ドキュメント | 内容 |
|---|---|
| [firebase-migration.md](./firebase-migration.md) | Firebase Authentication + Cloud Firestore + Hosting の公開手順、段階的な移行計画と作業記録 |
| [deploy-to-aws.md](./deploy-to-aws.md) | 従来の AWS CDK を使った ECS Fargate + RDS へのデプロイ手順（移行期間中は維持） |
| [firestore-data-model.md](./firestore-data-model.md) | Cloud Firestore のデータ構造、Security Rules の責務、整合性ルール |
| [coding-guidelines.md](./coding-guidelines.md) | 命名規則・ファイル構成・エラーハンドリングなどのコーディング規約 |
| [directory-structure.md](./directory-structure.md) | リポジトリ全体のディレクトリ構成と各ディレクトリの役割 |
| [er-diagram.md](./er-diagram.md) | DB のテーブル設計・ER 図 |
| [api-spec.md](./api-spec.md) | バックエンド API のエンドポイント一覧（リクエスト・レスポンス・ステータスコード） |
| [auth-flow.md](./auth-flow.md) | ログイン・ログアウト・認証チェックのシーケンス図 |
| [architecture.md](./architecture.md) | ローカル環境（Docker Compose）と AWS 環境の構成図 |
| [troubleshooting.md](./troubleshooting.md) | 開発中によくつまずくポイントと対処法 |

## 読む順番のおすすめ

1. 初めてこのリポジトリに触る → [directory-structure.md](./directory-structure.md) → [architecture.md](./architecture.md)
2. コードを書き始める前に → [coding-guidelines.md](./coding-guidelines.md)
3. 新しい API・テーブルを追加するとき → [api-spec.md](./api-spec.md) → [er-diagram.md](./er-diagram.md)
4. 動かなくて困ったとき → [troubleshooting.md](./troubleshooting.md)
5. Firebase に公開するとき → [firebase-migration.md](./firebase-migration.md)
6. 従来の AWS にデプロイするとき → [deploy-to-aws.md](./deploy-to-aws.md)
