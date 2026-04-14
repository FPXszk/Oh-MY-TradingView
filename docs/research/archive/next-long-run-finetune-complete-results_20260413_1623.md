# Next long-run fine-tune complete results

- status: **COMPLETE / LATEST**
- style: detailed Japanese operator report
- date range: 2000-01-01 → 2099-12-31
- latest executed run: `24341576697`
- 作成日時: 2026-04-13T16:23

> **重要**: 最新の workflow success は `24353498557` ですが、これは stale schedule による **skip success** です。  
> 実際に成績まで確定した最新 run は `24341576697` です。

---

## Source artifacts

| artifact | path | status |
| --- | --- | --- |
| machine-readable summary | `../references/backtests/next-long-run-finetune-complete_20260413.summary.json` | この文書の集計正本 |
| latest run summary markdown | `../../docs/research/results/gh-run-24341576697/night-batch-24341576697-1/gha_24341576697_1-summary.md` | 実行状態の正本 |
| latest run log | `../../docs/research/results/gh-run-24341576697/night-batch-24341576697-1/gha_24341576697_1.log` | 件数・checkpoint の正本 |
| US full recovered results | `/mnt/c/actions-runner/_work/Oh-MY-TradingView/Oh-MY-TradingView/docs/research/results/campaigns/next-long-run-us-finetune-100x10/full/recovered-results.json` | 成績元データ |
| JP full recovered results | `/mnt/c/actions-runner/_work/Oh-MY-TradingView/Oh-MY-TradingView/docs/research/results/campaigns/next-long-run-jp-finetune-100x10/full/recovered-results.json` | 成績元データ |
| local smoke log | `../../docs/research/results/campaigns/external-phase1-run8-us-jp-top6/smoke-session.log` | gating 件数の正本 |
| local smoke summary | `../../docs/research/results/campaigns/external-phase1-run8-us-jp-top6/smoke/recovered-summary.json` | `60/60` 成功 |

---

## Run status summary

| run | trigger | outcome | interpretation |
| --- | --- | --- | --- |
| `24341576697` | `workflow_dispatch` | **success** | 実際に US full / JP full を完走した最新 run |
| `24353498557` | `schedule` | **success (skipped)** | stale schedule のため未実行 |
| `external-phase1-run8-us-jp-top6` smoke | local artifact | **success** | `60/60` 完走 + experiment gating あり |

### Coverage summary

| scope | success | failure | unreadable | total | note |
| --- | ---: | ---: | ---: | ---: | --- |
| US full | 1000 | 0 | 0 | 1000 | 10 presets × 100 symbols |
| JP full | 1000 | 0 | 0 | 1000 | 10 presets × 100 symbols |
| local smoke | 60 | 0 | 0 | 60 | 6 presets × 10 symbols |

---

## US full (`next-long-run-us-finetune-100x10`)

### Winner summary

| category | preset | metric |
| --- | --- | --- |
| best avg net profit | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | avg net `9752.00` |
| best avg profit factor | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | avg PF `1.446` |
| lowest avg drawdown | `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow` | avg MDD `4901.38` |

### Top strategies by avg net profit

| rank | preset | avg net | avg PF | avg MDD | avg WR | best symbol |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 9752.00 | 1.439 | 5369.88 | 43.54 | `NVDA` |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | 8933.57 | 1.422 | 5359.00 | 43.88 | `NVDA` |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier` | 8933.57 | 1.422 | 5359.00 | 43.88 | `NVDA` |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 8850.90 | 1.392 | 5303.01 | 43.03 | `NVDA` |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early` | 8850.90 | 1.392 | 5303.01 | 43.03 | `NVDA` |

### Top symbols by avg net profit

| rank | symbol | avg net | avg PF | avg MDD | avg WR | best preset |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | `NVDA` | 243065.12 | 3.108 | 32722.02 | 41.61 | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` |
| 2 | `AAPL` | 129359.65 | 3.060 | 23392.98 | 52.57 | `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow` |
| 3 | `META` | 39578.99 | 3.950 | 5820.06 | 58.74 | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` |
| 4 | `CAT` | 33343.65 | 2.168 | 7663.62 | 46.65 | `donchian-55-18-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-exit-tight` |
| 5 | `BLK` | 30851.96 | 2.642 | 6926.07 | 60.17 | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` |

### Top combos by net profit

| rank | preset | symbol | net profit | PF | MDD | WR |
| ---: | --- | --- | ---: | ---: | ---: | ---: |
| 1 | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | `NVDA` | 283607.63 | 3.138 | 35483.75 | 41.30 |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | `NVDA` | 268202.28 | 3.207 | 33633.00 | 42.22 |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | `NVDA` | 268202.28 | 3.207 | 33633.00 | 42.22 |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early` | `NVDA` | 268202.28 | 3.207 | 33633.00 | 42.22 |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | `NVDA` | 259201.46 | 2.819 | 39188.04 | 44.19 |

### Reading notes

1. **利益最大化** は `strict-entry-early` が優位でした。  
2. **品質(PF)** では `strict-entry-late` が最上位で、利益最大 preset と分離しています。  
3. `NVDA` と `AAPL` の寄与が極端に大きく、symbol-level dispersion が強い結果です。  
4. 上位 preset に**同値クラスタ**があり、`deep-pullback` family の近縁 preset がほぼ同成績帯に集まっています。

---

## JP full (`next-long-run-jp-finetune-100x10`)

### Winner summary

| category | preset | metric |
| --- | --- | --- |
| best avg net profit | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | avg net `8649.87` |
| best avg profit factor | `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | avg PF `2.430` |
| lowest avg drawdown | `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow` | avg MDD `5957.32` |

> **注意**: JP full では `closed_trades = 0` の 40 run で `profit_factor` と `win_rate` が **null** になっており、平均は利用可能値のみで計算しています。  
> それでも `net_profit` / `max_drawdown` / `closed_trades` は 1000 run で揃っています。

### Top strategies by avg net profit

| rank | preset | avg net | avg PF | avg MDD | avg WR | best symbol |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | 8649.87 | 1.745 | 6310.72 | 39.15 | `TSE:8002` |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 8548.16 | 1.737 | 6295.29 | 39.13 | `TSE:8002` |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early` | 8548.16 | 1.737 | 6295.29 | 39.13 | `TSE:8002` |
| 4 | `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early` | 8340.70 | 1.578 | 6598.93 | 39.25 | `TSE:8002` |
| 5 | `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late` | 8313.72 | 1.769 | 6309.89 | 39.21 | `TSE:8002` |

### Top symbols by avg net profit

| rank | symbol | avg net | avg PF | avg MDD | avg WR | best preset |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | `TSE:8002` | 137148.90 | 5.883 | 9171.80 | 60.84 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` |
| 2 | `TSE:5802` | 41428.50 | 3.565 | 7265.50 | 47.37 | `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow` |
| 3 | `TSE:9984` | 39355.80 | 2.176 | 14802.80 | 30.71 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` |
| 4 | `TSE:6506` | 37803.60 | 1.792 | 16097.50 | 29.35 | `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late` |
| 5 | `TSE:8058` | 26873.90 | 2.476 | 5905.90 | 51.03 | `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early` |

### Top combos by net profit

| rank | preset | symbol | net profit | PF | MDD | WR |
| ---: | --- | --- | ---: | ---: | ---: | ---: |
| 1 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | `TSE:8002` | 156998.00 | 6.687 | 10762.00 | 65.52 |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier` | `TSE:8002` | 156998.00 | 6.687 | 10762.00 | 65.52 |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | `TSE:8002` | 153557.00 | 6.201 | 9070.00 | 62.07 |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early` | `TSE:8002` | 153557.00 | 6.201 | 9070.00 | 62.07 |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | `TSE:8002` | 153557.00 | 6.201 | 9070.00 | 62.07 |

### Reading notes

1. **利益最大化** は `strict`、**PF 最適** は `tight-exit-tight` と、US と同様に「利益」と「品質」で勝ち筋が分かれました。  
2. `TSE:8002` が突出しており、JP 側は総合順位のほぼすべてに `TSE:8002` が絡みます。  
3. drawdown を最小化するなら `tight-narrow` 系が最も安定でした。  
4. PF / WR 欠損 40 run を含むため、JP は US よりも**品質指標の読みがやや保守的**です。

---

## Local smoke (`external-phase1-run8-us-jp-top6`)

### Experiment gating summary

| promoted | hold | rejected | ranked candidates |
| ---: | ---: | ---: | ---: |
| 37 | 10 | 13 | 37 |

### Top ranked candidates

| rank | preset | symbol | market | decision | net profit | PF | max DD% | confluence |
| ---: | --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| 1 | `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | `TSE:8306` | JP | promote | 25871.00 | 2.736 | 40.03 | 50 |
| 2 | `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | `TSE:1306` | JP | promote | 17002.40 | 2.692 | 25.93 | 50 |
| 3 | `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late` | `TSE:7203` | JP | promote | 19168.00 | 2.216 | 61.96 | 50 |
| 4 | `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late` | `MSFT` | US | promote | 17729.21 | 2.182 | 46.91 | 30 |
| 5 | `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | `BRK.B` | US | promote | 10692.48 | 2.163 | 48.94 | 50 |

### Reading notes

1. smoke 60 run は **全成功** で、gating では promote 37 / hold 10 / reject 13 に分かれました。  
2. 上位候補は **JP 金融・ETF** が強く、`tight-exit-tight` と `tight-entry-late` が目立ちます。  
3. local smoke は latest full とは別軸のスクリーニング結果として扱うのが適切です。

---

## Overall conclusions

1. latest 完了世代では、**US full / JP full ともに 1000/1000 成功**し、partial report 状態は解消されました。  
2. US は `strict-entry-early` が利益最大、`strict-entry-late` が PF 最大、`tight-narrow` が drawdown 最小で、用途別に winner が分かれます。  
3. JP は `strict` が利益最大、`tight-exit-tight` が PF 最大で、`TSE:8002` の寄与が非常に大きいです。  
4. local smoke では 37 candidate が promote され、特に JP 銘柄群が強い候補として残りました。  
5. 最新 workflow success 全体を見ると、**最新成功 run = 最新実行済み run ではない**ため、今後も `24353498557` のような skip success を結果本体と混同しない運用が必要です。
