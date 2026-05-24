# Architecture

> 本ドキュメントは **PR #4 後の現状** を反映している。トレードオフの背景は ADR-0003 を参照。

## 全体像 (POC 構成)

```
                       ┌──────────────┐
   ユーザー ──HTTPS──►│  CloudFront  │ (キャッシュ + 独自ドメイン)
                       └──┬───────┬───┘
                          │       │
                  /api/*  │       │ /*
                          ▼       ▼
                  ┌──────────────┐  ┌────────────────┐
                  │  App Runner  │  │ S3 (private)   │
                  │   Hono API   │  │ Next.js 静的   │
                  │   HTTPS 内蔵 │  │ OAC で保護     │
                  │ egress=DEFAULT  └────────────────┘
                  └──────┬───┬───┘
                         │   │
        ┌────────────────┘   │
        │ HTTPS 公開エンドポイント (TLS + IAM)
        ▼                    │
  ┌─────────────┐            │
  │  Cognito    │            │ TCP 5432 (TLS) / SG 0.0.0.0/0
  │ User Pool   │            ▼
  │ AdminAuth   │     ┌────────────┐
  └─────────────┘     │  RDS       │
                      │ Postgres   │  Public Subnet,
                      │ t4g.micro  │  publiclyAccessible:true
                      └────────────┘
```

**ポイント**:
- App Runner は **VPC Connector を使わない** (egressType=DEFAULT) → AWS マネージドネットから Cognito へ直接
- RDS は **Public Subnet + publiclyAccessible=true** → internet 経由で App Runner と通信
- このトレードオフの理由は [ADR-0003](adr/0003-cost-zero-cognito.md)

本番想定は ADR-0003 末尾の「Migration Path」を参照。

## CDK スタック構成

| Stack | 主なリソース | 月額目安 (POC) |
|---|---|---|
| `human-growth-dev-network` | VPC / Public Subnet × 2 / Database SG | $0 |
| `human-growth-dev-database` | RDS PostgreSQL 16.13 t4g.micro + Secrets Manager | ~$18 |
| `human-growth-dev-auth` | Cognito User Pool + App Client | $0 (50k MAU まで無料) |
| `human-growth-dev-compute` | App Runner Service + DockerImageAsset (cdk-staging ECR 経由) | ~$14 |
| `human-growth-dev-frontend` | S3 + CloudFront + BucketDeployment (apps/web/out → S3) | ~$2 |
| `human-growth-dev-monitoring` | CloudWatch Dashboard + Alarms | ~$3 |

タグ (全リソースに自動付与):
- `Project=human-growth`
- `Environment=dev` / `prod`
- `ManagedBy=CDK`
- `Service=auth` / `compute` / `database` / 等

Cost Explorer で `Project + Service` でブレイクダウン可能。

## 設計判断と理由

### Frontend: Next.js 静的書き出し (`output: 'export'`)

- 社内 HR アプリで SSR が要るシーンが無い
- SEO 不要、認証後の画面が中心 = CSR で十分
- Fargate / Amplify を持たずに S3 + CloudFront のみで配信 = 構成シンプル、コスト削減
- 認証ガードはクライアント側 (`<AuthGuard>`) で実装

トレードオフ:
- Next.js Middleware / API Routes / ISR / `next/image` 最適化サーバが使えない
- → API は別アプリ (Hono)、画像は `next/image` の `unoptimized:true`
- 詳細は [ADR-0002](adr/0002-nextjs-static-export.md)

### Backend: Hono on App Runner

- **HTTPS 組み込み** (ACM / Listener 不要)
- **オートスケール組み込み** (同時リクエスト数ベース)
- **ALB 不要** = 月 -$20
- **DockerImageAsset で 1 コマンドデプロイ** (CDK が ECR push まで自動)
- 詳細は [ADR-0001](adr/0001-app-runner-over-fargate.md)

### DB: RDS PostgreSQL 16 (db.t4g.micro)

- 人事評価連携を見据えると JOIN/集計が必要 → RDB 必須 (Firestore/DynamoDB は不適)
- Aurora Serverless v2 は最低 $43/月、POC には過剰
- t4g.micro (ARM) で $15/月、必要に応じてスケールアップ
- マイグレーションは App Runner 起動時に `prisma db push` を自動実行 (POC、本番は別ジョブで proper migrations)

### Auth: Cognito User Pool (+ Local Auth Provider 切替)

- **本番モード** (`AUTH_PROVIDER=cognito`): API が AWS SDK で `AdminCreateUser` + `AdminSetUserPassword` + `AdminInitiateAuth` を叩く。verify は JWKS。
- **ローカルモード** (`AUTH_PROVIDER=local`): `LocalAuthProvider` が HS256 で JWT 発行・検証。Cognito にアクセスしない。
- 同じ `AuthProvider` インターフェースで実装 → env 変数 1 つで切替可能
- 詳細は [`docs/spec.md`](spec.md) の「7. 認証フロー」

### Network: NAT/VPC Endpoint なし(POC 限定)

- App Runner egress=DEFAULT で AWS マネージドネット直結
- RDS は publiclyAccessible で internet 経由通信(TLS + 強力PW)
- 追加月額コスト 0
- **本番ではこの構成を捨てる** ([ADR-0003](adr/0003-cost-zero-cognito.md))

## コスト試算

| サービス | POC 月額 |
|---|---|
| CloudFront | $1〜 |
| S3 (静的ファイル) | $1 |
| App Runner (0.25 vCPU / 0.5 GB) | $14 |
| RDS db.t4g.micro + 20GB | $18 |
| Cognito (50k MAU まで) | $0 |
| CloudWatch / Logs | $2〜 |
| Secrets Manager | $0.40 |
| **合計** | **~$36/月** |

本番化時の追加:
- VPC Endpoint for cognito-idp (2 AZ): +$15
- NAT Gateway は使わない方針 (VPC Endpoint で十分)
- Multi-AZ RDS: +$15
- WAF: +$5〜
- Route 53 + 独自ドメイン: +$1
- → 本番フル装備 ~$70〜90/月

## ローカル開発の構成

```
                  Docker host (Mac)
                ┌─────────────────────┐
                │   Next.js (web)     │  port 3001 ← localhost
                │   ↓ rewrite /api/*  │
                │   Hono (api)        │  port 8081 ← localhost
                │   ↓                 │
                │   Postgres          │  port 5433 ← localhost
                └─────────────────────┘
```

`apps/web/next.config.mjs` の `rewrites()` で `/api/*` を `http://api:8080` にプロキシ → 同一オリジン化 → CORS なし。

詳細セットアップは [`docs/setup.md`](setup.md)。

## CI

`.github/workflows/ci.yml` の 4 ジョブ並列:

| Job | 内容 |
|---|---|
| Lint + Typecheck | 全 workspace `tsc --noEmit` |
| API unit + integration | postgres サービスコンテナで vitest |
| E2E (Playwright via docker compose) | docker compose 起動 → Playwright プロファイル実行 |
| CDK synth | `npm run web:build:export` 後に `cdk synth` |

CI は **テストと synth まで**。実際の `cdk deploy` は人間が `npm run release` で実行(CD 自動化はしない方針)。

## デプロイ (1コマンド)

`docs/deploy.md` 参照。要約:

```bash
npm run release
```

これだけで:
1. Next.js を静的書き出し (`apps/web/out`)
2. CDK が全スタックを deploy (DockerImageAsset で API イメージビルド + ECR push)
3. App Runner 起動時に `prisma db push` で自動マイグレーション
4. S3 sync + CloudFront invalidation

## スケール戦略

| 段階 | 構成 |
|---|---|
| POC (〜10 ユーザー) | App Runner 0.25/0.5、RDS t4g.micro、Public RDS |
| Beta (〜500) | RDS を Private に戻す + VPC Endpoint、Multi-AZ オフ |
| GA (〜5,000) | App Runner 1/2、RDS t4g.medium + Multi-AZ |
| Growth (〜50,000) | Fargate + ALB に移行、Aurora Serverless v2 |

各段階で必要なら ADR を追記する運用。
