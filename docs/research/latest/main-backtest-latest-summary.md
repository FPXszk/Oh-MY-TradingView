# Latest main backtest summary

この要約は、latest 12x10 世代の戦略結果を整理した latest summary。

## 結論

- **US の最強候補**は `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
  - avg net profit `9752.00`
  - avg profit factor `1.439`
  - avg max drawdown `5369.88`
  - best symbol `NVDA` / best net profit `283607.63`
- **JP の最強候補**は `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
  - avg net profit `8649.87`
  - avg profit factor `1.745`
  - avg max drawdown `6310.72`
  - best symbol `TSE:8002` / best net profit `153557`
- **JP の profit factor 最強**は `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
  - avg profit factor `2.430`

## 市場別トップ

### US top 5

| rank | presetId | avg_net_profit | avg_profit_factor | avg_max_drawdown |
| ---: | --- | ---: | ---: | ---: |
| 1 | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 9752.00 | 1.439 | 5369.88 |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | 8933.57 | 1.422 | 5359.00 |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier` | 8933.57 | 1.422 | 5359.00 |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 8850.90 | 1.392 | 5303.01 |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early` | 8850.90 | 1.392 | 5303.01 |

### JP top 5

| rank | presetId | avg_net_profit | avg_profit_factor | avg_max_drawdown |
| ---: | --- | ---: | ---: | ---: |
| 1 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | 8649.87 | 1.745 | 6310.72 |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 8548.16 | 1.737 | 6295.29 |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early` | 8548.16 | 1.737 | 6295.29 |
| 4 | `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early` | 8340.70 | 1.578 | 6598.93 |
| 5 | `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late` | 8313.72 | 1.769 | 6309.89 |

## strongest 30 の扱い

live の `config/backtest/strategy-presets.json` は 30 戦略まで圧縮した。

- ベース 5 本は current top 5 combined-ranking strategies
- 追加 10 本は profit-protection variants
- 追加 10 本は entry-adjusted variants
- 追加 5 本は breadth-quality-balanced-wide family
- 30 本目以降の拡張は今回の再編では採用していない

退役した preset は `docs/bad-strategy/retired-strategy-presets.json` に退避している。

## 今回わかったこと

1. **US は entry timing 差分が効く。** strict-entry-early と 10pct pullback 系が上位を占め、NVDA / AAPL が平均利益を押し上げている。
2. **JP は strict / tight family の再現性が高い。** `strict`、`tight`、`tight-exit-tight` が上位で、`TSE:8002` が突出して強い。
3. **entry / exit / narrow の sibling を潰し切るのはまだ早い。** 同じ deep-pullback family 内でも市場ごとに勝ち方が分かれている。
4. **30 本まで広げた後は拡張効果の再測定が必要。** 直近 2 世代の deep-pullback 優勢は維持しつつ、付加した profit-protection / entry-adjusted 変種の残り方を次回確認する。

## 次回改善するなら

1. `30` 本セットの次は **同一条件での full 比較**で追加変種の残り方を再検証する
2. `docs/references/backtests/` に **combined ranking の正規 artifact** を毎回残し、追加変種の判断を手作業にしない
3. `python/night_batch.py` の自動 latest summary を使い、night batch 完了後に `main-backtest-latest-summary.md` を deterministic に更新する
4. `scripts/docs/archive-stale-latest.mjs` を generation 更新時に実行し、latest/archive の stale doc を溜めない

## Live / Retired diff

- live_count: 30
- retired_count: 121
