import { Stack, type StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import type { Construct } from 'constructs';

/**
 * Network Stack (POC コスト最適化版)
 *
 * 構成:
 * - public subnet のみ (NAT/VPC Endpoint 不使用 → コスト $0)
 * - RDS は public subnet 配置 + publiclyAccessible:true (database.stack 側で設定)
 * - App Runner は VPC Connector を使わない (egressType=DEFAULT) → AWS マネージドネットから直接 Cognito へ
 *
 * 本番運用ではここを以下に変更する想定:
 * - private isolated subnet + RDS は private のまま
 * - App Runner VPC Connector + VPC Endpoint for cognito-idp (~$15/月)
 */
export class NetworkStack extends Stack {
  readonly vpc: ec2.IVpc;
  readonly databaseSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // POC 用: 全インターネットから RDS への接続を許可。
    // 実運用では特定の IP / セキュリティグループに絞ること。
    this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSg', {
      vpc: this.vpc,
      description: 'POC: allow PostgreSQL from internet (App Runner is on managed network)',
      allowAllOutbound: false,
    });

    this.databaseSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      'POC: allow from any IPv4 (relies on SSL + strong password)',
    );
  }
}
