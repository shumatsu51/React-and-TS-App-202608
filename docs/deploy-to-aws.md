# AWS にデプロイする

> AWS アカウントと、必要な権限を持つ IAM ユーザーが必要です。

このテンプレートの CDK は 4 つのスタックに分かれています。**ECS スタックは VPC・RDS・ECR の情報を必要とするため、必ずそれらを先にデプロイします**（下記の順番どおりに進めてください）。

| 順番 | スタック | 役割 |
|---|---|---|
| 1 | `<GitHub アカウント名>`-VpcStack | ネットワーク（VPC・サブネット） |
| 2 | `<GitHub アカウント名>`-EcrStack | Docker イメージの保存先 |
| 3 | `<GitHub アカウント名>`-DatabaseStack | RDS MySQL インスタンス |
| 4 | `<GitHub アカウント名>`-EcsStack | ECS Fargate + ALB（アプリ本体） |

> 1 つの AWS アカウントを複数人で共有して使う場合に備え、スタック名・ECR リポジトリ名・Secrets Manager のシークレット名・ECS クラスター名・CloudWatch ロググループ名のすべてに GitHub アカウント名を前置して一意にしています（[cdk/bin/app.ts](../cdk/bin/app.ts) 参照）。

## 4-1. AWS CLI の設定

```bash
aws configure
# AWS Access Key ID, Secret Access Key, Region (ap-northeast-3), Output format (json) を入力する
```

> このテンプレートはデフォルトで大阪リージョン（`ap-northeast-3`）にデプロイします。CDK のリージョンは `AWS_REGION` 環境変数で上書きできます（[cdk/bin/app.ts](../cdk/bin/app.ts) 参照）。

## 4-2. CDK の依存関係をインストールする

```bash
cd cdk
npm install
```

```bash
# 4-1 で設定した認証情報から AWS アカウント ID を自動取得する
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=ap-northeast-3

# 自分の GitHub アカウント名に書き換えてください（リソース名を一意にするために使う）
export GITHUB_USERNAME=<your-github-id>
```

## 4-3. VPC・ECR・RDS スタックをデプロイする

```bash
npx cdk deploy ${GITHUB_USERNAME}-VpcStack ${GITHUB_USERNAME}-EcrStack ${GITHUB_USERNAME}-DatabaseStack
```

> **`Do you wish to deploy these changes? (y/n)` と聞かれたら**
>
> IAMロールやセキュリティグループなど、権限・通信経路に関わる変更（＝セキュリティに影響する変更）をデプロイする前に、CDKが内容を見せて確認を求めています。「気づかないうちに意図しない権限変更が紛れ込んでいないか」を確認するための安全装置です。
>
> このテンプレートをそのまま使っている場合は、表示された変更は自分が把握している想定通りの内容のはずなので **`y` で進めて問題ありません**。内容に見覚えのない変更が含まれている場合は `n` で止めて確認してください。
>
> 毎回聞かれるのが煩わしい場合は `npx cdk deploy --require-approval never ...` を付けると確認をスキップできますが、変更内容を見ずに進めることになるため、慣れるまでは確認した方が安全です。

完了まで RDS の作成だけで数分〜10分程度かかります。デプロイ完了後、出力（`Outputs:` 以降）に以下のような行が表示されます。

```
<GITHUB_USERNAME>-EcrStack.FrontendRepositoryUri = <account-id>.dkr.ecr.ap-northeast-3.amazonaws.com/<GITHUB_USERNAME>-react-hono-app-frontend
<GITHUB_USERNAME>-EcrStack.BackendRepositoryUri  = <account-id>.dkr.ecr.ap-northeast-3.amazonaws.com/<GITHUB_USERNAME>-react-hono-app-backend
<GITHUB_USERNAME>-DatabaseStack.DbEndpoint           = <RDS のエンドポイント>
<GITHUB_USERNAME>-DatabaseStack.DbSecurityGroupId    = <RDS のセキュリティグループ ID>
```

`DbEndpoint` と `DbSecurityGroupId` の行の **`=` の右側の値だけ**をコピーして、環境変数に入れておきます（以降の手順では `<...>` を書き換える代わりに、この環境変数を参照します）。

```bash
# 上の出力からそれぞれの値をコピーして書き換えてください
export DB_ENDPOINT=<コピーした DbEndpoint の値>
export DB_SECURITY_GROUP_ID=<コピーした DbSecurityGroupId の値>
```

## 4-4. RDS にテーブルを作成する（初回のみ）

`db/init.sql` はローカルの Docker Compose 専用で、RDS には自動適用されません。RDS はセキュリティグループで許可した IP からのみ接続できるため、初回だけ自分の PC から一時的に接続を許可してテーブルを作成します。

```bash
# 1. 自分のグローバル IP アドレスを確認する
MY_IP=$(curl -s https://checkip.amazonaws.com)

# 2. RDS のセキュリティグループに、自分の IP からの 3306 番ポート接続を一時的に許可する
aws ec2 authorize-security-group-ingress \
  --group-id ${DB_SECURITY_GROUP_ID} \
  --protocol tcp --port 3306 \
  --cidr ${MY_IP}/32

# 3. DB のパスワードを Secrets Manager から取得し、環境変数に格納する
DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id ${GITHUB_USERNAME}/react-hono-app/db-credentials \
  --query SecretString --output text | python3 -c "import sys, json; print(json.load(sys.stdin)['password'])")

# 4. mysql クライアントが手元になければ Docker イメージで代用できる
#    `-p` で対話入力すると、標準入力が db/init.sql にリダイレクトされているため
#    パスワードを入力する前にエラーになる。`-p` の直後にスペースなしで値を渡すこと。
docker run --rm -i mysql:8.0 \
  mysql -h ${DB_ENDPOINT} -u appuser -p"${DB_PASSWORD}" appdb < ../db/init.sql

# 5. 確認が終わったら、安全のため一時的に許可したルールを必ず削除する
aws ec2 revoke-security-group-ingress \
  --group-id ${DB_SECURITY_GROUP_ID} \
  --protocol tcp --port 3306 \
  --cidr ${MY_IP}/32
```

> テーブル定義を変更した場合は、このコマンドを再実行するか `ALTER TABLE` などで直接反映してください。

## 4-5. Docker イメージをビルドして ECR に Push する

```bash
# frontend・backend はリポジトリのルートにあるため、cdk ディレクトリから移動する
cd ..

# ECR にログインする
aws ecr get-login-password --region ${AWS_REGION} \
  | docker login --username AWS --password-stdin \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# フロントエンド
# --platform linux/amd64: ECS Fargate（デフォルトは amd64）で動かすため、
# Apple Silicon（arm64）のマシンでビルドしても amd64 向けイメージになるよう明示する
docker build --platform linux/amd64 --target prod -t ${GITHUB_USERNAME}-react-hono-app-frontend ./frontend
docker tag  ${GITHUB_USERNAME}-react-hono-app-frontend:latest \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${GITHUB_USERNAME}-react-hono-app-frontend:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${GITHUB_USERNAME}-react-hono-app-frontend:latest

# バックエンド
docker build --platform linux/amd64 --target prod -t ${GITHUB_USERNAME}-react-hono-app-backend ./backend
docker tag  ${GITHUB_USERNAME}-react-hono-app-backend:latest \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${GITHUB_USERNAME}-react-hono-app-backend:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${GITHUB_USERNAME}-react-hono-app-backend:latest

# push したイメージが両方 amd64 になっているか確認する（古いイメージが残っていないか）
docker inspect --format '{{.Architecture}}' \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${GITHUB_USERNAME}-react-hono-app-frontend:latest
docker inspect --format '{{.Architecture}}' \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${GITHUB_USERNAME}-react-hono-app-backend:latest
# どちらも amd64 と表示されればOK（arm64 と表示された場合はビルドし直して push する）
```

## 4-6. ECS スタックをデプロイする

```bash
cd cdk
npx cdk deploy ${GITHUB_USERNAME}-EcsStack
```

ECS タスクが ECR の `latest` イメージを使って起動するため、**必ず 4-5 のイメージ push を先に終えてから**このコマンドを実行してください。デプロイ完了後、出力された ALB の DNS 名でアプリにアクセスできます。

> タスクの起動に失敗し続ける場合（イメージのアーキテクチャ不一致など）、サーキットブレーカーが働いて数分程度でデプロイが自動的に失敗します。長時間（10分以上）待っても進まない場合は、ECS コンソールでタスクの停止理由・CloudWatch Logs を確認してください。

```
<GITHUB_USERNAME>-EcsStack.AlbDnsName = react-hono-app-xxxxxxxx.ap-northeast-3.elb.amazonaws.com
```

**アプリへのアクセス方法**

上の出力に表示された `=` の右側の値（DNS名）の前に `http://` を付けてブラウザで開くと、ログイン画面が表示されれば成功です。

ターミナルの出力を見逃した場合や、後日改めて確認したい場合は、AWSコンソールからいつでも確認できます。

1. AWSコンソールにログインし、右上のリージョン選択で「大阪」（`ap-northeast-3`）になっていることを確認する
2. 検索バーで「EC2」と入力して開く
3. 左メニューから「ロードバランサー」を選ぶ
4. 一覧から `${GITHUB_USERNAME}-EcsStack` を含む名前のロードバランサーを選択する
5. 詳細タブの「DNS 名」の値をコピーする
6. ブラウザのURLバーにコピーしたURLを貼り付けて Enter キーを押す

> （任意）ターミナルからクリックできるリンクとして表示したい場合は、出力された値を環境変数に入れることもできますが、アプリの動作自体には影響しない、確認用の補助コマンドです。
>
> ```bash
> export ALB_DNS_NAME=<コピーした AlbDnsName の値>
> echo "http://${ALB_DNS_NAME}"
> ```

コードを変更した場合は、4-5（ビルド & push）のあとに ECS サービスを再デプロイすると最新版に更新できます。サービス名は CDK が自動生成するため、まず一覧を取得します。

```bash
# サービス名（Backend/Frontend）の一覧を確認する
aws ecs list-services --cluster ${GITHUB_USERNAME}-react-hono-app-cluster --region ${AWS_REGION}

# 確認したサービス名に書き換えて、再デプロイを強制する
aws ecs update-service \
  --cluster ${GITHUB_USERNAME}-react-hono-app-cluster \
  --service <確認したサービス名> \
  --force-new-deployment \
  --region ${AWS_REGION}
```

## 4-7. スタックを削除する（演習終了後）

課金を止めるため、不要になったリソースは削除してください。

```bash
cd cdk
npx cdk destroy --all
```

> `--all` は今回作成した自分の4スタック（`${GITHUB_USERNAME}-` で始まるもの）のみが対象です。CDK Bootstrap で作られた共有の `CDKToolkit` スタックは削除されません。

以下のように削除対象のスタックの名前が表示されるため、認識が合っていれば `y` を入力してください。

```
Are you sure you want to delete: ${GITHUB_USERNAME}-VpcStack, ${GITHUB_USERNAME}-EcrStack, ${GITHUB_USERNAME}-DatabaseStack, ${GITHUB_USERNAME}-EcsStack (y/n)
```
