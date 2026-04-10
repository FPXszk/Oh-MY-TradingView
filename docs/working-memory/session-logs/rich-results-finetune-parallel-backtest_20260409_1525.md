# Session log: rich results + fine-tune parallel backtest

## Goal

- 直近の market-matched 200 artifact を、人間向けに読みやすい日本語 result に作り直す
- 次段の long-run fine-tune 20 strategy batch の入口を作る
- top 5 Pine source を durable に残し、次回 human review へつなぐ

## What was recovered first

- latest docs:
  - `docs/research/latest/next-long-run-market-matched-200-handoff_20260409_0643.md`
  - `docs/research/latest/next-long-run-market-matched-200-results_20260409_0643.md`
- session log:
  - `docs/working-memory/session-logs/next-long-run-market-matched-200_20260409_0643.md`
- raw artifacts:
  - `docs/references/backtests/long-run-us-entry-sweep-100x3-full-recovered_20260409_0643.json`
  - `docs/references/backtests/long-run-jp-exit-sweep-100x3-full-recovered_20260409_0643.json`

## Changes made

1. `src/core/campaign-report.js` を追加し、recovered artifact から strategy-level / symbol-level 指標を pure helper で再集計できるようにした
2. `tests/campaign-report.test.js` を追加し、RED -> GREEN で集計ロジックを固定した
3. `config/backtest/campaigns/next-long-run-us-finetune-100x10.json` を追加した
4. `config/backtest/campaigns/next-long-run-jp-finetune-100x10.json` を追加した
5. `scripts/backtest/generate-rich-report.mjs` を追加し、latest result doc を raw artifact から再生成できるようにした
6. `scripts/backtest/run-finetune-bundle.mjs` を追加し、dual-worker preflight 前提の phase orchestration と single-worker fallback の入口を作った
7. `scripts/backtest/export-top-pine.mjs` を追加し、combined ranking から top 5 Pine source export をできるようにした
8. `docs/research/latest/next-long-run-market-matched-200-results_20260409_0643.md` を rich report に更新した
9. `docs/references/backtests/next-long-run-market-matched-200-combined-ranking_20260409_1525.json` を追加した
10. `docs/references/pine/next-long-run-market-matched-200_20260409_1525/` に top 5 Pine source と manifest を出力した

## Validation snapshots

- `node --test tests/campaign-report.test.js tests/campaign.test.js` -> success
- `node scripts/backtest/run-finetune-bundle.mjs --dry-run` -> success
- worker1 status:
  - `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status` -> success
- worker2 status:
  - `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status` -> failure

## Operational decision

- Pine は **source export まで完了**。`--apply` で local chart へ順次適用できる script は追加したが、今回の pass では shared active chart を不用意に変更しないため auto-apply は実行していない
- long-run fine-tune 実行は `run-finetune-bundle.mjs` を入口にできる状態まで整備したが、worker2 が不安定なため、本番時は dual-worker preflight の結果次第で `9223` fallback を使う前提

## Next recommended actions

1. `node scripts/backtest/run-finetune-bundle.mjs --phases smoke --host 172.31.144.1 --ports 9223,9225` で smoke を実行する
2. worker2 が不安定なら `--ports 9223 --fallback-port 9223` で worker1-only に切り替える
3. full 完了後、`generate-rich-report.mjs` を新 artifact に対して再実行する
4. final ranking を使って `export-top-pine.mjs --apply` を必要なときだけ実行する

## 2026-04-09 pause snapshot

- ユーザー指示により、pilot / full 実行中の backtest をここで一旦停止した
- 停止対象:
  - shellId `36`
  - command: `node scripts/backtest/run-finetune-bundle.mjs --phases pilot,full --host 172.31.144.1 --ports 9223 --fallback-port 9223`

### Latest execution state

1. smoke は worker1-only fallback で立て直し済み
   - US smoke: `100/100`, `failure: 0`, `unreadable: 0`
   - JP smoke: `100/100`, `failure: 0`, `unreadable: 0`
2. dual-worker (`9223,9225`) は smoke 時点で不安定
   - US initial smoke: `63/100`
   - JP initial smoke: `2/100`
   - 以後の本線は `9223` 単独へ切り替えた
3. pilot は US のみ途中まで進行
   - latest checkpoint: `results/campaigns/next-long-run-us-finetune-100x10/pilot/checkpoint-50.json`
   - snapshot: `50 attempts / 50 success / 0 unreadable / 0 failure`
   - started_at: `2026-04-09T17:53:11.993Z`
   - latest_finished_at: `2026-04-09T18:11:04.039Z`
4. JP pilot は未着手
5. full は未着手

### Resume commands

1. US pilot を checkpoint から再開

```bash
node scripts/backtest/run-long-campaign.mjs next-long-run-us-finetune-100x10 --phase pilot --host 172.31.144.1 --ports 9223 --resume results/campaigns/next-long-run-us-finetune-100x10/pilot/checkpoint-50.json
```

2. JP pilot を worker1-only で開始

```bash
node scripts/backtest/run-long-campaign.mjs next-long-run-jp-finetune-100x10 --phase pilot --host 172.31.144.1 --ports 9223
```

3. pilot 完了後に full を worker1-only で実行

```bash
node scripts/backtest/run-finetune-bundle.mjs --phases full --host 172.31.144.1 --ports 9223 --fallback-port 9223
```

4. full 完了後に docs / ranking / Pine export を更新

```bash
node scripts/backtest/generate-rich-report.mjs ...
node scripts/backtest/export-top-pine.mjs ...
```
