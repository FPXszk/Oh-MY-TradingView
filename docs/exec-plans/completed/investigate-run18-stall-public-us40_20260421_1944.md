# Run 18 stall / public-top10-us-40x10 調査計画

作成日時: 2026-04-21 19:44 JST

## 目的

GitHub Actions `Night Batch Self Hosted` の run `24710297901` が `in_progress` のまま止まって見える原因を特定し、`checkpoint-365` 時点で何が完了していて、どこで停止またはハングしているのかを説明可能にする。

## 現時点の確認結果

- 対象 workflow run:
  - run id: `24710297901`
  - job id: `72273056371`
  - status: `in_progress`
  - GitHub API 上の `updatedAt`: `2026-04-21T07:41:07Z`
- workflow 構成上、`Run smoke gate and foreground production` が終わるまで
  - `Locate night batch outputs`
  - `Append night batch workflow summary`
  - `Upload night batch artifacts`
  は開始されない
- そのため、GitHub UI に `checkpoint-365` が見えている場合は、少なくとも production 実行本体は `365/400` 近辺まで進んだ可能性が高い
- 直前の成功 run `24705526295` では `public-top10-us-40x10/full/checkpoint-245.json` まで確認されている
- campaign 定義:
  - `config/backtest/campaigns/current/public-top10-us-40x10.json`
  - universe: `public-top10-us-40`
  - full は `10 strategies × 40 symbols = 400 runs`
- universe 定義 `config/backtest/universes/current/public-top10-us-40.json` は US 銘柄と US ETF のみで、JP 銘柄は含まれない

## 調査・確認対象ファイル

### 確認対象

- `.github/workflows/night-batch-self-hosted.yml`
- `scripts/windows/run-night-batch-self-hosted.cmd`
- `scripts/windows/github-actions/find-night-batch-outputs.ps1`
- `scripts/windows/github-actions/append-night-batch-workflow-summary.ps1`
- `python/night_batch.py`
- `scripts/backtest/run-long-campaign.mjs`
- `config/night_batch/bundle-foreground-reuse-config.json`
- `config/backtest/campaigns/current/public-top10-us-40x10.json`
- `config/backtest/universes/current/public-top10-us-40.json`
- `docs/reports/night-batch-self-hosted-run17.md`

### 変更候補

- `docs/reports/night-batch-self-hosted-run18.md`
- 必要なら関連コードや workflow

## 実施内容と影響範囲

- GitHub Actions の run / job metadata とログ可視範囲を確認し、実際に stale なのか、単に長時間実行中なのかを切り分ける
- `checkpoint-365` の意味を、campaign matrix と checkpoint 生成仕様から明確にする
- workflow の step 境界と `night_batch.py` / `run-long-campaign.mjs` の責務を追い、停止点候補を特定する
- 可能なら runner 側 state / summary / heartbeat の有無を確認し、workflow 側表示との齟齬を説明する
- 原因がコード不具合・運用 stale・TradingView 固有停止のどれに近いかを整理する

## 実装ステップ

- [ ] GitHub run `24710297901` の job 状態、更新時刻、ログ取得可否を確認する
- [ ] `checkpoint-365` が 400 runs 中のどこを意味するかを、campaign と checkpoint 仕様から整理する
- [ ] workflow の step 構造を読み、`checkpoint-365` が見えているのに job が閉じない経路を洗い出す
- [ ] `python/night_batch.py` と `scripts/backtest/run-long-campaign.mjs` を確認し、production 中にハングしうる箇所を特定する
- [ ] 利用可能な local / artifact / state 情報から、GitHub UI 停止と TradingView 画面状態の関係を説明する
- [ ] 必要なら最小修正案と再発防止案をまとめる
- [ ] 調査結果をユーザーへ報告し、実装に進むか確認する

## テスト戦略

- 今回の段階は調査が主目的なので、まずはコード変更なしで原因特定を優先する
- 修正が必要と判断した場合のみ、対象箇所に対して RED -> GREEN -> REFACTOR の順で追加テストを計画する
- 想定テスト候補
  - `tests/night-batch.test.js`
  - `tests/campaign.test.js`
  - `tests/windows-run-night-batch-self-hosted.test.js`

## 検証コマンド候補

- `gh run view 24710297901`
- `gh run view 24710297901 --job 72273056371`
- `gh run view 24710297901 --log --job 72273056371`
- `node --test tests/night-batch.test.js`
- `node --test tests/campaign.test.js`

## リスクと注意点

- self-hosted runner 側の実ファイルはこの workspace から直接見えない可能性がある
- GitHub UI / API が stale な場合、run 状態と実体が一致しない可能性がある
- TradingView 画面が JP 銘柄で止まっていても、それだけで JP universe 実行とは断定できない
- 既存 active plan:
  - `night-batch-readiness-stabilization_20260416_1706.md`
  - `night-batch-summary-and-storage-followup_20260420_1123.md`
  - `theme-momentum-us40-campaign-seed_20260421_1833.md`
  と周辺領域が近いため、修正に進む場合は差分競合を丁寧に見る必要がある

## スコープ外

- この段階では commit / push は行わない
- public campaign 定義そのものの変更
- theme momentum 3-pack の実装継続
