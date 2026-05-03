# EMA + MACD + RSI Entry Quality Focus-8 200-Pack 本番切替計画

## 概要

現在進行中の 42-pack 本番 run `25283923715` を停止し、
途中成果が残っていれば削除したうえで、
`emr-entry-quality-focus8-200pack` を対象に **Night Batch Self Hosted の本番ワークフロー** を実行する。

目的は次の 3 点。

1. 42-pack subset 本番を即停止する
2. 中途半端な 42-pack 成果物を残さない
3. focus-8 200-pack 全件を `full` で本番実行する

## 前提・スコープ

- 停止対象は `Night Batch Self Hosted` run `25283923715`
- 新しい本番対象は `config/backtest/campaigns/emr-entry-quality-focus8-200pack.json`
- universe は `focus-8`
- workflow は `.github/workflows/night-batch-self-hosted.yml`
- 本計画の範囲は **停止 / 途中成果の整理 / 200-pack 用 config 追加 / workflow 起動 / run 受理確認** まで
- 実行結果の分析 doc 作成は範囲外

## 対象ファイル

### 新規作成

| ファイル | 役割 |
|---|---|
| `docs/exec-plans/active/emr-entry-quality-focus8-200pack-production-switch_20260504_0106.md` | この計画 |
| `config/night_batch/emr-entry-quality-focus8-200pack-production-config.json` | 200-pack full 本番実行用 config |

### 変更

| ファイル | 変更内容 |
|---|---|
| なし | 既存 campaign / workflow 本体は変更しない |

### 削除しないもの

- `config/night_batch/emr-entry-quality-focus8-42pack-production-config.json`
- `config/backtest/campaigns/emr-entry-quality-focus8-42pack-smoke.json`
- `config/backtest/campaigns/emr-entry-quality-focus8-200pack.json`
- `.github/workflows/night-batch-self-hosted.yml`

## 実装内容

1. `gh run cancel 25283923715` で進行中の 42-pack production run を停止する
2. `gh run view 25283923715` と artifact 一覧確認で、途中成果があるかを確認する
3. 途中 artifact があれば GitHub API 経由で削除する
4. 200-pack 用 config を追加する
5. `Night Batch Self Hosted` を新 config で workflow_dispatch する
6. 新 run ID と初期ステータスを確認する

200-pack 用 config では以下を固定する。

- `bundle.us_campaign = "emr-entry-quality-focus8-200pack"`
- `bundle.smoke_phases = "smoke"`
- `bundle.production_phases = "full"`
- `runtime.detach_after_smoke = false`

## 実装ステップ

- [ ] run `25283923715` を cancel する
- [ ] run `25283923715` の artifact 有無を確認し、存在すれば削除する
- [ ] `config/night_batch/emr-entry-quality-focus8-200pack-production-config.json` を追加する
- [ ] `Night Batch Self Hosted` を 200-pack config で workflow_dispatch する
- [ ] `gh run list` / `gh run view` で新 run ID と起動状態を確認する
- [ ] plan を `docs/exec-plans/completed/` に移動してコミット / push する

## テスト戦略

### RED

- なし（コード修正ではなく run 切替と実行構成の変更）

### GREEN

- 対象 run `25283923715` が `cancelled` になる
- 途中 artifact が存在する場合は削除される
- 新 config を使った workflow_dispatch が正常に受理される
- 新 run が `queued` / `in_progress` / `completed` のいずれかで観測できる

### REFACTOR

- なし

## 実行後の検証コマンド

- `gh run cancel 25283923715`
- `gh run view 25283923715`
- `gh run list --workflow night-batch-self-hosted.yml --limit 5`
- `gh workflow run "Night Batch Self Hosted" --ref main --field config_path=config/night_batch/emr-entry-quality-focus8-200pack-production-config.json`

## リスク・注意点

- cancel のタイミング次第では partial artifact が既に生成されている可能性がある
- artifact 削除は GitHub API 権限や artifact 状態に依存する
- 200-pack full は 42-pack より実行時間が大きく延びる
- self-hosted runner / TradingView 状態により queue / fail が発生しうる

## 範囲外

- 200-pack の内容変更
- 42-pack config の削除
- 実行結果の研究メモ化

---

作成者: Copilot
作成日時: 2026-05-04T01:06:00+09:00
