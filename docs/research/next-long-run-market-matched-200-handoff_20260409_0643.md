# Next long-run market-matched 200 handoff

- status: COMPLETED / FULL RUN COMPLETE
- scope: `long-run-us-entry-sweep-100x3` + `long-run-jp-exit-sweep-100x3`, `600 runs`, `2000-01-01 -> latest`, TradingView live execution
- execution mode: single-worker `worker1:172.31.144.1:9223`

## What changed

1. US 100 symbols / JP 100 symbols の market-matched 3+3 campaign を live で完走した
2. recovered artifact を `docs/references/backtests/` に固定した
3. latest handoff / results / session log と generation routing を更新した
4. latest result を raw recovered artifact から再集計する **rich Japanese report** に更新した
5. `next-long-run-market-matched-200-combined-ranking_20260409_1525.json` を追加し、top 5 Pine export の元データを固定した
6. 次段の `next-long-run-*-finetune-100x10` campaign と bundle runner / Pine export script を追加した

## Execution policy used in this round

1. dual-worker readiness は事前に再検証した
2. worker2 は visible Session1 で `welcome` を解消し、individual warm-up までは success した
3. ただし distinct parallel smoke では worker2 が 2 回連続で `metrics_unreadable`
4. ユーザー承認のもと、今回の本番 batch は **worker1 単独** に切り替えた
5. 数値の正本は raw stdout ではなく `recovered-results.json` / `recovered-summary.json` を採用した

## Phase coverage

| campaign | smoke | pilot | full |
| --- | ---: | ---: | ---: |
| `long-run-us-entry-sweep-100x3` | `30/30` | `75/75` | `300/300` |
| `long-run-jp-exit-sweep-100x3` | `30/30` | `75/75` | `300/300` |

- aggregate recovered coverage:
  - smoke: `60/60`
  - pilot: `150/150`
  - full: `600/600`

## Full ranking signal

### US entry sweep

| preset | avg net profit | avg profit factor | wins |
| --- | ---: | ---: | ---: |
| `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 9741.65 | 1.438 | 75 |
| `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | 8652.78 | 1.378 | 72 |
| `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | 8489.42 | 1.444 | 79 |

### JP exit sweep

| preset | avg net profit | avg profit factor | wins |
| --- | ---: | ---: | ---: |
| `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 8548.16 | 1.668 | 75 |
| `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | 8105.93 | 2.332 | 75 |
| `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide` | 7693.68 | 1.655 | 73 |

## Interpretation

- **US** は avg net では `50-20 strict-entry-early` が首位を維持した
- 一方で **profit factor / wins は `60-20 strict-entry-late` が最良** で、100-symbol へ拡張しても early vs late の二強構図が残った
- **JP** は avg net が `55-20 tight` の首位を維持した一方、risk-adjusted には `55-18 tight-exit-tight` が依然として優位
- したがって market ごとの最有力は引き続き
  1. US: `50-20 early` を第一候補、`60-20 late` を risk-adjusted 対抗
  2. JP: `55-18 exit-tight` を本命、`55-20 tight` を avg-net control
- 今回の main blocker は strategy quality ではなく、なお **worker2 の parallel metrics read 安定化** に残っている

## Next decision gate

1. **US** は `50-20 early` と `60-20 late` の優位が bucket / sector でどう分かれるかを切り分ける
2. **JP** は `55-20` と `55-18` の差を dominant winner 銘柄込みで分解する
3. worker2 は distinct parallel smoke を連続で通せるまで本線 execution へ戻さない
4. long-run fine-tune は `next-long-run-us-finetune-100x10` / `next-long-run-jp-finetune-100x10` を入口に、bundle runner の dual-worker preflight -> fallback 付きで流す
5. top 5 Pine は `docs/references/pine/next-long-run-market-matched-200_20260409_1525/` を起点に human review へ回す
