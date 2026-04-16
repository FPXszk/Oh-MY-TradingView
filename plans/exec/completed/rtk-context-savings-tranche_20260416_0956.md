# RTK 文脈節約の再調査と段階導入計画

## 1. 問題設定と結論

既存 tranche で `src/core/output-compaction.js` を中心とした deterministic output compaction と、selected CLI/MCP surfaces の opt-in compact mode は導入済みである。  
ただし現状の compact は「再実行すれば full result を見られる」という案内に寄っており、**compact 実行時の full output 追跡導線**、**大きい出力に対する surface ごとの縮約規律**、**CLI/MCP 間で一貫した compact contract** はまだ浅い。

この tranche では、RTK 由来の発想を repo fit に合わせて限定導入する。結論は以下の通り。

- **採る**: compact surface 向け raw-output artifact helper、deterministic artifact path + full output hint、selected large outputs 向け deterministic summarizer profiles
- **部分適応に留める**: permission/guard surfaces、declarative profiles
- **後回し**: raw vs compact の size-budget 測定/追跡基盤
- **採らない**: shell hook/proxy rewrite、telemetry、Claude session mining/discover、generic hook pack architecture

狙いは **compact=false の既存挙動を壊さず**、compact=true のときだけ raw と compact の両方を安全に辿れるようにすること、そして selected surfaces に限定して deterministic な context/output savings を深めることである。

## 2. RTK 再評価サマリ（何を採る/採らない）

| 区分 | 判断 | この tranche での扱い |
|---|---|---|
| tee + raw artifact path hint | 採用 | compact 実行時のみ raw JSON を deterministic path に保存し、compact response に path と full output hint を載せる |
| deterministic file/artifact summarization profiles | 部分採用 | JS の plain object / helper ベースで導入し、LLM 要約や汎用 DSL にはしない |
| permission / guard surfaces | 部分採用 | raw artifact write は repo 配下の許可ディレクトリに限定し、compact=false では書かない |
| declarative profiles | 部分採用 | `surface -> profile` の宣言的マップに留め、hook pack には拡張しない |
| size-budget measurement/tracking | Adopt later | 今回は size/contract test までに留め、継続的な計測基盤は作らない |
| shell hook / proxy rewrite | Reject | CLI/MCP の既存経路内で完結させる |
| telemetry | Reject | repo の用途に対して過剰なため導入しない |
| Claude session mining / discover | Reject | repo の責務外 |
| generic hook pack architecture | Reject | 抽象化コストが高く、現段階では過剰 |

## 3. In Scope / Out of Scope

### In Scope

- `reach` / `twitter-read` / `market-intel` / `observe` の既存 compact 対応面のみ
- compact surface 用 raw-output artifact helper の追加
- compact response に deterministic artifact path / full output hint を加える additive contract 拡張
- selected large outputs 向け deterministic summarizer profiles の追加
- core helper を使った CLI/MCP の compact 処理の揃え込み
- size / contract behavior を固定する unit test と必要最小限の surface test 更新
- RTK-specific rationale を反映する research doc 更新

### Out of Scope

- compact mode の default-on 化
- compact 未対応 surface への一斉展開
- shell hook / proxy / rewrite 層の追加
- telemetry / metrics 送信
- raw vs compact の継続的サイズ追跡ダッシュボード
- DSL ベースの profile system
- LLM summarization
- 汎用 artifact framework 化

## 4. 変更対象ファイル（create/update/conditional）

### Create

- `docs/exec-plans/active/rtk-context-savings-tranche_20260416_0956.md`
- `src/core/output-artifacts.js`
- `src/core/output-summary-profiles.js`
- `tests/output-artifacts.test.js`

### Update

- `src/core/output-compaction.js`
- `src/core/index.js`
- `src/tools/reach.js`
- `src/tools/twitter-read.js`
- `src/tools/market-intel.js`
- `src/tools/observe.js`
- `src/cli/commands/reach.js`
- `src/cli/commands/twitter-read.js`
- `src/cli/commands/market-intel.js`
- `src/cli/commands/observe.js`
- `tests/output-compaction.test.js`
- `docs/research/latest/external-agent-pattern-comparison.md`

### Conditional

- `tests/reach.test.js`
- `tests/twitter-read.test.js`
- `tests/market-intel.test.js`
- `tests/observability.test.js`

条件付き更新の判断基準:
- compact response の top-level contract まで surface test で固定した方が安全な場合のみ更新する
- unit test だけで十分に contract を担保できるなら触らない

## 5. active exec-plan との衝突有無

確認結果: 本 plan 自身を除き、`docs/exec-plans/active/` 配下に他の進行中 plan は存在しない。  
したがって本 plan は **他 active plan との明示的な衝突なし** と判断する。

no-overlap check:
- active exec-plan: 本 plan のみ
- compact / RTK 深掘りと同系統の未完了 plan: 確認できず
- 既存 completed plan / research doc との関係: 既存 tranche の継続拡張であり、置換ではなく加算実装

## 6. tranche implementation steps as checkbox list

- [x] **Tranche 0 / contract inventory**: 現行 compact surfaces（`reach` / `twitter-read` / `market-intel` / `observe`）の response shape と preserved meta keys を整理し、additive に拡張すべき contract を固定する
- [x] **Tranche 1 / RED**: `tests/output-artifacts.test.js` を追加し、deterministic path、guard、compact-only write、path traversal 防止の失敗テストを先に書く
- [x] **Tranche 1 / RED**: `tests/output-compaction.test.js` に artifact path / full output hint / profile-based compact shape / size contract の失敗テストを追加する
- [x] **Tranche 2 / helper**: `src/core/output-artifacts.js` を追加し、compact 時のみ raw payload を repo 配下の deterministic path に保存する helper を実装する
- [x] **Tranche 2 / profiles**: `src/core/output-summary-profiles.js` を追加し、selected large outputs 向け profile（long text、ranked list、post list、observe artifact summary など）を定義する
- [x] **Tranche 3 / compaction core**: `src/core/output-compaction.js` を更新し、profile 読み込み、artifact path/hint 付与、既存 `raw_hint` 互換維持、meta key preservation を整理する
- [x] **Tranche 4 / MCP adoption**: `src/tools/reach.js`、`src/tools/twitter-read.js`、`src/tools/market-intel.js`、`src/tools/observe.js` を更新し、compact=true のときだけ raw artifact helper + compact renderer を通す
- [x] **Tranche 4 / CLI adoption**: `src/cli/commands/reach.js`、`src/cli/commands/twitter-read.js`、`src/cli/commands/market-intel.js`、`src/cli/commands/observe.js` を更新し、CLI でも同一 compact contract を返すように揃える
- [x] **Tranche 5 / GREEN**: 追加テストを通し、compact=false の full result と既存 public interface が変わっていないことを確認する
- [x] **Tranche 5 / REFACTOR**: profile 名称、helper 境界、CLI/MCP 間の重複を整理し、`output-compaction.js` の肥大化を抑える
- [x] **Tranche 6 / docs**: `docs/research/latest/external-agent-pattern-comparison.md` を更新し、RTK 再評価の採用・部分適応・後回し・不採用を今回 tranche の形で明文化する

## 7. RED → GREEN → REFACTOR を含むテスト戦略

### RED

先に以下の失敗テストを追加する。

- raw artifact path が同一 surface / 同一入力条件で deterministic に決まること
- artifact write が許可ディレクトリ外へ出ないこと
- compact=false では artifact を生成しないこと
- compact payload が既存メタデータを壊さず、`raw_hint` を維持したまま `artifact path` と `full output hint` を加算で返すこと
- selected profiles が surface ごとに deterministic に縮約すること
- compact payload が full payload より小さいこと（最低限の size contract）
- `observe` の既存 `bundle_dir` / `artifacts` と競合しないこと

### GREEN

最小実装で以下を満たす。

- helper 追加だけで selected surfaces の compact contract を統一できる
- compact=true のときだけ raw artifact write が発生する
- `observe` は既存 artifact bundle を壊さず、必要ならそれを compact hint に再利用できる
- compact=false の既存戻り値を変えない
- Node 20 + 既存依存だけで完結する

### REFACTOR

- surface ごとの条件分岐を profile map に寄せる
- CLI/MCP の compact 分岐を core helper 利用に揃える
- fixture / assertion の重複を整理する
- `src/core/output-compaction.js` の責務が増えすぎる場合は helper 分離を保つ

### カバレッジ方針

- 変更対象 core utility は unit test で主要分岐 80% 以上を狙う
- surface 契約差分は必要最小限の integration 寄り test で補う
- 既存 test suite を通して副作用の有無を確認する

## 8. Validation commands

```bash
node --test tests/output-compaction.test.js tests/output-artifacts.test.js
npm test
npm run test:all
git --no-pager diff --check
```

必要時のみ:

```bash
npm run test:e2e
```

## 9. Risks / watchpoints

- **path determinism の定義ぶれ**: timestamp 依存を強くしすぎると不安定になるため、surface 名・入力 key・既存 metadata の使い方を先に固定する必要がある
- **compact contract 破壊**: 既存 `raw_hint` や preserved meta keys を壊さず、加算的変更に留めること
- **artifact write の安全性**: repo 配下の許可ディレクトリに限定し、path traversal を防ぐこと
- **observe との二重管理**: 既に artifact bundle を持つため、新 helper と役割が衝突しないように既存 bundle を優先活用すること
- **過剰な profile 化**: DSL や hook pack に寄せず、selected surfaces の plain object map に留めること
- **compact=false への副作用**: write、shape、コストが変わらないことを最優先で確認すること
- **テストの brittle 化**: path や compact size の assertion は deterministic だが過度に固定しすぎないこと
