import * as path from 'node:path';

import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import type { Construct } from 'constructs';

interface FrontendStackProps extends StackProps {
  apiServiceUrl: string;
}

/**
 * Frontend Stack
 * S3 (静的 Next.js) + CloudFront + BucketDeployment (cdk deploy で apps/web/out を S3 sync)
 * /* → S3 / /api/* → App Runner
 *
 * 前提: cdk deploy 前に `cd apps/web && NEXT_OUTPUT=export NEXT_PUBLIC_API_BASE_URL='' npm run build`
 * を実行して apps/web/out/ が存在すること。プロジェクトルートの `npm run release` で一括実行可能。
 */
export class FrontendStack extends Stack {
  readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'WebBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const apiHost = props.apiServiceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(apiHost, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
    });

    // apps/web/out (Next.js 静的書き出し) を S3 にアップロード + CloudFront 無効化を自動化
    const webOutDir = path.join(__dirname, '..', '..', '..', 'apps', 'web', 'out');
    new s3deploy.BucketDeployment(this, 'WebContent', {
      sources: [s3deploy.Source.asset(webOutDir)],
      destinationBucket: bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
      // dev のサイズはせいぜい数 MB なので default memory で足りる
    });

    new CfnOutput(this, 'DistributionDomain', {
      value: `https://${this.distribution.distributionDomainName}`,
    });
    new CfnOutput(this, 'WebBucketName', { value: bucket.bucketName });
  }
}
