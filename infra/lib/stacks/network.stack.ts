import { Stack, type StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import type { Construct } from 'constructs';

/**
 * Network Stack
 * VPC (2 AZ, public + isolated)、Security Group
 * NAT Gateway なし — App Runner からのアウトバウンドは AWS マネージドネットワーク
 * RDS のみ isolated subnet に配置
 */
export class NetworkStack extends Stack {
  readonly vpc: ec2.IVpc;
  readonly databaseSecurityGroup: ec2.SecurityGroup;
  readonly appRunnerSecurityGroup: ec2.SecurityGroup;

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
        {
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    this.appRunnerSecurityGroup = new ec2.SecurityGroup(this, 'AppRunnerSg', {
      vpc: this.vpc,
      description: 'App Runner egress to RDS',
      allowAllOutbound: true,
    });

    this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSg', {
      vpc: this.vpc,
      description: 'Security group for RDS PostgreSQL',
      allowAllOutbound: false,
    });

    this.databaseSecurityGroup.addIngressRule(
      this.appRunnerSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow App Runner to connect to RDS',
    );
  }
}
