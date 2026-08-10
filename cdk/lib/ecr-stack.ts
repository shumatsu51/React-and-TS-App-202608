import * as cdk from "aws-cdk-lib";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { Construct } from "constructs";

type EcrStackProps = cdk.StackProps & {
  // 複数人が同じ AWS アカウントを共有するため、リポジトリ名の一意性を保つのに使う
  githubUsername: string;
};

export class EcrStack extends cdk.Stack {
  // 他スタック（ECS スタック）から参照できるようプロパティとして公開する
  public readonly frontendRepository: ecr.Repository;
  public readonly backendRepository: ecr.Repository;

  constructor(scope: Construct, id: string, props: EcrStackProps) {
    super(scope, id, props);

    const { githubUsername } = props;

    /**
     * フロントエンド用 ECR リポジトリ（nginx でビルド済み React アプリを配信）
     * - removalPolicy: DESTROY … スタック削除時にリポジトリも削除する（学習用の設定）
     * - emptyOnDelete: true  … リポジトリ内のイメージも一緒に削除する
     */
    this.frontendRepository = new ecr.Repository(this, "FrontendRepository", {
      repositoryName: `${githubUsername}-react-hono-app-frontend`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    /**
     * バックエンド用 ECR リポジトリ（Hono + Node.js のサーバー）
     */
    this.backendRepository = new ecr.Repository(this, "BackendRepository", {
      repositoryName: `${githubUsername}-react-hono-app-backend`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    // デプロイ時に docker push するための URI をコンソールで確認できるよう出力する
    new cdk.CfnOutput(this, "FrontendRepositoryUri", {
      value: this.frontendRepository.repositoryUri,
      description: "URI of the frontend ECR repository",
    });
    new cdk.CfnOutput(this, "BackendRepositoryUri", {
      value: this.backendRepository.repositoryUri,
      description: "URI of the backend ECR repository",
    });
  }
}
