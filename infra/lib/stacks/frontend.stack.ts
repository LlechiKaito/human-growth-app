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
 * 前提: cdk deploy 前に apps/web/out が存在すること。
 * `npm -w infra run deploy` (= build:export + cdk deploy --all) で一括実行できる。
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

    // Next.js static export (`output: 'export'` + `trailingSlash: true`) は
    // `out/foo/index.html` を出力するが、CloudFront は OAC 経由で S3 にアクセスする際に
    // ディレクトリインデックスを自動解決しない (S3 website endpoint は別物)。
    // CloudFront Function で URI を `/foo/index.html` に書き換える。
    const rewriteFunction = new cloudfront.Function(this, 'RewriteToIndexHtml', {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var req = event.request;
  var uri = req.uri;
  if (uri.endsWith('/')) {
    req.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    req.uri = uri + '/index.html';
  }
  return req;
}
      `),
    });

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [
          {
            function: rewriteFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
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
    });

    new CfnOutput(this, 'DistributionDomain', {
      value: `https://${this.distribution.distributionDomainName}`,
    });
    new CfnOutput(this, 'WebBucketName', { value: bucket.bucketName });
  }
}
