import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export class VpcStack extends cdk.Stack {
  // 他スタックから VPC を参照できるようにプロパティとして公開する
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    /**
     * VPC（Virtual Private Cloud）を作成する。
     *
     * - maxAzs: 2 … 2つのアベイラビリティゾーンに分散して高可用性を確保する
     * - SubnetType.PUBLIC  … ALB や踏み台サーバーを配置するパブリックサブネット
     * - SubnetType.PRIVATE_WITH_EGRESS … ECS タスクや RDS を配置するプライベートサブネット
     *   （NAT Gateway 経由でインターネットへのアウトバウンド通信が可能）
     */
    this.vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    // VPC ID をコンソールで確認できるよう出力する
    new cdk.CfnOutput(this, "VpcId", {
      value: this.vpc.vpcId,
      description: "ID of the VPC",
    });
  }
}
