import { Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import type { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';

interface DatabaseStackProps extends StackProps {
  vpc: ec2.IVpc;
  databaseSecurityGroup: ec2.ISecurityGroup;
}

/**
 * Database Stack
 * RDS PostgreSQL 16, db.t4g.micro, single-AZ, isolated subnet
 * 認証情報は Secrets Manager で管理
 */
export class DatabaseStack extends Stack {
  readonly instance: rds.DatabaseInstance;
  readonly secret: ISecret;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    this.instance = new rds.DatabaseInstance(this, 'Postgres', {
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_13,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      allocatedStorage: 20,
      storageType: rds.StorageType.GP3,
      multiAz: false,
      storageEncrypted: true,
      backupRetention: Duration.days(7),
      deleteAutomatedBackups: true,
      removalPolicy: RemovalPolicy.SNAPSHOT,
      databaseName: 'human_growth',
      credentials: rds.Credentials.fromGeneratedSecret('app_user'),
      securityGroups: [props.databaseSecurityGroup],
      publiclyAccessible: false,
    });

    this.secret = this.instance.secret!;
  }
}
