import * as path from 'node:path';

import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import * as apprunner from 'aws-cdk-lib/aws-apprunner';
import type * as cognito from 'aws-cdk-lib/aws-cognito';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';

interface ComputeStackProps extends StackProps {
  dbSecret: ISecret;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
}

/**
 * Compute Stack (POC: VPC Connector 不使用、egress=DEFAULT)
 *
 * App Runner は AWS マネージドネットから直接 Cognito / RDS (public) に到達。
 * 本番ではこの構成を VPC Connector + VPC Endpoint に切り替えるべき。
 */
export class ComputeStack extends Stack {
  readonly service: apprunner.CfnService;
  readonly serviceUrl: string;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    // Docker image: cdk deploy 時に自動ビルド & cdk-staging ECR に push
    const apiImage = new DockerImageAsset(this, 'ApiImage', {
      directory: path.join(__dirname, '..', '..', '..'),
      file: 'docker/api.Dockerfile',
      target: 'prod',
      platform: Platform.LINUX_AMD64,
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

    // Cognito 管理者API 利用権限 (signup / login で AdminCreateUser / AdminInitiateAuth を叩く)
    instanceRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'cognito-idp:AdminCreateUser',
          'cognito-idp:AdminSetUserPassword',
          'cognito-idp:AdminInitiateAuth',
          'cognito-idp:AdminGetUser',
        ],
        resources: [props.userPool.userPoolArn],
      }),
    );

    this.service = new apprunner.CfnService(this, 'ApiService', {
      serviceName: 'human-growth-api',
      sourceConfiguration: {
        autoDeploymentsEnabled: false,
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
              // POC では '*'。本番では CloudFront のドメインに絞る。
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
      // networkConfiguration を指定しない → egressType=DEFAULT (AWS マネージドネット)
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
