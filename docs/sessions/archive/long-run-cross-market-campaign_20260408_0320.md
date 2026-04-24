# Session log: long-run cross-market campaign

## Goal

- 最新の strongest 系 shortlist を起点に、2000-01-01 から latest までの長期 backtest campaign を実行できるようにする
- 対象は US / JP equities と index or ETF proxy を混ぜた 100 symbols、strategy は 5 本
- dual-worker 運用で smoke -> pilot -> full を checkpoint / rerun 付きで完遂する

## Implementation summary

### campaign infrastructure

- `config/backtest/universes/long-run-cross-market-100.json`
  - US equities 40
  - JP equities 40
  - US index / ETF proxies 10
  - JP index / ETF proxies 10
- `config/backtest/campaigns/long-run-cross-market-100x5.json`
  - exact 5 preset IDs
  - `smoke`, `pilot`, `full` phase
  - `date_override: 2000-01-01 -> 2099-12-31`
  - dual-worker ports
  - checkpoint / rerun policy
- `scripts/backtest/run-long-campaign.mjs`
  - phase-aware matrix execution
  - checkpoint write
  - recovered summary / effective result aggregation
  - rerun pass orchestration
  - resume safety check (`campaign_id`, `phase`, fingerprint)
- `scripts/backtest/recover-campaign.mjs`
  - latest checkpoint から recovery 実行

### repo changes coupled to campaign execution

- `src/cli/commands/backtest.js`
  - `--date-from`, `--date-to` 追加
- `src/core/backtest.js`
  - preset load / run に date override を通す
  - merged date range validation を厳密化
- `src/core/campaign.js`
  - config validation
  - phase symbol selection
  - matrix build
  - checkpoint fingerprint
  - resumed result の current matrix filter
- `src/core/price.js`
  - `TSE_DLY:*` と `TSE:*` を同一 symbol とみなす normalize を追加
- `tests/campaign.test.js`
  - campaign config / phase / date validation / fingerprint / resume filter / date override を追加
- `tests/price.test.js`
  - `TSE_DLY` symbol match regression を追加
- `docs/command.md`
  - campaign runner と resume 運用を追記

## Live environment

- known-good topology: `172.31.144.1:9223`, `172.31.144.1:9225`
- worker status: both reachable
- operational baseline: dual-worker / `restore_policy: "skip"`

## Warm-up and symbol verification

1. worker1 warm-up
   - preset: `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
   - symbol: `AAPL`
   - date override: `2000-01-01 -> 2099-12-31`
2. worker2 warm-up
   - same preset
   - symbol: `TSE:7203`
3. notation verification
   - `TSE:1306` はそのまま通る
   - `TSE:7203` は live 上 `TSE_DLY:7203` へ settle するケースがあり、price symbol match 修正が必要だった

## Smoke phase result

- command:
  - `node scripts/backtest/run-long-campaign.mjs long-run-cross-market-100x5 --phase smoke --host 172.31.144.1 --ports 9223,9225`
- initial result:
  - `38 success / 12 unreadable / 0 failure`
- after increasing rerun coverage and resuming:
  - `47 success / 3 unreadable / 0 failure`
- recovered average successful run:
  - `20.40s`
- unresolved after reruns:
  1. preset1 × `TSE:7203`
  2. preset2 × `TSE:8306`
  3. preset4 × `SPY`

## Pilot phase result

- command:
  - `node scripts/backtest/run-long-campaign.mjs long-run-cross-market-100x5 --phase pilot --host 172.31.144.1 --ports 9223,9225`
- final recovered summary:
  - `110 success / 15 unreadable / 0 failure / 125 total`
- attempts:
  - `218`
- wall-clock:
  - `2026-04-07T17:33:03Z -> 2026-04-07T18:19:00Z`
- recovered average successful run:
  - `20.35s`
- unresolved category:
  - all `metrics_unreadable`

### Pilot breakdown

- by market
  - US: `51 ok / 9 unreadable`
  - JP: `59 ok / 6 unreadable`
- by preset
  - preset1: `22 ok / 3 unreadable`
  - preset2: `21 ok / 4 unreadable`
  - preset3: `22 ok / 3 unreadable`
  - preset4: `22 ok / 3 unreadable`
  - preset5: `23 ok / 2 unreadable`

### Pilot interpretation

- 25 symbols まで広げても `failure` は 0 で、未解決は `metrics_unreadable` のみ
- smoke より回収率は落ちるが、full を止めるほどの崩れではない
- unreadable は US index ETF と一部 JP financial / index symbols にやや寄った

## Full phase

- started:
  - `node scripts/backtest/run-long-campaign.mjs long-run-cross-market-100x5 --phase full --host 172.31.144.1 --ports 9223,9225`
- primary + built-in reruns result:
  - `438 success / 62 unreadable / 0 failure / 500 total`
  - attempts: `872`
- extra resume from `checkpoint-872.json`:
  - final recovered summary: `485 success / 15 unreadable / 0 failure / 500 total`
  - attempts: `965`
- wall-clock:
  - `2026-04-07T18:19:48Z -> 2026-04-07T21:43:44Z`
- by market:
  - US: `245 ok / 5 unreadable`
  - JP: `240 ok / 10 unreadable`
- final unreadable category:
  - all `metrics_unreadable`

### Full interpretation

- primary pass は 50% 前後で unreadable が出続けたが、rerun で大きく回収できた
- 追加 resume を 1 回挟むことで `438 -> 485 success` まで改善した
- 100 symbols × 5 strategies の 500 run を dual-worker で **97.0% coverage** まで回収できた
- failure は最後まで 0 で、残件 15 はすべて unreadable 再現に留まった

### Strategy-level takeaways

- average net profit 上位
  1. preset2 `8501.69`
  2. preset4 `8465.28`
  3. preset1 `8386.17`
- symbol-level wins 上位
  1. preset5: `39`
  2. preset2: `33`
  3. preset1: `22`
- preset5 は平均 net profit では下がるが、`avg_profit_factor: 2.307` と wins 数が最も強かった
- preset3 breadth-quality-balanced-wide は `96 ok / 4 unreadable` と coverage は悪くないが、今回の net-profit 勝ち数は `0` だった

## Tests and validation

- `npm test`
  - success
- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 npm run test:all`
  - success

## Post-review fixes

- code review で 2 件の high-severity issue を修正した
  1. `degraded_result: true` / `rerun_recommended: false` / `fallback_metrics` を持つ fallback success を campaign 側でも success 扱いに統一
  2. checkpoint fingerprint に `universe` と sorted matrix run keys hash を追加し、件数だけ同じ別 campaign checkpoint を誤 resume しないようにした
- 追加で、**fingerprint 強化前に作られた旧 checkpoint** も current matrix 内の run だけなら安全に resume できる互換層を入れた
- 対応ファイル
  - `src/core/campaign.js`
  - `scripts/backtest/run-long-campaign.mjs`
  - `tests/campaign.test.js`
- focused validation
  - `npm test -- tests/campaign.test.js tests/price.test.js`
  - success

## Interim conclusion

- long-run campaign infrastructure 自体は実機で成立した
- pilot では `88%` まで recovered success を持っていけた
- full では extra resume を含めて `97%` まで回収でき、長時間 500 run campaign の実運用可能性を確認できた
