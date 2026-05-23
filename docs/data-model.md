# Data Model

## ER 図

```
┌────────────────────┐         ┌────────────────────┐
│ Employee           │ 1     1 │ Character          │
│────────────────────│─────────│────────────────────│
│ id                 │         │ id                 │
│ external_id  (HR)  │         │ employee_id        │
│ cognito_sub        │         │ name               │
│ email              │         │ class_name         │
│ display_name       │         │ experience_point   │
│ department         │         └────────┬───────────┘
│ joined_at          │                  │ 0..*
└────────┬───────────┘                  ▼
         │ 1..*                ┌────────────────────┐
         ▼                     │ Quest              │
┌────────────────────┐         │────────────────────│
│ Evaluation         │         │ id                 │
│────────────────────│         │ title              │
│ id                 │         │ description        │
│ employee_id        │         │ difficulty         │
│ external_id  (HR)  │         │ reward_xp          │
│ period             │         │ status             │
│ score              │         │ assigned_character │
│ evaluated_at       │         │ completed_at       │
│ synced_at          │         └────────────────────┘
└────────────────────┘

         Character ─┐
                    │ via CharacterSkill (M:N)
         Skill ─────┘
                    parent_id で自己参照 (スキルツリー)
```

## エンティティ詳細

### Employee
- HR システムの社員マスタと 1:1 対応
- `external_id`: HR システム側の社員 ID (連携キー)
- `cognito_sub`: Cognito User Pool の sub (認証連携)

### Character
- Employee ごとに 1 体
- `class_name`: 職種をベースにした RPG クラス (例: Engineer, Designer)
- `experience_point`: 累積 XP。レベルは XP テーブルから計算

### Quest
- 業務タスクを RPG 化したもの
- `difficulty`: EASY / NORMAL / HARD / EPIC
- `reward_xp`: 完了時に獲得する XP
- `assigned_character_id`: 割り当て先 (null なら未割当)
- `status`: OPEN / IN_PROGRESS / COMPLETED

### Skill / CharacterSkill
- スキルマスタとキャラの所持スキルを M:N で表現
- `parent_id` で前提スキル (スキルツリー構造)
- `tier`: 階層 (1〜5)

### Evaluation (HR 連携用)
- POC では雛形のみ。本番で HR システムから同期
- `external_id`: HR システム側の評価 ID (冪等性確保)
- `period`: 四半期 (例: "2026-Q1")
- `synced_at`: 同期した時刻 (差分同期用)

## HR システム連携 (将来)

```
HR System
  │
  ├─ 日次バッチ → EventBridge Scheduler → Lambda → upsert evaluations
  │                                                upsert employees
  │
  └─ CSV 投入 → S3 → S3 Trigger Lambda → 同上
```

連携の冪等性:
- `external_id` で UPSERT
- `synced_at` で最新を判定
- `period + employee_id` のユニークインデックスで重複防止

## マイグレーション戦略

- Prisma Migrate で管理 (`prisma/migrations/`)
- 本番は `prisma migrate deploy` を App Runner のデプロイ時に実行 (CI で)
- ロールバック: 直前マイグレーションの逆操作 SQL を手動で
