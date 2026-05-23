# Setup — ローカル開発環境

> 初めてこのリポジトリをクローンしたら、まずこれを上から順にやれば動く。

## 1. 前提ソフトウェア

| ソフト | 推奨バージョン | 確認コマンド |
|---|---|---|
| Docker | 25.x 以上 | `docker version` |
| Docker Compose | v2 以上 | `docker compose version` |
| Node.js | 20.x (LTS) | `node -v` |
| npm | 10.x 以上 | `npm -v` |
| Git | 2.40 以上 | `git --version` |
| AWS CLI | v2 (cdk deploy 時のみ必要) | `aws --version` |
| AWS CDK CLI | 2.165+ (npx でも可) | `npx cdk --version` |

Mac:
- Docker は Docker Desktop or **colima** (`brew install colima docker docker-buildx docker-compose`) 推奨
- Node.js は `nvm` or `volta` で 20 を切り替え

## 2. リポジトリのクローン + 初期インストール

```bash
git clone git@github.com:LlechiKaito/human-growth-app.git
cd human-growth-app

# Node.js 20 が前提
node -v   # v20.x

# npm workspaces 全部に依存をインストール
npm install
```

`postinstall` などはありません。

## 3. 環境変数

`.env.example` をコピーして `.env` を作成:

```bash
cp .env.example .env
```

主な変数 (docker-compose 用):

| 変数 | デフォルト | 用途 |
|---|---|---|
| `DATABASE_URL` | `postgresql://dev:dev@postgres:5432/human_growth` | コンテナ間 postgres |
| `API_PORT` | `8080` | コンテナ内ポート |
| `NEXT_PUBLIC_API_BASE_URL` | (空) | Web → API は相対 URL + Next.js rewrite |
| `COGNITO_*` | (空) | ローカルでは未使用 (`AUTH_PROVIDER=local` がデフォルト) |

> `.env` は **git ignore 済み**。値を変えても commit されない。

## 4. 全部立ち上げる(最短)

```bash
docker compose up -d
```

これで:
- `hg-postgres` (PostgreSQL 16)
- `hg-api` (Hono + Prisma) — `prisma db push` を起動時に自動実行
- `hg-web` (Next.js dev server)

の 3 コンテナが立つ。所要 ~30秒。

### アクセス先

| サービス | URL |
|---|---|
| Web | http://localhost:3001 |
| API health | http://localhost:8081/api/health |
| PostgreSQL | `localhost:5433` (dev / dev / human_growth) |

> ホスト側ポートは他プロジェクトと被らないよう **+1 ずらして** ある (3000→3001, 8080→8081, 5432→5433)。
> コンテナ間通信は標準ポートのまま。

### ログ確認

```bash
docker compose logs -f api    # API のログ
docker compose logs -f web    # Next.js のログ
docker compose ps             # 状態
```

### 停止

```bash
docker compose down            # DB ボリュームは残す
docker compose down -v         # DB も含めて全消し
```

## 5. データベース操作

### スキーマ反映

`docker compose up` 時に自動で `prisma db push` が走るので、通常は不要。
スキーマを書き換えた後に手動で:

```bash
docker compose exec api npx prisma db push
```

### シードデータ投入

```bash
docker compose exec api npm run prisma:seed
```

シード内容: `alice@example.com` (パスワード未設定、Local Auth では使えない)、サンプルキャラ、スキル、クエスト 3 件。

### Prisma Studio (GUI)

```bash
docker compose exec api npx prisma studio
```

`http://localhost:5555` でブラウザに DB ビューワが開く (ホスト→コンテナへの追加 mapping が必要な場合あり)。

## 6. テスト

### Unit + Integration (API)

```bash
docker compose exec api npm test
```

→ 33 tests passed が出れば OK。

内訳:
- `tests/unit/`: ExperiencePoint, Character entity, LocalAuthProvider, SignupUseCase, env-database-url
- `tests/integration/`: Auth API, Characters API, Quests API, Health, supertest 相当の `app.request` 直接呼び出し

### E2E (Playwright)

ローカルで動かす場合、Playwright 用の docker compose プロファイルを使う:

```bash
docker compose up -d            # api / web / postgres が起動済み前提
docker compose --profile e2e run --rm e2e
```

→ Auth flow / Quest completion / Character skill tree の 6 spec が走る。

(host から直接 npx playwright test するには Playwright のブラウザを `npx playwright install --with-deps chromium` で入れる必要がある)

### Typecheck

```bash
npm run typecheck --workspaces --if-present
```

全 workspace (api / web / infra) で `tsc --noEmit` を走らせる。CI でも実行される。

## 7. デフォルトアカウントの作り方

LocalAuthProvider 利用時はメモリ上にしかユーザーが残らないので、コンテナ再起動でログイン情報は消える。

最短の動作確認:
1. http://localhost:3001/signup を開く
2. 表示名 / 部署 / メール / パスワード(8文字以上)を入力
3. 自動でログイン → /dashboard へ
4. /quests からクエスト完了 → XP 増加・レベルアップ確認

## 8. ブランチ / コミット

ブランチ:
- `develop` — デフォルトブランチ、PR 先
- `feature/*` — 機能開発(`develop` から切る)
- `fix/*` — バグ修正

コミット (Conventional Commits):
- `feat(scope): ...` — 新機能
- `fix(scope): ...` — バグ修正
- `chore`, `refactor`, `test`, `docs`, `ci`

詳細は `/CLAUDE.md` の `rules/git.md` を参照(AI 規約)。

## 9. デプロイ

`docs/deploy.md` を参照。**`npm run release` 1 コマンド** で AWS にデプロイされる(人間が実行)。

## 10. トラブルシューティング

| 症状 | 確認 / 対処 |
|---|---|
| `docker compose up` が `port is already allocated` | 別プロセスが 3001/8081/5433 を使ってる。`lsof -iTCP:8081 -sTCP:LISTEN` で確認 |
| `docker compose up` で `Prisma schema ... not found` | `apps/api/prisma/schema.prisma` の path が壊れてないか確認、または `docker compose build api` でリビルド |
| `/api/health` が `connection refused` | api コンテナが起動中。`docker compose logs api` で待機状態か確認 |
| Web → API が CORS エラー | dev 環境は Next.js rewrite で同一オリジン化されているはず。`apps/web/next.config.mjs` の rewrites を確認 |
| `npm test` が DB 接続エラー | postgres コンテナが立っていない。`docker compose up -d postgres` |
| host の Node が壊れてる | コンテナ内で完結する設計なので host の Node は最悪 typecheck 用くらい。`docker compose exec api npm test` で十分 |

## 11. クリーンアップ(ローカルを完全に元に戻す)

```bash
docker compose down -v                 # コンテナ + ボリューム削除
docker compose --profile e2e down -v   # E2E プロファイル分も
docker system prune -af --volumes      # Docker 全体のキャッシュ削除 (注意)
```
