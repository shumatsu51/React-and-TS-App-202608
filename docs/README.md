# ドキュメント一覧

このディレクトリには、開発を始める前に読んでおくと役立つドキュメントをまとめています。
セットアップ手順やコマンド一覧はリポジトリルートの [README.md](../README.md) を参照してください。

| ドキュメント | 内容 |
|---|---|
| [deploy-to-aws.md](./deploy-to-aws.md) | AWS CDK を使った ECS Fargate + RDS へのデプロイ手順 |
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
5. AWS にデプロイするとき → [deploy-to-aws.md](./deploy-to-aws.md)
