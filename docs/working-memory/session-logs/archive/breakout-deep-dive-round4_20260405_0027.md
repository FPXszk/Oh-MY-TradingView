# Session Log: breakout deep dive round4

## メタデータ

- date: `2026-04-05`
- exec-plan: `../../exec-plans/completed/breakout-deep-dive-round4_20260405_0027.md`
- mag7-raw: `../../references/backtests/breakout-deep-dive-round4_20260405.json`
- mag7-summary: `../../research/mag7-backtest-results-round4_2015_2025.md`
- alt-raw: `../../references/backtests/breakout-deep-dive-round4-alt_20260405.json`
- alt-summary: `../../research/multi-universe-backtest-results-round4_2015_2025.md`
- universes: `mag7`, `sp500-top10-point-in-time`, `mega-cap-ex-nvda`
- strategies: `20` on Mag7, `5` on alt universe rerun

## 今回やったこと

1. round2 / round3 の research docs と session log を再読し、breakout family を round4 の本線に固定した
2. short は外し、long-only の breakout 深掘りとして **Donchian 55/20・Donchian 20/10・Keltner** を軸に 20 候補へ展開した
3. `buildResearchStrategySource` を `src/core/research-backtest.js` に切り出し、research runner から再利用できる pure helper 化を行った
4. preset validation と round4 向けテストを追加し、`stop_loss` / `bollinger_2sigma_exit` / regime filter の schema を整理した
5. `npm test`、`npm run test:e2e`、`npm run test:all` を通した
6. Mag7 140 run を完走し、上位 5 戦略を抽出した
7. 上位 5 戦略を `sp500-top10-point-in-time` と `mega-cap-ex-nvda` に流し、100 run の alt 再検証を完走した

## 結果の要点

| scope | best strategy | avg_net_profit | note |
|---|---|---:|---|
| `mag7` | `donchian-20-10-hard-stop-8pct` | 36087.16 | round4 全体トップ |
| `sp500-top10-point-in-time` | `donchian-20-10-hard-stop-8pct` | 10888.29 | alt でも首位維持 |
| `mega-cap-ex-nvda` | `donchian-20-10-hard-stop-8pct` | 10086.88 | NVDA を除いても首位維持 |

## round4 で見えたこと

1. breakout 深掘りの中心は **Donchian family** で問題なかった
2. `donchian-20-10-hard-stop-8pct` は Mag7 と alt の両方で最も利益保持力が高かった
3. `donchian-55-20-spy-filter` / `donchian-55-20-rsp-filter` は純利益より PF / DD 改善の文脈で有力だった
4. `2σ exit` は勝率向上には効くが、今回の主目的であるトレンド捕捉では早仕舞いが強かった
5. `no averaging down` の確認用 preset は baseline と同値で、現行生成ロジックでは実質的に既に抑制されていた

## 関連ファイル

- Mag7 results: [`../../research/mag7-backtest-results-round4_2015_2025.md`](../../research/mag7-backtest-results-round4_2015_2025.md)
- alt results: [`../../research/multi-universe-backtest-results-round4_2015_2025.md`](../../research/multi-universe-backtest-results-round4_2015_2025.md)
- Mag7 raw: [`../../references/backtests/breakout-deep-dive-round4_20260405.json`](../../references/backtests/breakout-deep-dive-round4_20260405.json)
- alt raw: [`../../references/backtests/breakout-deep-dive-round4-alt_20260405.json`](../../references/backtests/breakout-deep-dive-round4-alt_20260405.json)
