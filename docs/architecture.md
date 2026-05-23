# Architecture

## 全体像

```
                       ┌──────────────┐
   ユーザー ──HTTPS──►│  CloudFront  │ (キャッシュ + WAF + 独自ドメイン)
                       └──┬───────┬───┘
                          │       │
                  /api/*  │       │ /*
                          ▼       ▼
                  ┌──────────────┐  ┌────────────────┐
                  │ App Runner   │  │ S3 (private)   │
                  │  Hono API    │  │ Next.js 静的   │
                  │  HTTPS 内蔵  │  │ OAC で保護     │
                  └──────┬───────┘  └────────────────┘
                         │ VPC Connector
                         ▼ (Private Subnet)
                  ┌──────────┐         ┌─────────────┐
                  │   RDS    │         │  Cognito    │
                  │ Postgres │         │ User Pool   │
                  │ t4g.micro│         │             │
                  └──────────┘         └─────────────┘
```

## 設計判断と理由

### Frontend: Next.js 静的書き出し (`output: 'export'`) → S3

- 社内 HR アプリで SSR が要るシーンが無い
- SEO 不要、認証後の画面が中心 = CSR で十分
- **Fargate/Amplify を持たずに済む** = 構成シンプル、コスト削減

トレードオフ:
- Next.js Middleware / API Routes / ISR / `next/image` 最適化サーバが使えない
- → クライアント側で Cognito 認証ガード、画像は CloudFront 配信

### Backend: Hono on App Runner

なぜ App Runner か:
- **HTTPS が組み込み** (ACM / Listener / Listener Rule 不要)
- **オートスケール組み込み** (同時リクエスト数ベース)
- **ALB 不要** = 月 -$20
- **デプロイが ECR push 自動** = CI/CD シンプル

なぜ Fargate ではないか:
- 単一コンテナ、sidecar 不要、HTTP のみ → App Runner で十分
- Fargate + ALB は最小構成でも $29/月 ↔ App Runner は $14/月

将来 Fargate に移行する場合:
- Hono のコードは完全に同じまま動く (ベンダーロックインなし)
- ALB Target Group / ECS Service を追加するだけ

### DB: RDS PostgreSQL 16 (db.t4g.micro)

- 人事評価連携を見据えると JOIN/集計が必要 → RDB 必須 (Firestore/DynamoDB は不適)
- Aurora Serverless v2 は最低 $43/月、POC には過剰
- t4g.micro (ARM) で $15/月、必要に応じてスケールアップ

### Auth: Cognito User Pool

- Email/Password で開始、将来 SAML / OIDC フェデレーション拡張可
- Free tier 50k MAU = POC〜初期は実質無料
- ID トークンを sessionStorage に保管 (CloudFront 経由でクッキーも検討余地)

### Network: NAT Gateway なし

- App Runner からのアウトバウンドは AWS マネージドネットワーク経由 (NAT 不要)
- RDS は private isolated subnet (インターネットからアクセス不可)
- VPC Connector で App Runner ↔ RDS を接続
- → NAT GW $32/月 削減、VPC Endpoint も不要

## コスト試算

| サービス | 常時稼働 | Pause有効 |
|---|---|---|
| CloudFront | $1〜 | $1〜 |
| S3 | $1 | $1 |
| App Runner (0.25 vCPU / 0.5 GB) | $14 | $3〜 |
| VPC Connector | $3 | $3 |
| RDS db.t4g.micro + 20GB | $18 | $18 |
| Cognito (50k MAU まで) | $0 | $0 |
| CloudWatch / Logs | $2〜 | $2〜 |
| **合計** | **~$40/月** | **~$28/月** |

本番化時に増える項目:
- Multi-AZ RDS: +$15
- Aurora Serverless v2 移行: +$30〜
- WAF: +$5〜
- Route 53 ドメイン: +$1
- → 本番フル装備でも $80〜100/月

## スケール戦略

| 段階 | ユーザー | 構成 |
|---|---|---|
| POC | 〜10 | App Runner 0.25/0.5, RDS t4g.micro |
| Beta | 〜500 | App Runner 1/2, RDS t4g.small |
| GA | 〜5,000 | App Runner 2/4 + Multi-AZ RDS |
| Growth | 〜50,000 | Fargate + ALB に移行、Aurora Serverless v2 |

## CI/CD

```
GitHub Actions (OIDC)
  ├─ web: npm build → out/ を S3 sync → CloudFront invalidate
  └─ api: docker build → ECR push → App Runner 自動デプロイ
```

デプロイ実行は人間 (環境ごとに workflow_dispatch で手動トリガ)。
