# Deploy — Human Growth App

> **AI はデプロイコマンドを実行しない方針**。本書は人間がデプロイする際の手順書。

## 構成概要

| スタック名 | 内容 | 月額コスト目安 | 依存 |
|---|---|---|---|
| `human-growth-dev-network` | VPC / Subnet / SG | $0 | なし |
| `human-growth-dev-database` | RDS PostgreSQL t4g.micro + Secrets Manager | ~$18 | network |
| `human-growth-dev-auth` | **Cognito User Pool + Client** | $0 (50k MAU まで無料) | なし |
| `human-growth-dev-ecr` | ECR Repository (`human-growth-api`) | ~$1 | なし |
| `human-growth-dev-compute` | App Runner + VPC Connector | ~$17 | network, database, auth, ecr + **ECR にイメージ必須** |
| `human-growth-dev-frontend` | S3 + CloudFront | ~$2 | compute |
| `human-growth-dev-monitoring` | CloudWatch Dashboard + Alarm | ~$3 | database, compute, frontend |

> **重要**: `compute` は ECR に `:latest` イメージが存在することが create の前提。
> ECR は別スタック (`-ecr`) に切り出してある。**先に ECR をデプロイ → イメージを push → compute をデプロイ** の順を守る。

**全リソースに自動で付与されるタグ** (コスト配賦用):

| タグキー | 値 (例) | 用途 |
|---|---|---|
| `Project` | `human-growth` | プロジェクト単位の合計コスト |
| `Environment` | `dev` / `prod` | 環境別コスト |
| `ManagedBy` | `CDK` | IaC 管理の識別 |
| `Service` | `auth` / `compute` / `database` / `network` / `frontend` / `monitoring` / `container-registry` | サブシステム別の内訳 |

→ Cost Explorer で `Project = human-growth` でフィルタすればこのシステムの月額が一目。
さらに `Service` でブレイクダウンするとどのリソースが食ってるか分かる。

---

## 前提条件 (初回のみ)

```
aws sts get-caller-identity
npm i -g aws-cdk@^2.165
cd infra && npx cdk bootstrap aws://<ACCOUNT_ID>/ap-northeast-1
```

`<ACCOUNT_ID>` は `aws sts get-caller-identity --query Account --output text` で取得。

---

## デプロイ手順 (3フェーズ)

### Phase 1: イメージ非依存のスタックを先に全部デプロイ

```
cd infra
npx cdk diff
npx cdk deploy human-growth-dev-network human-growth-dev-database human-growth-dev-auth human-growth-dev-ecr --require-approval broadening
```

所要時間: ~10分 (RDS が一番遅い)。

### Phase 2: API イメージをビルドして ECR に push

```
# ECR URI を取得
ECR_URI=$(aws cloudformation describe-stacks --stack-name human-growth-dev-ecr \
  --query 'Stacks[0].Outputs[?OutputKey==`EcrRepositoryUri`].OutputValue' --output text)
echo $ECR_URI
# 例: 123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/human-growth-api

# ECR にログイン
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin "${ECR_URI%/*}"

# Multi-arch (M1 Mac から amd64 へ) ビルド + push
cd ..  # human-growth-app ルートに戻る
docker buildx build --platform linux/amd64 -f docker/api.Dockerfile --target prod -t "$ECR_URI:latest" --push .
```

### Phase 3: 残りのスタック (compute + frontend + monitoring) をデプロイ

```
cd infra
npx cdk deploy human-growth-dev-compute human-growth-dev-frontend human-growth-dev-monitoring --require-approval broadening
```

App Runner は **ECR に push されたイメージを使ってサービス作成 → ヘルスチェック (`/api/health`) 待ち** で完了。所要時間 ~5分。

### Phase 0: RDS マイグレーション (Phase 3 と並行 OR 後)

App Runner が起動すると RDS に接続を試みる。マイグレーション未実施だと `/api/health` は通っても認証関連の操作で 500 になる。

RDS は private subnet にいるため、以下のいずれかで初回マイグレーション:

**手段 A: 一時的に踏み台 EC2 / Session Manager で実行**

**手段 B: ローカルから AWS Systems Manager Session Manager Port Forward**
```
aws ssm start-session --target <bastion-instance-id> \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["<rds-endpoint>"],"portNumber":["5432"],"localPortNumber":["15432"]}'

# 別ターミナルで
DATABASE_URL=postgresql://app_user:<pw>@localhost:15432/human_growth \
  npm -w @human-growth/api exec -- prisma migrate deploy
```

**手段 C: ECS RunTask で 1回限りのマイグレーションタスクを流す** (推奨だが構築コスト中)

POC では手段 A or B が現実的。`<pw>` は Secrets Manager から取得 (人間が `aws secretsmanager get-secret-value` で取り出す)。

---

## デプロイ後に取得すべき値

```
# Cognito (Web から使う)
aws cloudformation describe-stacks --stack-name human-growth-dev-auth \
  --query 'Stacks[0].Outputs' --output table

# → UserPoolId / UserPoolClientId

# App Runner URL
aws cloudformation describe-stacks --stack-name human-growth-dev-compute \
  --query 'Stacks[0].Outputs' --output table

# → ApiServiceUrl: https://xxxxxxx.ap-northeast-1.awsapprunner.com

# CloudFront
aws cloudformation describe-stacks --stack-name human-growth-dev-frontend \
  --query 'Stacks[0].Outputs' --output table

# → DistributionDomain / WebBucketName
```

---

## デプロイ済み Cognito をローカル開発で使う

`.env` を編集:
```
AUTH_PROVIDER=cognito
COGNITO_USER_POOL_ID=ap-northeast-1_XXXXXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=ap-northeast-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1
```

```
docker compose up -d --build
```

> ⚠️ **現状の制約**: API の `CognitoAuthProvider.signup/login` は throw する。
> Web 側に `amazon-cognito-identity-js` 連携を実装するまで、`AUTH_PROVIDER=cognito` でも
> 実際の signup/login フローは通らない。Cognito 統合の Web SDK 実装は次フェーズ。
> JWT 検証 (`verify`) は実装済みなので、AWS コンソール / CLI で発行したトークンで `/api/auth/me` を叩く検証は可能。

---

## フロントエンドの配信 (frontend デプロイ後)

```
cd apps/web
NEXT_OUTPUT=export NEXT_PUBLIC_API_BASE_URL=https://<DistributionDomain> npm run build

aws s3 sync out s3://<WebBucketName>/ --delete
aws cloudfront create-invalidation --distribution-id <DistributionId> --paths "/*"
```

`<DistributionId>` は CloudFront コンソール or:
```
aws cloudformation describe-stacks --stack-name human-growth-dev-frontend \
  --query "Stacks[0].StackResources[?ResourceType=='AWS::CloudFront::Distribution'].PhysicalResourceId" --output text
```

---

## イメージ更新 (Phase 2 を再実行)

App Runner は `autoDeploymentsEnabled: true` なので、新しい `:latest` を push すれば自動で再デプロイ:

```
docker buildx build --platform linux/amd64 -f docker/api.Dockerfile --target prod -t "$ECR_URI:latest" --push .
# App Runner コンソールで OPERATION_IN_PROGRESS → RUNNING を確認
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

事前作業: Billing コンソール → **Cost allocation tags** で `Project` / `Service` をアクティブ化 (24h 後反映)。

---

## ロールバック

```
git checkout <previous-commit> -- infra
cd infra && npx cdk diff && npx cdk deploy --all
```

App Runner / ECR は **ECR の前のタグに切り替え** が即対応 (ECR コンソール → image tag を `latest` に付け替え)。

---

## 削除 (環境ごと撤去)

```
cd infra
npx cdk destroy --all
```

- **RDS は `removalPolicy: SNAPSHOT`**: 削除前にスナップショット自動作成 → 手動削除必要
- **S3 / Cognito**: `removalPolicy: DESTROY` なので即削除
- **ECR**: イメージごと削除

```
# RDS スナップショット削除
aws rds describe-db-snapshots --snapshot-type manual
aws rds delete-db-snapshot --db-snapshot-identifier <snapshot-id>
```

---

## トラブルシューティング

| 症状 | 確認箇所 |
|---|---|
| `cdk deploy` が `Resource handler returned message: ...` | CloudFormation コンソールでイベント詳細 |
| compute デプロイで `Image not found` | Phase 2 (ECR push) を完了してから再実行 |
| App Runner が `CREATE_FAILED` | CloudWatch Logs `/aws/apprunner/<service>/.../application` |
| App Runner → RDS 接続失敗 | VPC Connector SG / RDS SG / Secrets Manager 値 / マイグレーション未実施 |
| CloudFront 5xx | App Runner サービス URL / Custom Origin HTTPS only |
| Cognito ログイン失敗 | UserPoolId / ClientId / Region 一致、Web SDK 連携実装の有無 |
| タグが Cost Explorer に出ない | Billing → Cost allocation tags でアクティブ化、24h 待機 |

---

## チェックリスト

- [ ] `npx cdk synth` がエラーなく完了する
- [ ] `aws sts get-caller-identity` が想定アカウント
- [ ] CDK Bootstrap 済み
- [ ] `npx cdk diff` で意図した差分のみが出る
- [ ] Phase 1 (network/database/auth/ecr) デプロイ成功
- [ ] Phase 2 (ECR push) 完了 (`aws ecr describe-images --repository-name human-growth-api`)
- [ ] Phase 3 (compute/frontend/monitoring) デプロイ成功
- [ ] `/api/health` が 200 を返す
- [ ] タグ4種類 (`Project / Environment / ManagedBy / Service`) 付与確認
