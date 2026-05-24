import { CfnOutput, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';

/**
 * Documents Stack
 * クエストに添付する書類用の private S3 バケット。
 * App Runner instance role への権限付与は compute.stack 側で行う。
 */
export class DocumentsStack extends Stack {
  readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.bucket = new s3.Bucket(this, 'DocumentsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      // CORS は API proxy 方式なので不要 (ブラウザは S3 に直接 PUT しない)。
      // 将来 presigned URL に切替えるなら CORS を許可する必要あり。
    });

    new CfnOutput(this, 'DocumentsBucketName', { value: this.bucket.bucketName });
  }
}
