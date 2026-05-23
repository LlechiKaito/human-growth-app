import * as path from 'node:path';

import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import * as apprunner from 'aws-cdk-lib/aws-apprunner';
import type * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';

interface ComputeStackProps extends StackProps {
  vpc: ec2.IVpc;
  dbSecret: ISecret;
  appRunnerSecurityGroup: ec2.ISecurityGroup;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
}

/**
 * Compute Stack
 * App Runner + VPC Connector + Docker Image Asset
 * cdk deploy 時に api.Dockerfile をビルドして cdk-staging ECR に push、
 * そのイメージで App Runner Service を作成する (1コマンドで完結)
 */
export class ComputeStack extends Stack {
  readonly service: apprunner.CfnService;
  readonly serviceUrl: string;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    // Docker image: cdk deploy 時に自動ビルド & cdk-staging ECR に push
    const apiImage = new DockerImageAsset(this, 'ApiImage', {
      directory: path.join(__dirname, '..', '..', '..'), // monorepo root
      file: 'docker/api.Dockerfile',
      target: 'prod',
      platform: Platform.LINUX_AMD64,
    });

    const vpcConnector = new apprunner.CfnVpcConnector(this, 'VpcConnector', {
      vpcConnectorName: 'human-growth-vpc-connector',
      subnets: props.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED })
        .subnetIds,
      securityGroups: [props.appRunnerSecurityGroup.securityGroupId],
    });

    const accessRole = new iam.Role(this, 'AppRunnerAccessRole', {
      assumedBy: new iam.ServicePrincipal('build.apprunner.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSAppRunnerServicePolicyForECRAccess',
        ),
      ],
    });
    apiImage.repository.grantPull(accessRole);

    const instanceRole = new iam.Role(this, 'AppRunnerInstanceRole', {
      assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com'),
    });
    props.dbSecret.grantRead(instanceRole);

    this.service = new apprunner.CfnService(this, 'ApiService', {
      serviceName: 'human-growth-api',
      sourceConfiguration: {
        autoDeploymentsEnabled: false, // CDK が image asset 更新時にデプロイをドライブする
        authenticationConfiguration: { accessRoleArn: accessRole.roleArn },
        imageRepository: {
          imageRepositoryType: 'ECR',
          imageIdentifier: apiImage.imageUri,
          imageConfiguration: {
            port: '8080',
            runtimeEnvironmentVariables: [
              { name: 'NODE_ENV', value: 'production' },
              { name: 'API_PORT', value: '8080' },
              { name: 'API_LOG_LEVEL', value: 'info' },
              // POC では '*'。本番では CloudFront のドメイン (frontend デプロイ後) に絞る。
              { name: 'API_CORS_ORIGIN', value: '*' },
              { name: 'AUTH_PROVIDER', value: 'cognito' },
              { name: 'COGNITO_USER_POOL_ID', value: props.userPool.userPoolId },
              { name: 'COGNITO_CLIENT_ID', value: props.userPoolClient.userPoolClientId },
              { name: 'COGNITO_REGION', value: this.region },
            ],
            runtimeEnvironmentSecrets: [
              { name: 'DATABASE_URL', value: props.dbSecret.secretArn },
            ],
          },
        },
      },
      instanceConfiguration: {
        cpu: '0.25 vCPU',
        memory: '0.5 GB',
        instanceRoleArn: instanceRole.roleArn,
      },
      networkConfiguration: {
        egressConfiguration: {
          egressType: 'VPC',
          vpcConnectorArn: vpcConnector.attrVpcConnectorArn,
        },
      },
      healthCheckConfiguration: {
        protocol: 'HTTP',
        path: '/api/health',
        interval: 10,
        timeout: 5,
        healthyThreshold: 1,
        unhealthyThreshold: 5,
      },
    });

    this.serviceUrl = `https://${this.service.attrServiceUrl}`;

    new CfnOutput(this, 'ApiServiceUrl', { value: this.serviceUrl });
    new CfnOutput(this, 'ApiImageUri', { value: apiImage.imageUri });
  }
}
