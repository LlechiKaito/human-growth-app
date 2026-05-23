# ADR 0002: Next.js を静的書き出し (output: export) で S3 配信する

- Status: Accepted
- Date: 2026-05-23

## Context

Next.js のホスティング選択肢:
- A: Amplify Hosting (SSR/ISR 対応)
- B: Fargate に Next.js コンテナを置く
- C: 静的書き出し (`output: 'export'`) → S3 + CloudFront
- D: OpenNext + Lambda + CloudFront

要件:
- 社内 HR アプリ (SEO 不要)
- 認証後の画面が中心 (CSR で十分)
- コスト最小化
- 構成シンプル化

## Decision

**C: 静的書き出し → S3 + CloudFront を採用する。**

## Consequences

### 良い面
- フロント用の Fargate / Amplify が不要 (月 -$9〜)
- CloudFront キャッシュが効きやすい
- S3 + CloudFront は本番運用実績豊富
- API (App Runner) と完全分離 = 障害の独立性

### 悪い面
- Next.js Middleware が使えない (auth ガードはクライアント側で実装)
- Next.js API Routes 不可 (API は別 (Hono on App Runner) なので問題なし)
- ISR 不可 (動的更新は fetch + TanStack Query で対応)
- `next/image` の最適化サーバ不可 (`unoptimized: true` + CloudFront 配信)
- Server Components の Server Actions 不可

### 評価
本案件 (内部 HR アプリ) では SSR/ISR の利点を活かす場面が無く、デメリットも許容範囲。
ユーザー向けの公開サービスにスケールする場合は Amplify or OpenNext に切り替え検討。
