# public-top10-us-40x10 Final 400 Run Summary

## 概要

| 項目 | 値 |
|---|---|
| campaign | `public-top10-us-40x10` |
| universe | US 40 symbols |
| strategies | public 10 strategies |
| 想定総 run 数 | `400` |
| 最終確定結果 | **success 360 / failure 40 / unreadable 0** |
| 最終扱い | **400 runs 完了扱い** |

**結論:** `public-top10-us-40x10` は最終的に **400 runs を確定**できた。  
ただし 1 戦略 `tv-public-brosio-break-and-retest` は 40/40 で失敗、残り 9 戦略は 40/40 で完走した。

---

## 根拠

最終件数は以下を合算した。

1. run 18 resume artifact summary  
   `/tmp/night-batch-24718820173/night-batch-24718820173-1/gha_24718820173_1-summary.json`
   - full は `checkpoint-365`
   - `Success: 360 / Failure: 5 / Total: 365`

2. 残り 35 本の実機再走 checkpoint  
   `artifacts/campaigns/public-top10-us-40-brosio-tail35/full/checkpoint-20.json`
   - `tv-public-brosio-break-and-retest` の tail 35 は全件 failure
   - 実機接続下で compile error を確認

したがって最終集計は:

- 既存 365 件: `success 360 / failure 5`
- tail 35 件: `success 0 / failure 35`
- 合算 400 件: `success 360 / failure 40`

---

## 戦略別最終集計

| strategy | runs | success | failure | 備考 |
|---|---:|---:|---:|---|
| `tv-public-kdj-l2` | 40 | 40 | 0 | full 完走 |
| `tv-public-masu-ultimate` | 40 | 40 | 0 | full 完走 |
| `tv-public-asian-breakout-autobot` | 40 | 40 | 0 | full 完走 |
| `tv-public-adaptive-risk-regime` | 40 | 40 | 0 | full 完走 |
| `tv-public-joat-institutional-convergence` | 40 | 40 | 0 | full 完走 |
| `tv-public-pivot-vwap-confluence` | 40 | 40 | 0 | full 完走 |
| `tv-public-brosio-break-and-retest` | 40 | 0 | 40 | 先頭 5 件失敗後に block、tail 35 再走でも全件失敗 |
| `tv-public-agni-momentum` | 40 | 40 | 0 | full 完走 |
| `tv-public-gold-hft-hybrid` | 40 | 40 | 0 | full 完走 |
| `tv-public-mtf-matrix` | 40 | 40 | 0 | full 完走 |

---

## failure の意味

`tv-public-brosio-break-and-retest` の failure は、少なくとも tail 35 の実機再走では **compile error** として確認できた。

- symbol 例: `TSLA`, `PANW`, `UBER`, `LLY`, `PLTR`
- error:
  - `The condition of the "if" statement must evaluate to a "bool" value.`
  - line 7 / severity 8

確認ソース:

- `artifacts/campaigns/public-top10-us-40-brosio-tail35/full/checkpoint-5.json`

run 18 本体で先に失敗していた先頭 5 件 (`NVDA`, `META`, `NFLX`, `AVGO`, `AMD`) は artifact log 上では `FAIL (unknown)` だが、同一 preset の tail 35 が実機環境で一貫して compile error だったため、最終レポート上は **同 preset の非成立 40 件**として集計するのが妥当。

---

## smoke 補足

smoke は `SPY 1銘柄 × 10戦略 = 10 runs` で、

- success 9
- failure 1

failure は `tv-public-brosio-break-and-retest` だった。

---

## 何が強かったか

### execution 観点

**最も強かったのは 9 戦略の完走組**で、以下はすべて `40/40 success` だった。

- `tv-public-kdj-l2`
- `tv-public-masu-ultimate`
- `tv-public-asian-breakout-autobot`
- `tv-public-adaptive-risk-regime`
- `tv-public-joat-institutional-convergence`
- `tv-public-pivot-vwap-confluence`
- `tv-public-agni-momentum`
- `tv-public-gold-hft-hybrid`
- `tv-public-mtf-matrix`

### performance 観点

今回確実に手元で参照できる performance 比較は smoke / 既存比較レポートのみで、そこでは `tv-public-kdj-l2` が最も目立っていた。

参照:

- `docs/reports/night-batch-public-vs-strongest.md`

そのため現時点の短い結論は:

- **実行安定性の勝者**: 完走した 9 戦略は横並び
- **見えている性能面の筆頭候補**: `tv-public-kdj-l2`
- **明確な敗者**: `tv-public-brosio-break-and-retest` （40/40 failure）

---

## 関連

- run 17 infra report: `docs/reports/night-batch-self-hosted-run17.md`
- comparison note: `docs/reports/night-batch-public-vs-strongest.md`
- run 18 artifact summary: `/tmp/night-batch-24718820173/night-batch-24718820173-1/gha_24718820173_1-summary.json`
- brosio tail checkpoint: `artifacts/campaigns/public-top10-us-40-brosio-tail35/full/checkpoint-20.json`
