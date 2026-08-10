import * as cdk from "aws-cdk-lib";
import { VpcStack } from "../lib/vpc-stack";
import { EcrStack } from "../lib/ecr-stack";
import { DatabaseStack } from "../lib/database-stack";
import { EcsStack } from "../lib/ecs-stack";

const app = new cdk.App();

// デプロイ先のアカウントとリージョンを指定する
// AWS_ACCOUNT_ID 環境変数に自分の AWS アカウント ID、AWS_REGION 環境変数に
// 自分のリージョン（未指定時は大阪リージョン ap-northeast-3）を設定してください
//
// 注意: CDK_DEFAULT_REGION は CLI が ~/.aws/config のデフォルトリージョンから
// 自動的に補完する値のため、ここではフォールバックに使わない
// （AWS CLI のデフォルトリージョンが東京の場合に、意図せず東京へデプロイされてしまうのを防ぐため）
const env: cdk.Environment = {
  account: process.env.AWS_ACCOUNT_ID ?? process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.AWS_REGION ?? "ap-northeast-3",
};

// 複数人が同じ AWS アカウントを共有して利用するため、GitHub アカウント名を
// スタック名・リソース名のプレフィックスにして一意にする
const githubUsername = process.env.GITHUB_USERNAME;
if (!githubUsername) {
  throw new Error(
    "GITHUB_USERNAME 環境変数を設定してください（例: export GITHUB_USERNAME=your-github-id）"
  );
}

// ① VPC スタック: ネットワーク基盤を作成する
const vpcStack = new VpcStack(app, `${githubUsername}-VpcStack`, { env });

// ② ECR スタック: Docker イメージ保存先のリポジトリを作成する
const ecrStack = new EcrStack(app, `${githubUsername}-EcrStack`, {
  env,
  githubUsername,
});

// ③ Database スタック: RDS MySQL インスタンスを作成する（VPC が必要）
const databaseStack = new DatabaseStack(app, `${githubUsername}-DatabaseStack`, {
  env,
  vpc: vpcStack.vpc,
  githubUsername,
});
databaseStack.addDependency(vpcStack);

// ④ ECS スタック: ECS Fargate + ALB でアプリを動かす（全スタックが必要）
const ecsStack = new EcsStack(app, `${githubUsername}-EcsStack`, {
  env,
  vpc: vpcStack.vpc,
  frontendRepository: ecrStack.frontendRepository,
  backendRepository: ecrStack.backendRepository,
  dbSecret: databaseStack.dbSecret,
  dbSecurityGroup: databaseStack.dbSecurityGroup,
  dbEndpoint: databaseStack.dbEndpoint,
  dbName: databaseStack.dbName,
  githubUsername,
});
ecsStack.addDependency(vpcStack);
ecsStack.addDependency(ecrStack);
ecsStack.addDependency(databaseStack);
