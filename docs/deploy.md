# Deploy — Human Growth App

> **AI はデプロイコマンドを実行しない方針**。本書は人間がデプロイする際の手順書。

## 構成概要

| スタック名 | 内容 | 月額コスト目安 | 依存 |
|---|---|---|---|
| `human-growth-dev-network` | VPC / Subnet / SG | $0 | なし |
| `human-growth-dev-database` | RDS PostgreSQL t4g.micro + Secrets Manager | ~$18 | network |
| `human-growth-dev-auth` | **Cognito User Pool + Client** | $0 (50k MAU まで無料) | なし |
| `human-growth-dev-compute` | ECR + App Runner + VPC Connector | ~$17 | network, database, auth |
| `human-growth-dev-frontend` | S3 + CloudFront | ~$2 | compute |
| `human-growth-dev-monitoring` | CloudWatch Dashboard + Alarm | ~$3 | database, compute, frontend |

**全リソースに自動で付与されるタグ** (コスト配賦用):

| タグキー | 値 (例) | 用途 |
|---|---|---|
| `Project` | `human-growth` | プロジェクト単位の合計コスト |
| `Environment` | `dev` / `prod` | 環境別コスト |
| `ManagedBy` | `CDK` | IaC 管理の識別 |
| `Service` | `auth` / `compute` / `database` 等 | サブシステム別の内訳 |

→ Cost Explorer で `Project = human-growth` でフィルタすればこのシステムの月額が一目。
さらに `Service` でブレイクダウンするとどのリソースが食ってるか分かる。

---

## 前提条件 (初回のみ)

```
# 1. AWS CLI が設定済み
aws sts get-caller-identity

# 2. CDK CLI (グローバル or npx で OK)
npm i -g aws-cdk@^2.165
# or 各コマンドに npx を付ける

# 3. CDK Bootstrap (アカウント x リージョンで1度だけ)
cd infra && npx cdk bootstrap aws://<ACCOUNT_ID>/ap-northeast-1
```

`<ACCOUNT_ID>` は `aws sts get-caller-identity --query Account --output text` で取得。

---

## Cognito だけ先にデプロイ (推奨スタート)

Cognito は他のリソースに依存しないので、まず単独でデプロイして動作確認するのが安全。

```
cd infra
npx cdk diff human-growth-dev-auth
npx cdk deploy human-growth-dev-auth
```

### 出力される情報

デプロイ完了時にこんな表示が出る:

```
Outputs:
human-growth-dev-auth.UserPoolId = ap-northeast-1_XXXXXXXXX
human-growth-dev-auth.UserPoolClientId = xxxxxxxxxxxxxxxxxxxxxxxxxx
```

または後から取得:
```
aws cloudformation describe-stacks --stack-name human-growth-dev-auth --query 'Stacks[0].Outputs' --output table
```

### タグの確認

```
aws cognito-idp list-tags-for-resource \
  --resource-arn arn:aws:cognito-idp:ap-northeast-1:<ACCOUNT_ID>:userpool/<UserPoolId>
```

→ `Project`, `Environment`, `ManagedBy`, `Service` の4タグが付いているはず。

### コンソールで確認

AWS マネジメントコンソール → Cognito → User Pools → `human-growth-users` を開く。
タブから「Users」「App integration」「Sign-in experience」を見られる。

---

## 全スタック一括デプロイ

Cognito だけで満足したら、他もまとめてデプロイ:

```
cd infra
npx cdk diff
npx cdk deploy --all --require-approval broadening
```

依存順 (`network` → `database` / `auth` → `compute` → `frontend` → `monitoring`) で自動的に進行。
所要時間: RDS が一番遅い (~10分)。全体で 15〜20 分。

### デプロイ後の主な Output

```
aws cloudformation describe-stacks \
  --stack-name human-growth-dev-compute \
  --query 'Stacks[0].Outputs'
# → ApiServiceUrl: https://xxxxxxx.ap-northeast-1.awsapprunner.com
# → EcrRepositoryUri: <ACCOUNT_ID>.dkr.ecr.ap-northeast-1.amazonaws.com/human-growth-api

aws cloudformation describe-stacks \
  --stack-name human-growth-dev-frontend \
  --query 'Stacks[0].Outputs'
# → DistributionDomain: https://xxxxxxx.cloudfront.net
# → WebBucketName: human-growth-dev-frontend-webbucket-xxxx
```

---

## ローカル環境を、デプロイした Cognito につなぐ

デプロイした Cognito を使ってログイン動作確認したい場合:

```
# .env を編集
AUTH_PROVIDER=cognito
COGNITO_USER_POOL_ID=ap-northeast-1_XXXXXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=ap-northeast-1

# web 側 (build 時に必要)
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1

# 再起動
docker compose up -d --build
```

> ⚠️ **現状の制約**: API の `CognitoAuthProvider.signup/login` は throw する。
> Web 側に `amazon-cognito-identity-js` 連携を実装するまで、`AUTH_PROVIDER=cognito` でも
> 実際の signup/login フローは通らない。Cognito 統合の Web SDK 実装は次フェーズの作業。

---

## API イメージのデプロイ (compute デプロイ後)

App Runner は ECR にイメージが push されたら **自動デプロイ** が走る (`autoDeploymentsEnabled: true`)。

```
# ECR ログイン
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-northeast-1.amazonaws.com

# Multi-arch (M1 Mac から amd64 へ) ビルド + push
docker buildx build \
  --platform linux/amd64 \
  -f docker/api.Dockerfile \
  --target prod \
  -t <ACCOUNT_ID>.dkr.ecr.ap-northeast-1.amazonaws.com/human-growth-api:latest \
  --push .

# App Runner の状態を確認
aws apprunner list-services
aws apprunner describe-service --service-arn <ServiceArn>
```

### 初回のみ: マイグレーション

App Runner で API が起動する前に RDS のスキーマを作る必要がある。
本番は CI でマイグレーションを流す想定。手動でやる場合:

```
# RDS のエンドポイントを取得
aws rds describe-db-instances \
  --query 'DBInstances[?DBInstanceIdentifier==`<InstanceId>`].Endpoint.Address' --output text

# Secrets Manager から認証情報を取得 (※ AI は実行禁止、人間が)
# DATABASE_URL を組み立てて Prisma migrate
DATABASE_URL=postgresql://app_user:<pass>@<endpoint>:5432/human_growth \
  npm -w @human-growth/api exec -- prisma migrate deploy
```

ただし RDS は private subnet にあるので **VPN / Session Manager / 踏み台ホスト経由** が必要。
カジュアルな手段としては、一時的に App Runner にマイグレーション専用エンドポイントを設けるか、
ECS RunTask で一発走らせるのが綺麗。POC では `prisma db push` を CI で流す想定。

---

## フロントエンドのデプロイ (frontend デプロイ後)

```
# Next.js を静的書き出し
cd apps/web
NEXT_OUTPUT=export NEXT_PUBLIC_API_BASE_URL=https://<DistributionDomain> npm run build

# S3 に sync
aws s3 sync out s3://<WebBucketName>/ --delete

# CloudFront キャッシュ無効化
aws cloudfront create-invalidation \
  --distribution-id <DistributionId> --paths "/*"
```

`<DistributionId>` は CloudFront コンソール or:
```
aws cloudformation describe-stacks --stack-name human-growth-dev-frontend \
  --query 'Stacks[0].Resources[?ResourceType==`AWS::CloudFront::Distribution`].PhysicalResourceId'
```

---

## コスト確認

デプロイ完了後 24h 以降、Cost Explorer で:

```
aws ce get-cost-and-usage \
  --time-period Start=2026-05-01,End=2026-06-01 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=TAG,Key=Project
```

または Cost Allocation Tags を有効化 (Billing コンソール → Cost allocation tags) して、
`Project` と `Service` をアクティブ化すれば Cost Explorer 上で正規にフィルタ可能。

> Cost Allocation Tags のアクティブ化は **24h 経たないと過去データには反映されない** 仕様。

---

## ロールバック

```
# 直前の CloudFormation バージョンに戻す (CDK で前のコミットに戻して再デプロイ)
git checkout <previous-commit> -- infra
cd infra && npx cdk diff && npx cdk deploy --all

# 特定スタックだけ巻き戻し
npx cdk deploy human-growth-dev-compute
```

App Runner / ECR は ECR の前のタグに切り替えれば即ロールバック可。

---

## 削除 (環境ごと撤去)

```
cd infra
npx cdk destroy --all
```

**RDS は `removalPolicy: SNAPSHOT`** にしてあるので、削除前にスナップショットが自動作成される。
このスナップショットは別途課金されるため、不要なら手動削除:

```
aws rds describe-db-snapshots --snapshot-type manual
aws rds delete-db-snapshot --db-snapshot-identifier <snapshot-id>
```

S3 バケットは `autoDeleteObjects: true` で中身ごと消える。

---

## トラブルシューティング

| 症状 | 確認箇所 |
|---|---|
| `cdk deploy` が `Resource handler returned message: ...` | CloudFormation コンソールでイベント詳細 |
| App Runner が `OPERATION_IN_PROGRESS` のまま | CloudWatch Logs `/aws/apprunner/<service>/.../application` |
| App Runner → RDS 接続失敗 | VPC Connector の Security Group / RDS の SG / Secrets Manager のシークレット値 |
| CloudFront 5xx | App Runner サービス URL / カスタムオリジン HTTPS only / ALLOW_ALL メソッド |
| Cognito ログイン失敗 | User Pool ID / Client ID / Region 一致確認、Web SDK 連携実装の有無 |
| タグが Cost Explorer に出ない | Billing → Cost allocation tags でアクティブ化、24h 待機 |

---

## チェックリスト (デプロイ前)

- [ ] `npx cdk synth` がエラーなく完了する (CI でも検証)
- [ ] `aws sts get-caller-identity` が想定アカウント
- [ ] CDK Bootstrap 済み (`cdk bootstrap aws://...`)
- [ ] `npx cdk diff` で意図した差分のみが出る
- [ ] dev 環境であれば `removalPolicy: DESTROY/SNAPSHOT` になっている
- [ ] タグが `Project / Environment / ManagedBy / Service` の4つ付いている (`cdk synth` で確認可)
