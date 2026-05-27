# Human Growth — Skill Quest RPG

> RPG 風人材育成アプリ (POC)。日々の業務をクエストに、スキル習得を冒険に。

## 概要

社員 = キャラクター、業務タスク = クエスト、スキル習得 = レベルアップ。
人事評価システムとの連携を見据えたデータ設計。

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [`docs/setup.md`](docs/setup.md) | **ローカル開発セットアップ**(初めての人はまずこれ) |
| [`docs/spec.md`](docs/spec.md) | **機能仕様**(ユーザーストーリー / 画面 / API / ドメインモデル / 受入条件) |
| [`docs/architecture.md`](docs/architecture.md) | **アーキテクチャ**(構成図 / スタック構成 / コスト試算 / 設計判断) |
| [`docs/data-model.md`](docs/data-model.md) | **データモデル**(ER 図 / HR 連携設計 / マイグレーション戦略) |
| [`docs/deploy.md`](docs/deploy.md) | **デプロイ手順**(1 コマンドデプロイ + トラブルシューティング) |
| [`docs/adr/`](docs/adr/) | **アーキテクチャ意思決定記録**(App Runner / 静的書き出し / コスト 0 構成) |

## 技術スタック

| 領域 | 採用 |
|---|---|
| Frontend | Next.js 14 (App Router, `output: 'export'`) + TypeScript + Tailwind + TanStack Query |
| Backend | Hono on Node.js 20 + TypeScript + Prisma |
| DB | PostgreSQL 16 |
| Auth | Amazon Cognito (Email/Password) + LocalAuthProvider 切替 |
| 本番 Infra | S3 + CloudFront + App Runner + RDS PostgreSQL + Cognito |
| IaC | AWS CDK (TypeScript) |
| CI | GitHub Actions (lint+typecheck / unit+integration / E2E / cdk synth) |
| Test | Vitest (unit / integration) + Playwright (E2E) |

## ディレクトリ構成

```
.
├── apps/
│   ├── web/      Next.js (静的書き出し → S3)
│   └── api/      Hono (App Runner で動く)
├── infra/        AWS CDK (network/database/auth/compute/frontend/monitoring)
├── tests/e2e/    Playwright
├── docker/       Dockerfile (api / web / e2e) + entrypoint
├── docs/         setup / spec / architecture / data-model / deploy / adr
├── .github/      CI workflows
└── docker-compose.yml
```

## ローカル開発(最短)

詳細は [`docs/setup.md`](docs/setup.md)。

```bash
npm install
docker compose up -d
```

- Web: http://localhost:3001
- API: http://localhost:8081/api/health
- PostgreSQL: localhost:5433 (dev / dev / human_growth)

> ホスト側ポートは他プロジェクトと被らないようずらしてある (3000→3001, 8080→8081, 5432→5433)。

サインアップ → ダッシュボード → クエスト完了 → レベルアップ までブラウザでフロー可能。

## テスト

```bash
docker compose exec api npm test                       # unit + integration (33 tests)
docker compose --profile e2e run --rm e2e              # E2E (Playwright, 6 specs)
npm run typecheck --workspaces --if-present            # 全 workspace 型チェック
```

## デプロイ(本番 AWS)

詳細は [`docs/deploy.md`](docs/deploy.md)。

```bash
cd infra && npm run deploy
```

これだけで:
1. Next.js 静的書き出し(`build:web`)
2. CDK が全スタックを反映(DockerImageAsset で API イメージビルド + ECR push 自動)
3. App Runner 起動時に `prisma db push` でマイグレーション自動実行
4. S3 sync + CloudFront invalidation

**人間が実行する方針**(`npm run deploy` は手動トリガ、CI は synth まで)。

## 本番アーキテクチャ(POC 構成)

```
User → CloudFront → /*     → S3 (Next.js 静的)
                  → /api/* → App Runner (Hono, egress=DEFAULT)
                              ├─ Cognito User Pool (AdminAuth)
                              └─ RDS PostgreSQL (publiclyAccessible)
```

POC は **追加コスト 0** にするため RDS を public 配置 + App Runner egress=DEFAULT。
本番化時は VPC Endpoint for cognito-idp + Private RDS に切り替え。背景は [ADR-0003](docs/adr/0003-cost-zero-cognito.md)。

## ライセンス

private (内部開発)
