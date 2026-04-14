# Exec Plan: register-next-long-run-us-jp-12x10_20260414_0009

## 1) 背景 / 目的

先ほど選定した **上位 5 戦略を少し拡張した 10 戦略セット** を、次の実行候補として repo に登録する。  
対象は **US / JP それぞれ 12 銘柄（3カテゴリ × 4銘柄）**、期間は **2000-01-01 〜 現在相当 (`2099-12-31`)** とし、既存の `campaign / universe / latest docs / session log` パターンに沿って整備する。

今回の目的は、以下を **実装前に確定した計画として固定化** すること。

- US / JP 用の 12-symbol universe を新規登録する
- 10-strategy campaign を US / JP それぞれ新規登録する
- 既存 `docs/research/latest/` の世代管理ルールに従って最新 handoff docs を更新する
- 判断経緯を session log に残す
- 最終的に conventional commit + push まで行う前提で、変更範囲と検証手順を明文化する

## 2) 変更 / 作成 / 移動するファイル一覧

### 作成
- `docs/exec-plans/active/register-next-long-run-us-jp-12x10_20260414_0009.md`
- `config/backtest/universes/next-long-run-us-12.json`
- `config/backtest/universes/next-long-run-jp-12.json`
- `config/backtest/campaigns/next-long-run-us-12x10.json`
- `config/backtest/campaigns/next-long-run-jp-12x10.json`
- `docs/research/latest/next-long-run-us-jp-12x10-handoff_YYYYMMDD_HHMM.md`
- `docs/research/latest/next-long-run-us-jp-12x10-details_YYYYMMDD_HHMM.md`
- `docs/working-memory/session-logs/next-long-run-us-jp-12x10-registration_YYYYMMDD_HHMM.md`

### 更新
- `tests/campaign.test.js`
- `docs/research/latest/README.md`

### 移動
- `docs/research/latest/next-long-run-finetune-complete-handoff_20260413_1623.md` -> `docs/research/next-long-run-finetune-complete-handoff_20260413_1623.md`
- `docs/research/latest/next-long-run-finetune-complete-results_20260413_1623.md` -> `docs/research/next-long-run-finetune-complete-results_20260413_1623.md`
- 実装完了後: `docs/exec-plans/active/register-next-long-run-us-jp-12x10_20260414_0009.md` -> `docs/exec-plans/completed/register-next-long-run-us-jp-12x10_20260414_0009.md`

### 参照のみ
- `config/backtest/campaigns/external-phase1-run8-us-jp-top6.json`
- `config/backtest/campaigns/next-long-run-us-finetune-100x10.json`
- `config/backtest/campaigns/next-long-run-jp-finetune-100x10.json`
- `config/backtest/universes/long-run-us-100.json`
- `config/backtest/universes/long-run-jp-100.json`
- `docs/research/latest/README.md`
- `docs/research/latest/next-long-run-finetune-complete-handoff_20260413_1623.md`
- `docs/research/latest/next-long-run-finetune-complete-results_20260413_1623.md`
- `docs/working-memory/session-logs/next-strategy-candidates-docs-registration_20260411_1843.md`
- `docs/working-memory/session-logs/latest-backtest-results-consolidation_20260413_1623.md`
- `docs/working-memory/session-logs/next-strategy-update-policy_20260411_1323.md`

## 3) 実装内容と影響範囲

### 実装内容
1. **新しい universe config を 2 本追加する**
   - `next-long-run-us-12.json`
   - `next-long-run-jp-12.json`
   - 前ターンで合意済みの **US / JP 各 12 銘柄** を転記する
   - 各 universe は **3カテゴリ × 4銘柄** を既存 JSON で読める表現に合わせて保持する
   - duplicate なし、market 混在なし、ラベル表記揺れなしを保証する

2. **新しい campaign config を 2 本追加する**
   - `next-long-run-us-12x10.json`
   - `next-long-run-jp-12x10.json`
   - 前ターンで合意済みの **10 preset IDs** を登録する
   - date range は `2000-01-01` 〜 `2099-12-31`
   - phase sizing は 12-symbol 用に妥当な smoke / pilot / full を明示する
   - `execution` セクションは既存 fine-tune campaign の安全な既定値を踏襲する

3. **テストを更新する**
   - `tests/campaign.test.js` に universe / campaign の RED テストを先に追加する
   - 12-symbol universe の shape、market、duplicate、カテゴリ件数、campaign の preset 数、date range、`loadCampaign()` の matrix 件数を検証する

4. **latest docs を次世代へ更新する**
   - `docs/research/latest/README.md` を新世代向けに差し替える
   - 現 latest docs を `docs/research/` 直下へ退避する
   - 新しい latest docs では以下を記録する
     - なぜ 10 戦略になったか
     - 10 preset IDs の選定根拠
     - US / JP 各 12 銘柄と 3カテゴリ構成
     - 期間が 2000-現在である理由
     - 次の実行対象 campaign / universe IDs

5. **session log を追加する**
   - 判断経緯
   - 参照した既存 campaign / universe / latest docs
   - active plan 衝突確認
   - push 対象範囲
   - 実装時の注意点

6. **最終的な commit / push を見越す**
   - plan を completed へ移動
   - config / tests / docs / session log のみを commit 対象に限定
   - conventional commit を使う

### 影響範囲
- `loadCampaign()` が読む campaign / universe registry
- `tests/campaign.test.js` の config validation / load validation
- `docs/research/latest/` の最新世代の読み順
- `docs/working-memory/session-logs/` の履歴導線
- 将来の backtest 実行時に参照される campaign ID / universe ID

## 4) スコープ / Out of Scope

### In Scope
- US / JP 各 12-symbol universe の新規登録
- US / JP 各 10-strategy campaign の新規登録
- `tests/campaign.test.js` の追加・更新
- `docs/research/latest/` の世代更新
- session log の追加
- exec-plan の completed への移動
- commit / push までの手順化

### Out of Scope
- `config/backtest/strategy-presets.json` の追加・変更
- `src/core/*` の preset builder / runtime ロジック変更
- 新しい strategy ロジック実装
- 実 backtest の実行、結果集計、artifact 生成
- nightly workflow / self-hosted runner / `command.md` / `README.md` の運用変更
- 既存 `next-long-run-us-finetune-100x10` / `next-long-run-jp-finetune-100x10` を新 campaign に差し替えること
- 4並列化などの execution policy 変更

## 5) active plan との衝突有無

### 現在の active plan
- `docs/exec-plans/active/document-self-hosted-runner-foreground-autostart_20260412_0006.md`
- `docs/exec-plans/active/investigate-night-batch-self-hosted-queued_20260410_2307.md`
- `docs/exec-plans/active/rerun-night-batch-after-run-cmd_20260410_1714.md`
- `docs/exec-plans/active/run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md`

### 判定
- **直接のファイル衝突は基本なし**
  - これらは runner / workflow dispatch / 運用ドキュメント寄り
  - 今回は `config/backtest/{campaigns,universes}`、`tests/campaign.test.js`、`docs/research/latest/`、`docs/working-memory/session-logs/` が主対象

### 注意点
- `next-strategy-update-policy_20260411_1323` の方針により、active detached run がある間は live checkout 編集が運用上のリスクになりうる
- 実装着手時は current run / detached state の有無を確認し、必要なら安全な作業単位で進める

## 6) TDD 方針（RED / GREEN / REFACTOR）

### RED
- `tests/campaign.test.js` に以下の失敗テストを追加する
  - `next-long-run-us-12.json` が 12 銘柄・US-only・3カテゴリ×4銘柄である
  - `next-long-run-jp-12.json` が 12 銘柄・JP-only・3カテゴリ×4銘柄である
  - 両 universe に duplicate がない
  - `next-long-run-us-12x10.json` / `next-long-run-jp-12x10.json` が valid JSON shape を持つ
  - `preset_ids.length === 10`
  - `date_override.from === '2000-01-01'`
  - `date_override.to === '2099-12-31'`
  - `loadCampaign()` で symbols=12, strategies=10, matrix=120 になる

### GREEN
- universe / campaign JSON を最小構成で追加し、RED テストを通す
- 既存パターンから逸脱しない範囲で `notes` や `execution` を埋める
- latest docs / session log を追加し、README の導線を更新する

### REFACTOR
- JSON の `name` / `description` / `notes` の表現を既存 campaign と整合させる
- docs の章立てを `latest handoff` と `session log` の責務に分離する
- テストは重複 assertion をまとめつつ、意図が読める粒度を維持する
- 変更範囲が config / tests / docs に閉じていることを再確認する

## 7) 実装ステップ

- [ ] active plan と file overlap がないことを最終確認する
- [ ] `docs/working-memory/session-logs/next-strategy-update-policy_20260411_1323.md` の live checkout 保護方針を再確認する
- [ ] 合意済みの **US 12銘柄 / JP 12銘柄 / 3カテゴリ / 10 preset IDs** を source of truth として固定する
- [ ] `tests/campaign.test.js` に RED テストを追加する
- [ ] `config/backtest/universes/next-long-run-us-12.json` を作成する
- [ ] `config/backtest/universes/next-long-run-jp-12.json` を作成する
- [ ] `config/backtest/campaigns/next-long-run-us-12x10.json` を作成する
- [ ] `config/backtest/campaigns/next-long-run-jp-12x10.json` を作成する
- [ ] `tests/campaign.test.js` を GREEN 状態まで調整し、12-symbol / 10-strategy / date range / matrix を検証できるようにする
- [ ] `docs/research/latest/README.md` の current pointer を新世代に更新する
- [ ] 現在 latest の 2 文書を `docs/research/` 直下へ退避する
- [ ] `docs/research/latest/next-long-run-us-jp-12x10-handoff_YYYYMMDD_HHMM.md` を追加する
- [ ] `docs/research/latest/next-long-run-us-jp-12x10-details_YYYYMMDD_HHMM.md` を追加する
- [ ] `docs/working-memory/session-logs/next-long-run-us-jp-12x10-registration_YYYYMMDD_HHMM.md` を追加する
- [ ] docs 上で、10 戦略の選定理由 / US・JP 各 12 銘柄 / 3カテゴリ構成 / 2000-現在の期間を明記する
- [ ] `git --no-pager diff --check` と対象テストを通し、構文崩れがないことを確認する
- [ ] `npm test` を実行し、既存回帰がないことを確認する
- [ ] 差分を見直し、unrelated な `results/` artifact や運用ファイルが混ざっていないことを確認する
- [ ] review 後に exec-plan を `docs/exec-plans/completed/` へ移動する
- [ ] conventional commit を作成する
- [ ] SSH リモートへ push する

## 8) 検証コマンド

```bash
node --test tests/campaign.test.js
npm test
git --no-pager diff --check
git --no-pager diff -- config/backtest/universes config/backtest/campaigns tests/campaign.test.js docs/research docs/working-memory/session-logs docs/exec-plans
rg -n "next-long-run-(us|jp)-12|next-long-run-(us|jp)-12x10|2000-01-01|2099-12-31" config/backtest tests/campaign.test.js docs/research/latest docs/working-memory/session-logs
```

## 9) リスク / 注意点

- active detached run 中の live checkout 編集
- 前ターンで合意した候補セットの転記ミス
- latest docs の世代更新漏れ
- 12-symbol campaign の phase sizing 設計
- session log と latest docs の責務混在
- push スコープ汚染

## 10) 補足

- campaign / universe 命名は `next-long-run-{market}-12` / `next-long-run-{market}-12x10` を第一候補とする
- latest docs は `README + handoff + details` の 3 点構成を維持する
- commit message 第一候補:
  - `feat: register next long-run us jp 12x10 campaigns`
- commit 時は plan を `completed/` に移し、commit message 末尾に Co-authored-by trailer を付与する
