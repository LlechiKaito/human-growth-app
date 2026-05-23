# Deploy

> AI はデプロイコマンドを実行しない。本書は人間がデプロイする際の手順書。

## 前提条件

- AWS CLI が設定済み (`aws sts get-caller-identity` が通る)
- AWS CDK CLI: `npm i -g aws-cdk@^2.165` または `npx cdk` を利用
- AWS CDK Bootstrap が実行済み: `npx cdk bootstrap`
- リージョン: `ap-northeast-1` (東京) 推奨

## SSM パラメータ / Secrets の事前設定

POC では自動生成で済む(Cognito / RDS Secrets Manager)。
本番運用時は以下を **ユーザーが** 設定:

| パラメータ | 用途 |
|---|---|
| `/human-growth/<env>/cognito/saml-metadata-url` | 企業SSO 連携時 (将来) |
| `/human-growth/<env>/route53/hosted-zone-id` | 独自ドメイン適用時 |
| `/human-growth/<env>/cloudfront/acm-cert-arn` | us-east-1 の証明書 ARN |

設定例 (人間が実行):
```
aws ssm put-parameter --name /human-growth/dev/route53/hosted-zone-id --value Z1XXXXX --type String
```

## デプロイ手順

### 1. 差分確認

```
cd infra && npx cdk diff
```

### 2. 全スタック一括デプロイ

```
cd infra && npx cdk deploy --all --require-approval broadening
```

スタック順序: `network` → `database` / `auth` → `compute` → `frontend` → `monitoring`

### 3. デプロイ後の確認

```
# App Runner サービス URL を取得
aws cloudformation describe-stacks --stack-name human-growth-dev-compute --query 'Stacks[0].Outputs'

# CloudFront ドメインを取得
aws cloudformation describe-stacks --stack-name human-growth-dev-frontend --query 'Stacks[0].Outputs'

# 動作確認 (5〜10分後)
curl https://<APP_RUNNER_URL>/api/health
curl https://<CLOUDFRONT_DOMAIN>/
```

### 4. フロントエンドのデプロイ (静的書き出し → S3)

```
# Next.js を静的書き出し
cd apps/web && npm run build

# S3 に sync
aws s3 sync apps/web/out s3://<WEB_BUCKET_NAME>/ --delete

# CloudFront キャッシュ無効化
aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*"
```

### 5. API イメージのデプロイ (ECR → App Runner 自動デプロイ)

```
# ECR ログイン
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin <ECR_URI>

# イメージビルド + push
docker buildx build --platform linux/amd64 -f docker/api.Dockerfile -t <ECR_URI>:latest --target prod . --push
```

App Runner は ECR push で **自動デプロイ** が走る (`autoDeploymentsEnabled: true`)。

## 環境戦略

POC は dev 環境のみ。本番化時に以下を追加:

```typescript
// infra/bin/app.ts に prod スタック追加
new NetworkStack(app, 'human-growth-prod-network', { env: prodEnv });
// ... 各スタックを prod 用に複製
```

| 設定 | dev | prod |
|---|---|---|
| App Runner CPU/RAM | 0.25/0.5 | 1/2 |
| RDS インスタンス | t4g.micro | t4g.medium |
| RDS Multi-AZ | false | true |
| `removalPolicy` | DESTROY | RETAIN |
| ログ保持 | 7 日 | 90 日 |
| アラーム | 最小限 | 包括的 |
| ドメイン | dev.example.com | example.com |

## ロールバック

App Runner / ECS は前のイメージタグへ再デプロイ。
RDS / Cognito の変更は CloudFormation のロールバック (`aws cloudformation rollback-stack`)。
CloudFront は前のオリジン設定にスタックを戻す。

## トラブルシューティング

| 症状 | 確認 |
|---|---|
| App Runner が起動しない | CloudWatch Logs `/aws/apprunner/...` |
| RDS 接続エラー | Security Group / VPC Connector / Secrets Manager の値 |
| CloudFront 5xx | App Runner の URL が正しいか / WAF ルール |
| Cognito ログイン失敗 | User Pool / Client ID / Region の一致 |

## 削除

```
# 全スタック削除 (人間が実行)
cd infra && npx cdk destroy --all
```

RDS は `removalPolicy: SNAPSHOT` のため、削除前にスナップショットが作成される。
