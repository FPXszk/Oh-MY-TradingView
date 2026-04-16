# Long-run cross-market campaign handoff

- status: IMPLEMENTED / FULL RUN COMPLETE
- scope: 5 preset strategies × 100 curated symbols, `2000-01-01 -> latest`, dual-worker TradingView execution

## What changed

1. campaign execution path を新設した
   - `src/core/campaign.js`
   - `scripts/backtest/run-long-campaign.mjs`
   - `scripts/backtest/recover-campaign.mjs`
2. CLI preset backtest に date override を通した
   - `src/cli/commands/backtest.js`
   - `src/core/backtest.js`
3. live JP symbol drift に対応した
   - `src/core/price.js`
   - `TSE_DLY:*` を `TSE:*` と整合
4. curated 100-symbol universe と exact 5 preset shortlist を config 化した
   - `config/backtest/universes/long-run-cross-market-100.json`
   - `config/backtest/campaigns/long-run-cross-market-100x5.json`
5. tests と command guide を更新した
   - `tests/campaign.test.js`
   - `tests/price.test.js`
   - `docs/command.md`
6. review follow-up として campaign success / fingerprint 判定を補強した
   - degraded fallback success を `unreadable` 扱いしない
   - fingerprint に universe と matrix run keys hash を含める

## Live results

### smoke

- recovered summary: `47 success / 3 unreadable / 0 failure / 50 total`
- average successful run: `20.40s`
- unreadable は rerun 後も 3 件残った

### pilot

- recovered summary: `110 success / 15 unreadable / 0 failure / 125 total`
- attempts: `218`
- wall-clock: 約 `46 分`
- average successful run: `20.35s`
- unresolved はすべて `metrics_unreadable`

### full

- first full completion:
  - `438 success / 62 unreadable / 0 failure / 500 total`
  - attempts: `872`
- extra resume from `checkpoint-872.json`:
  - `485 success / 15 unreadable / 0 failure / 500 total`
  - attempts: `965`
- wall-clock:
  - `2026-04-07T18:19:48Z -> 2026-04-07T21:43:44Z`
- by market:
  - US: `245 ok / 5 unreadable`
  - JP: `240 ok / 10 unreadable`

### full ranking signal

| preset | ok | unreadable | avg net profit | avg profit factor | wins |
| --- | ---: | ---: | ---: | ---: | ---: |
| `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | 97 | 3 | 7139.06 | 2.307 | 39 |
| `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 97 | 3 | 8501.69 | 1.554 | 33 |
| `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 97 | 3 | 8386.17 | 1.654 | 22 |
| `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early` | 98 | 2 | 8465.28 | 1.551 | 6 |
| `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide` | 96 | 4 | 8090.74 | 1.642 | 0 |

### interpretation

- dual-worker long-run campaign は **実運用可能**
- ただし broader universe では unreadable rerun cost がはっきり増える
- pilot recovered success は `88%` で、smoke より悪化するが catastrophic ではない
- full 500 run は extra resume を含めて **485/500 = 97.0%** まで回収できた
- 次の戦略改善候補は、wins が最多の preset5 と、avg net profit が最も高い preset2 を中心に見るのが自然
- preset3 breadth-quality-balanced-wide は今回の 100-symbol campaign では勝ち筋が弱く、次段 shortlist から外す候補

## Operational notes

- 正本は raw stdout ではなく `artifacts/campaigns/<campaign-id>/<phase>/recovered-summary.json`
- checkpoint shell stdout は長時間実行だと読みにくくなるため、進捗確認は checkpoint JSON 直読みに寄せる
- JP symbol は live で `TSE_DLY` へ settle することがあり、その normalize なしでは false-negative が出る
- resume は `campaign_id`, `phase`, fingerprint を検証し、foreign checkpoint 混入を避ける

## Current recommendation

1. 次ラウンドは preset5 / preset2 を主軸に parameter sweep か entry/exit variation を掘る
2. preset3 breadth-quality-balanced-wide は置き換え候補として扱う
3. 残 unreadable 15 件は symbol-specific retry bucket として別管理に切り出す
