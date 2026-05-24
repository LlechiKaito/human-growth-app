# Deploy — Human Growth App

> **AI はデプロイコマンドを実行しない方針**。本書は人間がデプロイする際の手順書。

## 構成概要

| スタック名 | 内容 | 月額コスト目安 |
|---|---|---|
| `human-growth-dev-network` | VPC / Subnet / SG | $0 |
| `human-growth-dev-database` | RDS PostgreSQL 16.13 t4g.micro + Secrets Manager | ~$18 |
| `human-growth-dev-auth` | Cognito User Pool + Client | $0 (50k MAU まで無料) |
| `human-growth-dev-compute` | App Runner + VPC Connector + **Docker Image (CDK Asset)** | ~$17 |
| `human-growth-dev-frontend` | S3 + CloudFront | ~$2 |
| `human-growth-dev-monitoring` | CloudWatch Dashboard + Alarm | ~$3 |

> **DockerImageAsset 採用**: `cdk deploy` 時に `docker/api.Dockerfile` をビルドして cdk-staging ECR に
> push し、その image URI で App Runner を作成する。**ECR 別スタック・別手順は不要**で 1 コマンドで完結。
> イメージのバージョン管理 (タグ) は CDK のコンテンツハッシュベース。

**全リソースに付与されるタグ** (コスト配賦):

| キー | 値 | 用途 |
|---|---|---|
| `Project` | `human-growth` | プロジェクト合計コスト |
| `Environment` | `dev` / `prod` | 環境別コスト |
| `ManagedBy` | `CDK` | IaC 管理識別 |
| `Service` | `auth` / `compute` / `database` / `frontend` / `network` / `monitoring` | サブシステム別 |

---

## 前提条件 (初回のみ)

```
aws sts get-caller-identity
npm i -g aws-cdk@^2.165
cd infra && npx cdk bootstrap aws://<ACCOUNT_ID>/ap-northeast-1
```

`<ACCOUNT_ID>` は `aws sts get-caller-identity --query Account --output text`。

ローカルマシン側の要件:
- Docker (buildx 有効、デフォルトで OK)
- Apple Silicon Mac → `linux/amd64` ビルドが要るので Docker Desktop or colima

---

## 1コマンド全デプロイ

```
cd infra
npx cdk deploy --all --require-approval broadening
```

CDK が以下を自動で行う:
1. 必要な順序で全 6 スタックをデプロイ
2. `compute` スタックで `docker/api.Dockerfile` をビルド (`linux/amd64`, `target: prod`)
3. cdk-staging ECR に push
4. その image URI で App Runner Service を作成

**所要時間**: 約 **15〜25 分** (RDS が一番遅い ~10分、App Runner が ~5分)。

---

## デプロイ後に取得する値

```
# Cognito (Web SDK から使う場合に必要)
aws cloudformation describe-stacks --stack-name human-growth-dev-auth \
  --query 'Stacks[0].Outputs' --output table

# App Runner URL
aws cloudformation describe-stacks --stack-name human-growth-dev-compute \
  --query 'Stacks[0].Outputs' --output table

# CloudFront
aws cloudformation describe-stacks --stack-name human-growth-dev-frontend \
  --query 'Stacks[0].Outputs' --output table
```

---

## 既存スタックの全削除 (やり直したい時)

```
cd infra
npx cdk destroy --all --force
```

`ROLLBACK_COMPLETE` 状態のスタックは CDK が削除できない事があるので、その場合のみ手動:

```
aws cloudformation delete-stack --stack-name human-growth-dev-database
aws cloudformation wait stack-delete-complete --stack-name human-growth-dev-database
```

> **RDS は `removalPolicy: SNAPSHOT`** → 削除前にスナップショットが自動生成される。不要なら別途削除:
> ```
> aws rds describe-db-snapshots --snapshot-type manual
> aws rds delete-db-snapshot --db-snapshot-identifier <snapshot-id>
> ```

その後 `cdk deploy --all` で再構築。

---

## 初期管理者ユーザーを追加する

デプロイ後、Cognito User Pool に `admins` グループ が作成される。
管理画面 (`/admin/*`) にアクセスできるのは、このグループに属するユーザーのみ。

### 手順

```bash
# 1. UserPoolId を取得
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name human-growth-dev-auth \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
echo $USER_POOL_ID

# 2. (まだなら) アプリで普通に signup してユーザーを作る
#    → ブラウザで https://<CloudFront>/signup から登録

# 3. そのユーザーを admins グループに追加
aws cognito-idp admin-add-user-to-group \
  --user-pool-id "$USER_POOL_ID" \
  --username "admin@your-domain.example" \
  --group-name admins

# 4. ブラウザで一度ログアウト → 再ログイン (新しい JWT に cognito:groups が乗る)
#    → ヘッダーに「管理 (クエスト)」リンクが出る
```

> JWT は ID トークンの中に `cognito:groups` クレームを含む。グループ追加後は **必ず再ログイン** して新しいトークンを取得する必要がある(既存トークンは古いまま)。

### グループから外す

```bash
aws cognito-idp admin-remove-user-from-group \
  --user-pool-id "$USER_POOL_ID" \
  --username "admin@your-domain.example" \
  --group-name admins
```

### ローカル開発で admin テスト

`.env` または `docker-compose.yml` の api 環境変数に `ADMIN_EMAILS` を設定:

```bash
ADMIN_EMAILS=admin@example.com,boss@example.com
```

LocalAuthProvider はこのリストにマッチするメールアドレスでログインしたユーザーに `admins` グループを付与する。

---

## RDS マイグレーション (初回デプロイ後)

App Runner 起動時点では RDS にスキーマが無い。`/api/auth/signup` 等で 500 になる前にマイグレーションが必要。
RDS は private subnet なので以下のいずれか:

**手段 A: SSM Port Forward (推奨, 踏み台不要)**

`ec2:*` `ssm:*` 権限のある IAM ユーザー + Session Manager 経由で一時的にポートフォワード。
踏み台 EC2 を一時的に立てる必要あり (削除すれば良い)。

**手段 B: ECS RunTask で 1回限りのマイグレーションタスク**

CDK 化すれば綺麗だが構築コストあり。POC スコープ外。

**手段 C: 一時的に RDS を public にしてローカルから流す (非推奨, セキュリティ良くない)**

POC でやるなら、CDK の database.stack.ts で `publiclyAccessible: true` + Security Group の ingress 開放 → マイグレーション → 戻す。

→ **POC では手段 A が無難**。手順詳細は本 PR の Untested 領域として残す。

---

## イメージ更新

API のコードを変更したら:

```
cd infra
npx cdk deploy human-growth-dev-compute
```

CDK が変更を検知して再ビルド → cdk-staging に push → App Runner を新しい image URI で update。

---

## フロントエンド配信

```
cd apps/web
NEXT_OUTPUT=export NEXT_PUBLIC_API_BASE_URL=https://<DistributionDomain> npm run build

aws s3 sync out s3://<WebBucketName>/ --delete
aws cloudfront create-invalidation --distribution-id <DistributionId> --paths "/*"
```

---

## コスト追跡

Billing コンソール → **Cost allocation tags** → `Project` / `Service` を **Active** に (反映に 24h)。

```
aws ce get-cost-and-usage \
  --time-period Start=2026-05-01,End=2026-06-01 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=TAG,Key=Project
```

---

## ロールバック

```
git checkout <previous-commit> -- infra
cd infra && npx cdk diff && npx cdk deploy --all
```

イメージレベルのロールバックなら `git checkout` で前のコミットに戻して `cdk deploy human-growth-dev-compute`。

---

## チェックリスト

- [ ] `npx cdk synth` がエラーなく完了
- [ ] `aws sts get-caller-identity` が想定アカウント
- [ ] CDK Bootstrap 済み
- [ ] Docker buildx 有効 (`docker buildx version`)
- [ ] `npx cdk deploy --all` で 6 スタック全成功
- [ ] `/api/health` が 200 を返す (`curl https://<ApiServiceUrl>/api/health`)
- [ ] タグ4種類 (`Project / Environment / ManagedBy / Service`) 確認

---

## トラブルシューティング

| 症状 | 確認 |
|---|---|
| `Cannot find version 16.x for postgres` | AWS が古いマイナーを EOL。`PostgresEngineVersion.VER_16_13` 等に上げる |
| App Runner が `CREATE_FAILED` | CloudWatch Logs `/aws/apprunner/<service>/.../application` |
| Docker build エラー | `.dockerignore` の更新ミス、ローカルの monorepo に余計なファイル |
| ROLLBACK_COMPLETE で再 deploy 不可 | `aws cloudformation delete-stack` で先に消す |
| App Runner → RDS 接続失敗 | VPC Connector SG / RDS SG / Secrets Manager / マイグレーション未実施 |
| Cognito で auth 通らない | API の CognitoAuthProvider.signup/login が未実装。Web SDK 連携追加が必要 |
| タグが Cost Explorer に出ない | Billing → Cost allocation tags でアクティブ化、24h 待機 |
