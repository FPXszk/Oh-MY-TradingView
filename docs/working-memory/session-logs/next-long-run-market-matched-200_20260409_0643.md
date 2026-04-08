# Session log: next long-run market-matched 200

## Goal

- 最新の market-specific long-run deep dive を踏まえ、US 100 + JP 100 の market-matched 3+3 を live で完走する
- 結果を durable doc / session log / raw artifact に落とす

## Starting point

- source docs:
  - `docs/research/market-specific-long-run-deep-dive-handoff_20260408_1857.md`
  - `docs/research/market-specific-long-run-deep-dive-results_20260408_1857.md`
- prior market signal:
  - US: `50-20 early` vs `60-20 late`
  - JP: `55-18 exit-tight` vs `55-20 tight`

## Readiness work completed first

- added configs:
  - `config/backtest/universes/long-run-us-100.json`
  - `config/backtest/universes/long-run-jp-100.json`
  - `config/backtest/campaigns/long-run-us-entry-sweep-100x3.json`
  - `config/backtest/campaigns/long-run-jp-exit-sweep-100x3.json`
- updated:
  - `tests/campaign.test.js`
  - `command.md`
  - `docs/exec-plans/active/next-long-run-market-matched-200_20260409_0115.md`
- validation:
  - `node --test tests/campaign.test.js`
  - `npm test`
  - both success

## Dual-worker probe before fallback

- worker2 を Task Scheduler `/IT` で visible Session1 に載せ直した
- `welcome` は解消し、worker1 / worker2 とも `status` success まで回復した
- individual warm-up:
  - worker1 success
  - worker2 success
- distinct parallel smoke:
  - worker1 success
  - worker2 `metrics_unreadable`
  - re-warm 後に再試行しても worker2 `metrics_unreadable`
- consequence:
  - ユーザー承認のもと、この round は **worker1 single-worker** に切り替えて続行した

## Live execution summary

### Smoke

- US: `30 success / 0 unreadable / 0 failure`
- JP: `30 success / 0 unreadable / 0 failure`

### Pilot

- US: `75 success / 0 unreadable / 0 failure`
- JP: `75 success / 0 unreadable / 0 failure`

### Full

- US: `300 success / 0 unreadable / 0 failure`
- JP: `300 success / 0 unreadable / 0 failure`
- combined: `600 success / 0 unreadable / 0 failure`

## Full ranking takeaways

### US

- avg net leader:
  - `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` `9741.65`
- PF / wins leader:
  - `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`
  - `avg PF 1.444`, `wins 79`
- read:
  - `55-20 strict` は 100-symbol 拡張後も二番手群より一段弱い
  - avg net は early、risk-adjusted は late という分離が続いた

### JP

- avg net leader:
  - `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` `8548.16`
- PF leader:
  - `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
  - `avg PF 2.332`
- read:
  - avg net は `55-20` が優位
  - risk-adjusted には `55-18 exit-tight` が最有力

## Dominant symbols worth isolating next

- US:
  - `NVDA`
  - `AAPL`
  - `META`
  - `BLK`
  - `GS` / `CAT`
- JP:
  - `TSE:8002`
  - `TSE:6506`
  - `TSE:9984`
  - `TSE:5802`
  - `TSE:8058`

## Durable outputs created

- latest docs:
  - `docs/research/latest/next-long-run-market-matched-200-handoff_20260409_0643.md`
  - `docs/research/latest/next-long-run-market-matched-200-results_20260409_0643.md`
- raw references:
  - `docs/references/backtests/long-run-us-entry-sweep-100x3-smoke-recovered_20260409_0643.json`
  - `docs/references/backtests/long-run-us-entry-sweep-100x3-pilot-recovered_20260409_0643.json`
  - `docs/references/backtests/long-run-us-entry-sweep-100x3-full-recovered_20260409_0643.json`
  - `docs/references/backtests/long-run-jp-exit-sweep-100x3-smoke-recovered_20260409_0643.json`
  - `docs/references/backtests/long-run-jp-exit-sweep-100x3-pilot-recovered_20260409_0643.json`
  - `docs/references/backtests/long-run-jp-exit-sweep-100x3-full-recovered_20260409_0643.json`

## Generation housekeeping

- new latest:
  - `docs/research/latest/next-long-run-market-matched-200-*`
- previous generation moved to `docs/research/`:
  - `market-specific-long-run-deep-dive-*`
- 2 generations old moved to `docs/research/old/`:
  - `long-run-cross-market-campaign-handoff_20260408_0320.md`

## Final recommendation

1. US は `50-20 early` と `60-20 late` を bucket / sector 単位で比較する
2. JP は `55-18 exit-tight` と `55-20 tight` を dominant winner の寄与込みで再評価する
3. worker2 は distinct parallel smoke を安定通過するまで本線 execution に戻さない
