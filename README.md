# Human Growth — Skill Quest RPG

> RPG 風人材育成アプリ (POC)。日々の業務をクエストに、スキル習得を冒険に。

## 概要

社員 = キャラクター、業務タスク = クエスト、スキル習得 = レベルアップ。
人事評価システムとの連携を見据えたデータ設計。

## 技術スタック

| 領域 | 採用 |
|---|---|
| Frontend | Next.js 14 (App Router, `output: 'export'`) + TypeScript + Tailwind + TanStack Query |
| Backend | Hono on Node.js 20 + TypeScript + Prisma |
| DB | PostgreSQL 16 |
| Auth | Amazon Cognito (Email/Password) |
| 本番 Infra | S3 + CloudFront + App Runner + RDS PostgreSQL + Cognito |
| IaC | AWS CDK (TypeScript) |
| CI/CD | GitHub Actions + OIDC |
| Test | Vitest (unit / integration) + Playwright (E2E) |

## ディレクトリ構成

```
.
├── apps/
│   ├── web/      Next.js (静的書き出し → S3)
│   └── api/      Hono (App Runner で動く)
├── infra/        AWS CDK (network/database/auth/compute/frontend/monitoring)
├── tests/e2e/    Playwright
├── docker/       Dockerfile (api / web)
├── docs/         architecture.md / data-model.md
└── docker-compose.yml
```

## ローカル開発

### 必要なもの
- Docker / Docker Compose
- Node.js 20.x (任意、コンテナ内で完結)

### 起動

```bash
cp .env.example .env
docker compose up -d
```

- Web: http://localhost:3000
- API: http://localhost:8080/api/health
- PostgreSQL: localhost:5432 (dev / dev / human_growth)

### マイグレーション + シード

```bash
docker compose exec api npm run prisma:migrate
docker compose exec api npm run prisma:seed
```

### テスト

```bash
# ユニット + インテグレーション
docker compose exec api npm test
docker compose exec web npm test

# E2E (Playwright ヘッドレス)
npm run test:e2e
```

### 停止

```bash
docker compose down            # ボリュームは残す
docker compose down -v         # DB ボリュームも消す
```

## 本番アーキテクチャ

詳細は [docs/architecture.md](docs/architecture.md) を参照。

```
User → CloudFront → /*     → S3 (Next.js 静的)
                  → /api/* → App Runner (Hono) → RDS PostgreSQL
                                              → Cognito
```

## CDK

```bash
cd infra
npm run synth      # CloudFormation テンプレ生成
npm run diff       # 差分確認 (デプロイは人間)
```

**デプロイは AI が実行しない方針。** CDK の出力で差分確認のみ。

## ライセンス

private (内部開発)
