# Spec — Human Growth (Skill Quest RPG)

> 機能仕様。何を作っているかを 1 ファイルで把握できることを目的とする。

## 1. プロダクト概要

社員の業務 / 学習 / 成長を **RPG ゲームのメタファー** で可視化する社内向け人材育成アプリ。

| RPG 概念 | 対応する業務概念 |
|---|---|
| キャラクター | 社員 (Employee) |
| ジョブクラス | 部署 / 職種 (Engineer, Designer, Bard 等にマッピング) |
| 経験値 (XP) | 業務完遂による成長ポイント |
| レベル | 累積 XP に基づく自動算出 |
| クエスト | 業務タスク / 自己研鑽課題 |
| スキルツリー | 習得スキルとその依存関係 |
| 報酬 | XP 付与 → レベルアップ演出 |

## 2. ペルソナと利用文脈

| ペルソナ | 利用シーン |
|---|---|
| 一般社員 | 自分のキャラ確認 / クエスト受注・完了 / レベル進捗確認 |
| 上司 (将来) | 部下のクエスト割当 / 評価期 (1on1) の振り返り |
| 人事 (将来) | 人事評価システムから評価データ取込 → キャラの成長と紐付け |

POC 範囲は **一般社員 1 ロール**。上司・人事ロールは将来拡張。

## 3. ユーザーストーリー (MVP)

| ID | As a | I want | So that | 実装 |
|---|---|---|---|---|
| US-01 | 社員 | アカウント登録できる | アプリを使い始められる | ✅ Cognito signup |
| US-02 | 社員 | ログインできる | 自分の状態を見られる | ✅ Cognito login |
| US-03 | 社員 | ダッシュボードで自分の状態を一目で見られる | 進捗を実感できる | ✅ /dashboard |
| US-04 | 社員 | 自分のキャラ詳細 (Lv/XP/スキル) を確認できる | 成長を可視化できる | ✅ /characters/me |
| US-05 | 社員 | クエスト一覧を見られる | 何をやるか選べる | ✅ /quests |
| US-06 | 社員 | クエストを完了する | XP が増える | ✅ POST /api/quests/:id/complete |
| US-07 | 社員 | 完了時にレベルアップ演出を見られる | 達成感がある | ✅ Toast 表示 |
| US-08 | 社員 | スキルツリーで取得済み/未取得が分かる | 次に何を狙うか分かる | ✅ /characters/me 内 SkillTree |
| US-09 | 社員 | ログアウトできる | 共有 PC でも安心 | ✅ Logout button |

## 4. 画面一覧

| ルート | 認証 | 内容 |
|---|---|---|
| `/` | 不要 | LP (Login / Signup の導線) |
| `/login` | 不要 | ログインフォーム |
| `/signup` | 不要 | 新規登録フォーム (表示名 / 部署 / Email / Password) |
| `/dashboard` | 必須 | キャラステータス + 完了クエスト数 + 取得スキル数 + 次レベルまでの XP + 進行中クエスト上位 3 件 |
| `/quests` | 必須 | 受注可能クエスト + 完了済みクエスト |
| `/characters/me` | 必須 | キャラ詳細 + スキルツリー |

認証は `/(main)/layout.tsx` の `<AuthGuard>` でラップ。未認証は `/login` にリダイレクト。

## 5. ドメインモデル概観

```
Employee 1───1 Character ─*── Quest (assignedCharacterId)
   │                  │
   │                  *
   │            CharacterSkill ──* Skill (parent_id で自己参照ツリー)
   │
   * Evaluation  (HR 連携用、POC では雛形のみ)
```

詳細は [`docs/data-model.md`](data-model.md) を参照。

### 重要な値オブジェクト

- **`ExperiencePoint`** (`apps/api/src/domain/value-objects/experience-point.vo.ts`)
  - 非負整数のみ受付、`add()` で増加
  - `toLevel()` で `LEVEL_XP_THRESHOLDS` (`apps/api/src/constants/xp-table.ts`) から Level を算出
  - `xpToNextLevel()` で次レベルまでの残 XP を返す

### XP テーブル

| Level | 累積必要 XP |
|---|---|
| 1 | 0 |
| 2 | 100 |
| 3 | 250 |
| 4 | 450 |
| 5 | 700 |
| 6 | 1000 |
| 7 | 1350 |
| 8 | 1750 |
| 9 | 2200 |
| 10 | 2700 |
| 11 (MAX) | 3250 |

調整は `apps/api/src/constants/xp-table.ts` の `LEVEL_XP_THRESHOLDS` を更新するだけ。

### ジョブクラスのマッピング

部署 → ジョブクラス(`get-my-character.usecase.ts` 内):

| Department | Class |
|---|---|
| Engineering | Engineer |
| Design | Artificer |
| Sales | Bard |
| HR | Cleric |
| Marketing | Ranger |
| その他 / 未設定 | Adventurer |

## 6. API 仕様 (簡易)

すべて `application/json`。認証必須エンドポイントは `Authorization: Bearer <idToken>` 必須。

| Method | Path | 認証 | 概要 |
|---|---|---|---|
| GET | `/api/health` | 不要 | ヘルスチェック |
| POST | `/api/auth/signup` | 不要 | `{ email, password, displayName, department? }` → `{ employeeId, tokens }` |
| POST | `/api/auth/login` | 不要 | `{ email, password }` → `{ employeeId, tokens }` |
| GET | `/api/auth/me` | 必須 | 現在の社員情報 |
| GET | `/api/characters/me` | 必須 | 自分のキャラ詳細(初回は自動生成) |
| GET | `/api/quests` | 必須 | 自分にアサインされた + 未割当 OPEN クエスト一覧 |
| POST | `/api/quests/:id/complete` | 必須 | クエスト完了処理 (XP 付与 + Level 再計算をトランザクションで) |
| POST | `/api/_dev/quests` | 不要 (NODE_ENV ≠ production のみ) | E2E 用のクエスト投入 |

詳細レスポンス例は `apps/api/src/application/dto/` および対応する route ハンドラを参照。

### エラーレスポンス

```json
{ "code": "QUEST_ALREADY_COMPLETED", "message": "Quest already completed: <id>" }
```

エラーコード一覧は `apps/api/src/constants/error-codes.ts`。HTTP status は `error-handler` middleware が code に基づいて決定 (`401 / 403 / 404 / 409 / 422 / 500`)。

## 7. 認証フロー

### Cognito (本番想定)

```
[Browser]
   │ POST /api/auth/signup (email, password, displayName, department)
   ▼
[App Runner API]
   │ AdminCreateUser (email_verified=true, MessageAction=SUPPRESS)
   │ AdminSetUserPassword (Permanent=true)
   │ AdminInitiateAuth (ADMIN_USER_PASSWORD_AUTH)
   │ → 取得した sub で Employee row を作成
   ▼
[Cognito User Pool]
   ↓ idToken (RS256 JWT)
[Browser] (sessionStorage 保管)
   │
   │ 以降のリクエストは Authorization: Bearer <idToken>
   ▼
[App Runner API]
   │ CognitoAuthProvider.verify(idToken)
   │  └─ JWKS (Cognito の /.well-known/jwks.json) で署名検証
   ▼
   route handler 実行
```

### Local (ローカル開発)

`AUTH_PROVIDER=local` で `LocalAuthProvider` を使用。HS256 JWT を自前で発行・検証 (`AUTH_LOCAL_SECRET`)。

両者は `AuthProvider` インターフェースを実装しており、`infrastructure/auth/index.ts` で env により切替。

## 8. クエスト完了時の処理(最重要ロジック)

`CompleteQuestUseCase.execute(cognitoSub, questId)` を **Prisma トランザクション内** で実行:

1. `Employee.findByCognitoSub(sub)` → 認証ユーザーの Employee 取得
2. `Character.findByEmployeeId(employee.id)` → そのキャラ取得
3. `Quest.findById(questId)` → 対象クエスト取得
4. ガード:
   - クエストが存在しない → `404 QUEST_NOT_FOUND`
   - すでに COMPLETED → `409 QUEST_ALREADY_COMPLETED`
   - 別キャラに割当済み → `403 FORBIDDEN`
5. 旧 Level を保持
6. `character.gainExperience(quest.rewardXp)` で新キャラ生成 (immutable Entity)
7. 新 Level を計算
8. `characters.save(updatedCharacter)` + `quests.save(quest.complete())`
9. レスポンス: `gainedXp / newExperiencePoint / oldLevel / newLevel / leveledUp`

UI は `leveledUp=true` のときに大きいトーストを表示。

## 9. 受入条件 (POC 完成基準)

- [x] サインアップ → ダッシュボードに遷移する
- [x] ログイン → ダッシュボードに遷移する
- [x] ログアウト → /login に戻る
- [x] 未認証で /dashboard へアクセス → /login にリダイレクト
- [x] クエスト一覧が表示される
- [x] クエスト完了で XP が増え、必要なら Level が上がる
- [x] レベルアップ時に専用 UI 演出が出る
- [x] スキルツリーが acquired / locked で色分け表示される
- [x] CI が全部緑 (lint + typecheck + unit + integration + E2E + cdk synth)
- [x] `npm run release` 一発で AWS デプロイが完結する

## 10. 非機能要件

| 項目 | POC | 本番想定 |
|---|---|---|
| 想定ユーザー数 | 1〜10 | 数百〜数千 (社内) |
| 可用性 | 単一 AZ で OK | Multi-AZ RDS、CloudFront、App Runner |
| RTO | ~1h | ~15min |
| RPO | 24h (自動バックアップ) | 5min (PITR) |
| セキュリティ | RDS public + SSL+PW (POC) | RDS private + VPC Endpoint |
| ロギング | Hono logger | 構造化ログ (pino 等) + CloudWatch Insights |
| 個人情報保護 | 最小限 (email + 表示名) | 暗号化、監査ログ、PII 分離 |

## 11. 未実装 / 将来拡張

- 上司ロール / 部下のキャラ閲覧
- 人事評価システム連携 (`Evaluation` テーブルへの batch import)
- スキルツリーでの **取得操作** (現状は acquired フラグの表示のみ)
- パスワードリセット / メールアドレス変更
- MFA (Cognito ですぐ追加可能)
- SAML / OIDC フェデレーション (企業 SSO)
- 通知 (Slack 連携など)
- ランキング / チームクエスト / バッジ
- 監査ログ (誰がいつ何をしたか)
