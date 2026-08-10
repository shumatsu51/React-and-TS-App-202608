import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

type EcsStackProps = cdk.StackProps & {
  vpc: ec2.Vpc;
  frontendRepository: ecr.Repository;
  backendRepository: ecr.Repository;
  dbSecret: secretsmanager.ISecret;
  dbEndpoint: string;
  dbName: string;
  // RDS セキュリティグループ: バックエンドからの接続を許可するルールをここで追加する
  dbSecurityGroup: ec2.SecurityGroup;
  // 複数人が同じ AWS アカウントを共有するため、リソース名の一意性を保つのに使う
  githubUsername: string;
};

export class EcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const {
      vpc,
      frontendRepository,
      backendRepository,
      dbSecret,
      dbEndpoint,
      dbName,
      dbSecurityGroup,
      githubUsername,
    } = props;

    /**
     * ECS クラスター: ECS タスクを実行するための論理グループ。
     * Fargate を使うことでサーバーの管理が不要になる。
     */
    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc,
      clusterName: `${githubUsername}-react-hono-app-cluster`,
    });

    // ─── CloudWatch ロググループ（コンテナのログ確認用）─────────────
    // 明示的に作成することで、デプロイ失敗時でもログが確認できる
    const backendLogGroup = new logs.LogGroup(this, "BackendLogGroup", {
      logGroupName: `/ecs/${githubUsername}/react-hono-app/backend`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_WEEK,
    });
    const frontendLogGroup = new logs.LogGroup(this, "FrontendLogGroup", {
      logGroupName: `/ecs/${githubUsername}/react-hono-app/frontend`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_WEEK,
    });

    // ─── バックエンドタスク定義 ────────────────────────────────

    /**
     * タスク定義: コンテナの仕様（CPU・メモリ・イメージ・環境変数など）を定義する。
     * Fargate 互換のタスク定義を使用する。
     */
    const backendTaskDef = new ecs.FargateTaskDefinition(
      this,
      "BackendTaskDef",
      {
        cpu: 256,    // 0.25 vCPU
        memoryLimitMiB: 512,
      }
    );

    // Secrets Manager から DB 認証情報を読み取る権限を付与する
    dbSecret.grantRead(backendTaskDef.taskRole);

    // ログイン Cookie（JWT）の署名に使う秘密鍵をランダムに自動生成する
    const jwtSecret = new secretsmanager.Secret(this, "JwtSecret", {
      secretName: `${githubUsername}/react-hono-app/jwt-secret`,
      generateSecretString: {
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 64,
      },
    });
    jwtSecret.grantRead(backendTaskDef.taskRole);

    const backendContainer = backendTaskDef.addContainer("BackendContainer", {
      // ECR から最新イメージを取得する
      image: ecs.ContainerImage.fromEcrRepository(backendRepository, "latest"),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "backend", logGroup: backendLogGroup }),
      environment: {
        DATABASE_HOST: dbEndpoint,
        DATABASE_PORT: "3306",
        DATABASE_NAME: dbName,
        PORT: "3000",
      },
      // Secrets Manager から DB ユーザー名・パスワード・JWT 秘密鍵を取得して環境変数に注入する
      secrets: {
        DATABASE_USER: ecs.Secret.fromSecretsManager(dbSecret, "username"),
        DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, "password"),
        JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
      },
    });
    backendContainer.addPortMappings({ containerPort: 3000 });

    // ─── フロントエンドタスク定義 ─────────────────────────────

    const frontendTaskDef = new ecs.FargateTaskDefinition(
      this,
      "FrontendTaskDef",
      {
        cpu: 256,
        memoryLimitMiB: 512,
      }
    );

    const frontendContainer = frontendTaskDef.addContainer(
      "FrontendContainer",
      {
        image: ecs.ContainerImage.fromEcrRepository(
          frontendRepository,
          "latest"
        ),
        logging: ecs.LogDrivers.awsLogs({ streamPrefix: "frontend", logGroup: frontendLogGroup }),
      }
    );
    frontendContainer.addPortMappings({ containerPort: 80 });

    // ─── セキュリティグループ ─────────────────────────────────

    const albSecurityGroup = new ec2.SecurityGroup(this, "AlbSecurityGroup", {
      vpc,
      description: "Security group for ALB (allow HTTP from internet)",
    });
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allow HTTP from internet"
    );

    const backendSecurityGroup = new ec2.SecurityGroup(
      this,
      "BackendSecurityGroup",
      {
        vpc,
        description: "Security group for backend ECS tasks",
      }
    );
    backendSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(3000),
      "Allow from ALB"
    );

    // RDS セキュリティグループにバックエンドからの MySQL 接続を許可するルールを追加する。
    // dbSecurityGroup.addIngressRule() を使うとルールが DatabaseStack 側に追加され、
    // DatabaseStack → EcsStack の参照が新たに発生し、EcsStack → DatabaseStack の依存と
    // 合わせて循環依存（cyclic reference）になってしまう。
    // そのため、ルール自体は EcsStack 側のリソースとして低レベル API (CfnSecurityGroupIngress)
    // で作成し、依存の方向を EcsStack → DatabaseStack の一方向に保つ。
    new ec2.CfnSecurityGroupIngress(this, "AllowBackendToDb", {
      groupId: dbSecurityGroup.securityGroupId,
      sourceSecurityGroupId: backendSecurityGroup.securityGroupId,
      ipProtocol: "tcp",
      fromPort: 3306,
      toPort: 3306,
      description: "Allow MySQL from backend ECS tasks",
    });

    const frontendSecurityGroup = new ec2.SecurityGroup(
      this,
      "FrontendSecurityGroup",
      {
        vpc,
        description: "Security group for frontend ECS tasks",
      }
    );
    frontendSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(80),
      "Allow from ALB"
    );

    // ─── ALB（Application Load Balancer）────────────────────

    /**
     * ALB: インターネットからのリクエストを受け付け、
     * パスに応じてフロントエンド・バックエンドへ振り分ける。
     */
    const alb = new elbv2.ApplicationLoadBalancer(this, "Alb", {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
    });

    const listener = alb.addListener("HttpListener", { port: 80 });

    // ─── バックエンド ECS サービス ────────────────────────────

    const backendService = new ecs.FargateService(this, "BackendService", {
      cluster,
      taskDefinition: backendTaskDef,
      desiredCount: 1,
      // desiredCount: 1 のため、デプロイ更新時はタスクを一旦止めてから新タスクを起動する
      // （学習用構成のため新旧タスクを並行稼働させるコストはかけない）
      minHealthyPercent: 0,
      // タスクが起動に失敗し続ける場合（イメージのアーキテクチャ不一致など）に、
      // 無限リトライで何時間も待たされず早期に失敗させる
      circuitBreaker: { enable: true },
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [backendSecurityGroup],
      assignPublicIp: false,
    });

    // ─── フロントエンド ECS サービス ──────────────────────────

    const frontendService = new ecs.FargateService(this, "FrontendService", {
      cluster,
      taskDefinition: frontendTaskDef,
      desiredCount: 1,
      minHealthyPercent: 0,
      circuitBreaker: { enable: true },
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [frontendSecurityGroup],
      assignPublicIp: false,
    });

    // ─── ALB リスナールール（パスルーティング）────────────────

    /**
     * /api/* へのリクエストをバックエンドサービスへルーティングする。
     * priority が低い数値ほど先に評価される。
     */
    listener.addTargets("BackendTarget", {
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [backendService],
      conditions: [
        elbv2.ListenerCondition.pathPatterns(["/api/*"]),
      ],
      priority: 10,
      healthCheck: {
        path: "/api/health",
        healthyHttpCodes: "200",
      },
    });

    /**
     * それ以外のリクエスト（/* ）はフロントエンドサービスへルーティングする。
     */
    listener.addTargets("FrontendTarget", {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [frontendService],
      healthCheck: {
        path: "/",
        healthyHttpCodes: "200",
      },
    });

    // ALB の DNS 名をコンソールで確認できるよう出力する
    new cdk.CfnOutput(this, "AlbDnsName", {
      value: alb.loadBalancerDnsName,
      description: "DNS name of the ALB (app access URL)",
    });
  }
}
