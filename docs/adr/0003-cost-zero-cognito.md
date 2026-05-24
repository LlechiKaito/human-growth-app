# ADR 0003: POC を「コスト追加 0」で Cognito 連携可能にするため、RDS を public + App Runner egress=DEFAULT にする

- Status: Accepted
- Date: 2026-05-23
- Related: ADR-0001 (App Runner採用)

## Context

PR #4 で `CognitoAuthProvider` を AWS SDK でフル実装した。これにより API は次の **2 つの外部リソース** に到達する必要が生じた:

1. **RDS PostgreSQL** (アプリの DB)
2. **Cognito User Pools API** (`cognito-idp.<region>.amazonaws.com`) — JWKS / AdminCreateUser / AdminInitiateAuth 等

これまでの構成 (ADR-0001 直後):
- App Runner: `egressType: VPC` + VPC Connector (Private Isolated subnet)
- RDS: Private Isolated subnet
- **問題**: Private Isolated subnet からは internet にも AWS パブリックエンドポイントにも到達できない。Cognito API への呼び出しは ENOENT / timeout。

ユーザー要件:
- **Cognito を動かしたい** (要件)
- **NAT Gateway は使わない** (~$32/月、却下)
- **VPC Endpoint も使わない** (~$15/月、却下)
- ⇒ 追加コスト **0** で動かす必要がある

## Decision

**App Runner の VPC Connector を撤去** し、egress を AWS マネージドネットワーク (`egressType: DEFAULT`) に変更。
それに伴い **RDS を Public Subnet に置き `publiclyAccessible: true`** にして、internet 経由で App Runner と通信させる。

```
[App Runner (AWS managed net)]
   ├── HTTPS → cognito-idp.ap-northeast-1.amazonaws.com  (パブリックエンドポイント直)
   └── TCP   → <rds-public-endpoint>:5432  (TLS + 強力PW)
```

具体的な変更 (`PR #4`):
- `NetworkStack`: NAT 0 / Endpoint 無し / Public subnet のみ
- `DatabaseStack`: `publiclyAccessible: true`, Public subnet 配置
- `DatabaseSg`: ingress `0.0.0.0/0:5432` を許可
- `ComputeStack`: `networkConfiguration` を省略 → `egressType=DEFAULT`
- `ComputeStack`: instance role に `cognito-idp:Admin*` 権限付与

## Consequences

### 良い面
- 追加コスト **$0**(VPC Endpoint も NAT も無い)
- Cognito API を含む AWS パブリックエンドポイントに自由に到達できる
- 構成がシンプル(VPC Connector の維持運用コストもない)

### 悪い面 (= 本番では必ず直す)
- **RDS が internet 露出している**: Security Group は `0.0.0.0/0:5432` 許可
  - 緩和策: TLS 必須 + Secrets Manager 自動生成の強力パスワード
  - 緩和策: アプリケーションレイヤーでもメッセージはセンシティブ情報を含めない
- **App Runner egress 元 IP が固定でない**: SG で IP 制限不可
- **Network ACL のような明確な内側/外側境界が無い**: 監査対応で説明コストが上がる

### POC で許容できる理由
- 内部 HR データ(社員名 + 部署 + 暗号化スキル情報)のみ、機密度が極めて高い情報は扱わない
- 本番化までに必ず本番構成へ移行する前提
- 「申込資料の動作確認用」というスコープの限定

## Migration Path (本番化時)

| 項目 | 本番想定 |
|---|---|
| RDS | `publiclyAccessible: false`、Private Isolated subnet 配置 |
| App Runner | `networkConfiguration.egressConfiguration.egressType: VPC` + VPC Connector を再導入 |
| VPC Endpoint | `com.amazonaws.<region>.cognito-idp` を Interface Endpoint で追加 (~$15/月、2 AZ) |
| Database SG | App Runner SG からのみ ingress 許可、`0.0.0.0/0` ルール削除 |
| 追加コスト | VPC Endpoint 分のみ +$15/月程度 |

切り替えは CDK 上は localized な変更(network / database / compute スタックを 1〜2 PR で更新)。RDS は subnet 変更で **REPLACE** されるため、移行時は snapshot → restore が必要。

## Alternatives considered

- **NAT Gateway 追加** (+$32/月): もっとも標準的だがコスト要件で却下。
- **VPC Endpoint for cognito-idp** (+$15/月): NAT より安いが、それでもコスト発生。POC では却下。
- **AUTH_PROVIDER=local で Cognito を使わない** ($0): リソースとしてはデプロイ済みだが API が叩かない。実 Cognito の動作確認ができないため、申込資料として弱い。今回は不採用だが選択肢としては有効。
- **Lambda + API Gateway に変更**: Lambda は VPC 外なら internet 直、VPC 内なら NAT 必須で App Runner と同じ問題。アーキ変更コストに見合わない。

## References

- [ADR-0001: App Runner を Fargate+ALB の代わりに採用する](0001-app-runner-over-fargate.md)
- AWS Docs: [App Runner network configuration](https://docs.aws.amazon.com/apprunner/latest/dg/network-vpc.html)
- AWS Docs: [Cognito User Pools VPC support (limited)](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-vpc.html)
