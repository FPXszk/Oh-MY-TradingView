# 実行計画: rich results + fine-tune parallel backtest 再開 (20260409_1525)

- ステータス: IMPLEMENT / PAUSED BY USER
- 前提ブランチ: `main`
- 種別: backtest execution / result synthesis / docs handoff

## Problem / approach

前回セッションでは、**market-matched 200 の rich report 化**と、**次段 fine-tune 用の US 10 + JP 10 campaign / bundle runner / Pine export 導線**までワークツリーに実装されている。一方で、PC シャットダウンにより **fine-tune 本番 batch（smoke -> pilot -> full）と、その generation 更新・最終 handoff は未完**のまま止まっている。

今回の再開では、既存の未コミット実装を前提に、まず dry-run と targeted validation で現状を固める。その後、**dual-worker preflight -> worker1 fallback** 方針で `next-long-run-us-finetune-100x10` / `next-long-run-jp-finetune-100x10` を段階実行し、最終的に ranking / rich result / Pine export / latest docs を次世代へ更新する。

## Current recovered state

1. 直前の本線完走は `next-long-run-market-matched-200`（US 100 x 3 + JP 100 x 3 = 600 run）
2. 勝ち筋は以下でほぼ確定済み
   - US: `50-20 strict-entry-early`（avg net） / `60-20 strict-entry-late`（risk-adjusted）
   - JP: `55-18 tight-exit-tight`（risk-adjusted） / `55-20 tight`（avg net）
3. fine-tune 用の config / runner / report/export script / tests はワークツリーに存在する
4. top 5 Pine export と current combined ranking は生成済み
5. `results/campaigns/next-long-run-*` には fine-tune 実行成果物がまだ見当たらない
6. worker2 は status / warm-up が不安定で、distinct parallel smoke 失敗履歴がある

## Goal

1. `US 10 + JP 10` の fine-tune batch を 2000-01-01 -> latest 相当で段階実行できる状態に戻す
2. smoke / pilot / full の各 phase を checkpoint / recover 付きで運用する
3. dual-worker が落ちたら worker1 単独へ自動 fallback できることを確認する
4. full 完了後に combined ranking / rich Japanese results / handoff / session log を次世代へ更新する
5. 必要時のみ top 5 Pine export を再生成し、人手 review の入口を残す

## In scope

- 既存ワークツリー変更の validation と必要最小限の修正
- `next-long-run-us-finetune-100x10`
- `next-long-run-jp-finetune-100x10`
- `scripts/backtest/run-finetune-bundle.mjs` を入口にした phase orchestration
- fine-tune 実行結果からの ranking / rich report / latest docs 生成
- 生成 artifact / session log / command handoff の更新

## Out of scope

- worker2 instability そのものの恒久修正
- 4 並列以上の運用設計
- TradingView public library への publish
- 20 戦略を両市場 200 銘柄すべてへ共通適用する 4000 run 化（ユーザー承認なしでは広げない）
- unrelated refactor

## Files to create / modify / move

### Validate / possibly modify

- `src/core/campaign-report.js`
- `src/core/index.js`
- `scripts/backtest/generate-rich-report.mjs`
- `scripts/backtest/run-finetune-bundle.mjs`
- `scripts/backtest/export-top-pine.mjs`
- `config/backtest/campaigns/next-long-run-us-finetune-100x10.json`
- `config/backtest/campaigns/next-long-run-jp-finetune-100x10.json`
- `tests/campaign-report.test.js`
- `tests/campaign.test.js`
- `package.json`
- `command.md`

### Runtime outputs to create

- `results/campaigns/next-long-run-us-finetune-100x10/{smoke,pilot,full}/...`
- `results/campaigns/next-long-run-jp-finetune-100x10/{smoke,pilot,full}/...`
- `docs/references/backtests/<next-generation-combined-ranking>_YYYYMMDD_HHMM.json`
- `docs/research/latest/<next-generation-results>_YYYYMMDD_HHMM.md`
- `docs/research/latest/<next-generation-handoff>_YYYYMMDD_HHMM.md`
- `docs/working-memory/session-logs/<next-generation-session-log>_YYYYMMDD_HHMM.md`
- `docs/references/pine/<next-generation>/manifest.json`
- `docs/references/pine/<next-generation>/01_<preset-id>.pine`
- `docs/references/pine/<next-generation>/02_<preset-id>.pine`
- `docs/references/pine/<next-generation>/03_<preset-id>.pine`
- `docs/references/pine/<next-generation>/04_<preset-id>.pine`
- `docs/references/pine/<next-generation>/05_<preset-id>.pine`

### Move during COMMIT step

- `docs/exec-plans/active/rich-results-finetune-parallel-backtest_20260409_1525.md`
  -> `docs/exec-plans/completed/rich-results-finetune-parallel-backtest_20260409_1525.md`

## Execution design

### Current fine-tune matrix

- **US**: `next-long-run-us-finetune-100x10`
  - 10 strategies
  - 100 symbols
  - date override: `2000-01-01 -> 2099-12-31`
- **JP**: `next-long-run-jp-finetune-100x10`
  - 10 strategies
  - 100 symbols
  - date override: `2000-01-01 -> 2099-12-31`

### Workload shape

- smoke: `10 symbols x 10 presets x 2 markets = 200 runs`
- pilot: `25 symbols x 10 presets x 2 markets = 500 runs`
- full: `100 symbols x 10 presets x 2 markets = 2000 runs`

### Parallel policy

1. 第一選択は `9223,9225` の dual-worker
2. `status` preflight に通った worker のみ bundle に載せる
3. phase 実行中に campaign 失敗したら、最新 checkpoint を拾って `9223` 単独へ fallback する
4. 数値の正本は `recovered-results.json` / `recovered-summary.json`
5. 長時間 batch は phase 単位で止められるようにし、summary を都度確認する

## Evaluation policy

### First-class metrics

- avg net profit
- avg profit factor
- avg max drawdown / avg max drawdown %
- avg closed trades
- avg win rate
- positive-run rate
- profit-to-drawdown ratio

### Interpretation policy

- US は entry timing family の差を主に見る
- JP は exit / stop tightening の差を主に見る
- dominant winner 依存（例: `NVDA`, `TSE:8002`）は report に明示する
- 市場ごとに最良戦略を決め、最後に combined ranking を補助的に扱う

## Test strategy (RED -> GREEN -> REFACTOR)

### RED

- まず既存変更に対して targeted test / dry-run を回し、壊れている点を確定する
- 問題が出た場合のみ、`tests/campaign-report.test.js` または `tests/campaign.test.js` に失敗ケースを追加して再現を固定する

### GREEN

- failing case を通す最小限の修正を `campaign-report` / `run-finetune-bundle` / campaign config に入れる

### REFACTOR

- 実行継続に不要な複雑化を避け、重複 helper が出たときだけ整理する

## Validation commands

### Focused validation

- `node --test tests/campaign-report.test.js tests/campaign.test.js`
- `node scripts/backtest/run-finetune-bundle.mjs --dry-run`
- `node scripts/backtest/run-long-campaign.mjs next-long-run-us-finetune-100x10 --phase smoke --dry-run`
- `node scripts/backtest/run-long-campaign.mjs next-long-run-jp-finetune-100x10 --phase smoke --dry-run`

### Repo validation

- `npm test`
- `npm run test:e2e`
- `npm run test:all`

### Operational validation

- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status`
- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status`
- `node scripts/backtest/run-finetune-bundle.mjs --phases smoke --host 172.31.144.1 --ports 9223,9225`
- 必要時 `--ports 9223 --fallback-port 9223`

## Risks

1. **worker2 instability**
   - preflight 必須
   - fallback を正規フローとして使う
2. **runtime interruption**
   - checkpoint / recover を優先
   - phase ごとに止める
3. **objective ambiguity**
   - avg net 優先か risk-adjusted 優先かを結果解釈時に明示する
4. **market scope ambiguity**
   - 現計画は `US 10 + JP 10` の market-specific fine-tune
   - 20 戦略を全 200 銘柄へ共通適用する案は承認が必要

## Implementation / execution checklist

- [ ] 現在の未コミット変更を review し、再開点を fix する
- [ ] targeted tests と dry-run で現状を固める
- [ ] 必要なら failing case を追加して最小限修正する
- [ ] worker1 / worker2 の status を再確認する
- [ ] fine-tune smoke を実行する
- [ ] dual-worker が不安定なら worker1 fallback で smoke を完走する
- [ ] smoke 成功後に pilot を実行する
- [ ] pilot 成功後に full を実行する
- [ ] full artifact から combined ranking を生成する
- [ ] next generation の rich results / handoff / session log を更新する
- [ ] 必要時のみ top 5 Pine export を再生成する
- [ ] repo validation と operational summary を残す

## Pause snapshot

- smoke は US / JP ともに worker1-only fallback で `100/100`
- dual-worker smoke は不安定で、本線から除外
- US pilot は `results/campaigns/next-long-run-us-finetune-100x10/pilot/checkpoint-50.json` まで到達した状態で停止
- JP pilot / full は未着手

## Approval-time confirmation item

1. 今回は **既存実装どおり `US 10 + JP 10` の 2000 run fine-tune** として再開する
