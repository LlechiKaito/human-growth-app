import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import type { Construct } from 'constructs';

/**
 * ECR Stack
 * App Runner にデプロイする API イメージのレジストリ
 * compute スタックよりも先にデプロイし、最初のイメージを push してから compute をデプロイする
 */
export class EcrStack extends Stack {
  readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.repository = new ecr.Repository(this, 'ApiRepository', {
      repositoryName: 'human-growth-api',
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 10 }],
    });

    new CfnOutput(this, 'EcrRepositoryUri', { value: this.repository.repositoryUri });
    new CfnOutput(this, 'EcrRepositoryName', { value: this.repository.repositoryName });
  }
}
