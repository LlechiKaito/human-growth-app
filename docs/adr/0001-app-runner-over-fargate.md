# ADR 0001: App Runner を Fargate+ALB の代わりに採用する

- Status: Accepted
- Date: 2026-05-23

## Context

POC で API バックエンドを AWS でホストする選択肢:
- A: ECS Fargate + ALB
- B: AWS Lambda + API Gateway
- C: App Runner

要件:
- 単一 HTTP API (Hono)、sidecar 不要
- 0→1 フェーズ、運用負荷最小化
- 月額を抑えたい
- HTTPS、オートスケール、ヘルスチェック必須

## Decision

**C: App Runner を採用する。**

## Consequences

### 良い面
- HTTPS / ALB / Listener が要らない → CDK のコード量が約 1/3
- 月額が Fargate+ALB の $29 → $14 へ削減
- Pause when idle を使えばさらに圧縮可能
- デプロイが ECR push 自動 = CI シンプル
- HTTPS は AWS 管理、ACM 証明書も自動発行

### 悪い面
- HTTP/HTTPS 以外のプロトコル不可
- sidecar コンテナ不可
- 細かい挙動制御が ECS より少ない
- Spot インスタンス非対応

### 移行の余地
将来 sidecar / バッチ / 複数コンテナが必要になった場合:
- Hono のコードは変更なしで Fargate に移植可能
- CDK の compute-stack を入れ替えるだけ
- ECR は共通で使い続けられる

## Alternatives considered

- **Lambda + API Gateway**: コールドスタートとパッケージサイズが Prisma 利用で問題化。
- **Fargate + ALB**: コストと運用負荷で App Runner に劣る。スケール段階で再検討。
