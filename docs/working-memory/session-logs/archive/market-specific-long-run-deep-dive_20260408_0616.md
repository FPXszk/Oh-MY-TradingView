# Session log: market-specific long-run deep dive

## Goal

- 前回の `long-run-cross-market-100x5` 結果を踏まえ、US は entry period、JP は exit period を切り分ける deep dive を live で完走する
- 結果を durable doc / session log / raw artifact に落とす

## Starting point

- source campaign: `long-run-cross-market-100x5`
- prior recovered summary: `485 success / 15 unreadable / 500 total`
- prior market signal:
  - US: `regime-60 strict entry-early` family 優勢
  - JP: `regime-55 tight exit-tight` family 優勢

## Readiness work completed first

- added configs:
  - `config/backtest/universes/long-run-us-50.json`
  - `config/backtest/universes/long-run-jp-50.json`
  - `config/backtest/campaigns/long-run-us-entry-sweep-50x3.json`
  - `config/backtest/campaigns/long-run-jp-exit-sweep-50x3.json`
- updated:
  - `tests/campaign.test.js`
  - `docs/command.md`
  - `docs/research/latest/README.md`
- validation:
  - `npm test`
  - `node --test tests/campaign.test.js`
  - both success

## Environment recovery

- WSL から `cmd.exe /c start` で TradingView Desktop worker を再起動した
- `9223` は backtest ready まで回復した
- `9225` は welcome / onboarding dialog が残り、`status` は通っても execution-ready には戻らなかった
- consequence:
  - this round は **worker1 single-worker** に切り替えて続行した

## Live execution summary

### Smoke

- US: `30 success / 0 unreadable / 0 failure`
- JP: `30 success / 0 unreadable / 0 failure`

### Pilot

- US: `75 success / 0 unreadable / 0 failure`
- JP: `75 success / 0 unreadable / 0 failure`

### Full

- US: `150 success / 0 unreadable / 0 failure`
- JP: `150 success / 0 unreadable / 0 failure`
- combined: `300 success / 0 unreadable / 0 failure`

## Full ranking takeaways

### US

- avg net leader:
  - `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` `7132.97`
- PF / wins leader:
  - `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`
  - `avg PF 1.415`, `wins 40`
- read:
  - `55-20 strict` baseline よりも early / late variant の方が強い
  - avg net だけなら early、risk-adjusted なら late が見える

### JP

- avg net leader:
  - `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` `9862.73`
- PF / wins leader:
  - `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
  - `avg PF 3.331`, `wins 38`
- read:
  - avg net は `55-20` と `55-18` で実質同点
  - risk-adjusted には `55-18 exit-tight` が最有力

## Dominant symbols worth isolating next

- US:
  - `AAPL`
  - `CAT`
  - `LMT`
  - `DIS`
  - `XLK`
- JP:
  - `TSE:8002`
  - `TSE:9984`
  - `TSE:6501`
  - `TSE:8058`
  - `TSE:8001` / `TSE:8306`

## Durable outputs created

- latest docs:
  - `docs/research/market-specific-long-run-deep-dive-handoff_20260408_1857.md`
  - `docs/research/market-specific-long-run-deep-dive-results_20260408_1857.md`
- raw references:
  - `docs/references/backtests/long-run-us-entry-sweep-50x3-smoke-recovered_20260408_1857.json`
  - `docs/references/backtests/long-run-us-entry-sweep-50x3-pilot-recovered_20260408_1857.json`
  - `docs/references/backtests/long-run-us-entry-sweep-50x3-full-recovered_20260408_1857.json`
  - `docs/references/backtests/long-run-jp-exit-sweep-50x3-smoke-recovered_20260408_1857.json`
  - `docs/references/backtests/long-run-jp-exit-sweep-50x3-pilot-recovered_20260408_1857.json`
  - `docs/references/backtests/long-run-jp-exit-sweep-50x3-full-recovered_20260408_1857.json`

## Final recommendation

1. US は `50-20 early` vs `60-20 late` を sector / bucket 別に再比較する
2. JP は `55-18 exit-tight` を本命にしつつ、`55-20` を control として残す
3. worker2 は manual login / onboarding 修復完了まで本線 execution へ戻さない
