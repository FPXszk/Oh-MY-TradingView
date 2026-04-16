# Market-specific long-run deep dive handoff

- status: COMPLETED / FULL RUN COMPLETE
- scope: `long-run-us-entry-sweep-50x3` + `long-run-jp-exit-sweep-50x3`, `300 runs`, `2000-01-01 -> latest`, TradingView live execution
- execution mode: single-worker `worker1:172.31.144.1:9223`

## What changed

1. US entry sweep と JP exit sweep の smoke / pilot / full を実運用で完走した
2. recovered artifact を `references/backtests/` に固定した
3. latest handoff / results / session log / exec plan を更新した

## Execution policy used in this round

1. `worker2:9225` は CDP 到達自体は回復したが、welcome / onboarding 問題が残り execution-ready ではなかった
2. そのため full run は **worker1 単独** に切り替えた
3. 数値の正本は raw stdout ではなく `recovered-results.json` / `recovered-summary.json` を採用した

## Phase coverage

| campaign | smoke | pilot | full |
| --- | ---: | ---: | ---: |
| `long-run-us-entry-sweep-50x3` | `30/30` | `75/75` | `150/150` |
| `long-run-jp-exit-sweep-50x3` | `30/30` | `75/75` | `150/150` |

- aggregate recovered coverage:
  - smoke: `60/60`
  - pilot: `150/150`
  - full: `300/300`

## Full ranking signal

### US entry sweep

| preset | avg net profit | avg profit factor | wins |
| --- | ---: | ---: | ---: |
| `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 7132.97 | 1.380 | 36 |
| `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | 7073.24 | 1.415 | 40 |
| `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | 6483.03 | 1.328 | 36 |

### JP exit sweep

| preset | avg net profit | avg profit factor | wins |
| --- | ---: | ---: | ---: |
| `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 9862.73 | 1.961 | 36 |
| `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | 9846.88 | 3.331 | 38 |
| `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide` | 7750.08 | 1.922 | 37 |

## Interpretation

- **US** は avg net では `50-20 strict-entry-early` が首位を維持した
- ただし差は小さく、`60-20 strict-entry-late` が profit factor / wins で上回ったため、US strict family は **early vs late の二強** と見るのが自然
- **JP** は avg net が `55-20 tight` と `55-18 tight-exit-tight` でほぼ同点だった一方、profit factor と wins は `55-18 tight-exit-tight` が明確に優勢だった
- したがって market ごとの最有力は
  1. US: `50-20 strict-entry-early` を第一候補、`60-20 strict-entry-late` を対抗
  2. JP: `55-18 tight-exit-tight` を第一候補、`55-20 tight` を control
- cross-market で 1 本に寄せるより、**US と JP で別 variant を採用する前提** の方が説明力が高い

## Next decision gate

1. **US** は `50-20 early` と `60-20 late` の差が AAPL 依存か、sector / bucket 全体で再現するかを切り分ける
2. **JP** は `55-18 exit-tight` の PF 優位が `TSE:8002` など少数大勝銘柄依存か、broad に効いているかを切り分ける
3. worker2 は今回も execution-ready ではなかったため、次回も **manual login / onboarding 修復完了までは本線に載せない**
