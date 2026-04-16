# Next long-run fine-tune partial results（中断時点の暫定報告）

- status: **PARTIAL / INTERRUPTED**
- style: detailed Japanese operator report
- date range: 2000-01-01 → latest
- 作成日時: 2026-04-10T15:03

> **重要**: この報告書は fine-tune backtest が途中で停止した時点の checkpoint から作成しています。
> 数値は停止時点までの artifact のみを元にしており、**最終結論には使えません**。
> 「確定値」「部分観測」「未検証」「未実行」の区分を明記しています。

---

## Source artifacts

| artifact | path | status |
| --- | --- | --- |
| US campaign config | `config/backtest/campaigns/next-long-run-us-finetune-100x10.json` | 確定 |
| JP campaign config | `config/backtest/campaigns/next-long-run-jp-finetune-100x10.json` | 確定 |
| US smoke recovered | `artifacts/campaigns/next-long-run-us-finetune-100x10/smoke/recovered-summary.json` | 確定 `100/100` |
| JP smoke recovered | `artifacts/campaigns/next-long-run-jp-finetune-100x10/smoke/recovered-summary.json` | 確定 `100/100` |
| US pilot checkpoint | `artifacts/campaigns/next-long-run-us-finetune-100x10/pilot/checkpoint-50.json` | 確定 `50/250` |
| US full checkpoint | `artifacts/campaigns/next-long-run-us-finetune-100x10/full/checkpoint-490.json` | 確定 `490/1000` |

---

## Coverage summary

### ✅ 確定値

| campaign | phase | completed | total | status |
| --- | --- | ---: | ---: | --- |
| `next-long-run-us-finetune-100x10` | smoke | 100 | 100 | ✅ 完了 |
| `next-long-run-jp-finetune-100x10` | smoke | 100 | 100 | ✅ 完了 |
| `next-long-run-us-finetune-100x10` | pilot | 50 | 250 | ⚠️ 中断（2/10 preset のみ） |
| `next-long-run-us-finetune-100x10` | full | 490 | 1000 | ⚠️ 中断（5/10 preset 処理済み） |

### ❌ 未実行

| campaign | phase | status |
| --- | --- | --- |
| `next-long-run-jp-finetune-100x10` | pilot | artifact 未確認（latest 上は未着手扱い） |
| `next-long-run-jp-finetune-100x10` | full | artifact 未確認（latest 上は未着手扱い） |
| `next-long-run-us-finetune-100x10` | pilot (残り 8 preset) | 未着手 |
| `next-long-run-us-finetune-100x10` | full (残り 5 preset) | 未着手 |

---

## US full partial — preset coverage detail

| # | preset | runs | success | avg net | avg PF | avg MDD | avg trades | avg WR | status |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | 100 | 100 | 8933.57 | 1.4222 | 5359.00 | 39.73 | 43.88% | ✅ 完走 |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier` | 100 | 100 | 8933.57 | 1.4222 | 5359.00 | 39.73 | 43.88% | ✅ 完走 ⚠️ 後述の未検証事項あり |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 100 | 100 | 8850.90 | 1.3916 | 5303.01 | 40.29 | 43.03% | ✅ 完走 |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | 100 | 100 | 8652.78 | 1.3776 | 5324.79 | 40.22 | 42.81% | ✅ 完走 |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow` | 90 | 90 | 8828.18 | 1.3820 | 5118.11 | 41.74 | 40.90% | ⚠️ 途中停止 90/100 |
| 6 | `donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early` | — | — | — | — | — | — | — | ❌ 未着手 |
| 7 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow` | — | — | — | — | — | — | — | ❌ 未着手 |
| 8 | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | — | — | — | — | — | — | — | ❌ 未着手 |
| 9 | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | — | — | — | — | — | — | — | ❌ 未着手 |
| 10 | `donchian-55-18-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-exit-tight` | — | — | — | — | — | — | — | ❌ 未着手 |

- 最終処理 preset/symbol: `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow` / `EFA`
- full phase 開始: `2026-04-10T02:57:57.610Z`
- full phase 最終更新: `2026-04-10T05:53:51.371Z`（約 2 時間 56 分経過時点で停止）

---

## ⚠️ 未検証事項: 先頭 2 preset の metrics 完全一致

**事実**: full checkpoint-490 において、preset #1（`regime-55-hard-stop-10pct`）と preset #2（`regime-50-hard-stop-10pct-earlier`）の全 100 銘柄の metrics（net_profit, closed_trades, percent_profitable, profit_factor, max_drawdown）が**完全に一致**している。

- 一致銘柄数: **100/100**（全銘柄で 5 指標すべてが同値）
- サンプル（AAPL）:
  - net_profit: 114295.73
  - closed_trades: 39
  - percent_profitable: 51.28
  - profit_factor: 2.7604
  - max_drawdown: 23541.46

**想定される原因候補**（いずれも未検証）:

1. 両 preset が TradingView 上で同一の Pine パラメータに解決されている（regime=55 vs regime=50 の差が実行時に無効化される構造）
2. preset 切り替えのバグで、worker が同一 preset を 2 回適用した
3. checkpoint 書き出し時の重複

**影響**: この 2 preset を独立したデータポイントとして扱うことは現時点ではできない。暫定集計では両方を含めているが、**実質的には 4 種類（+1 途中）のデータしかない可能性がある**。

---

## US full partial — 暫定 aggregate（部分観測）

> 以下の集計は停止時点の 490 run（5 preset × 90〜100 symbols）を対象とした**暫定値**です。
> 未着手の 5 preset を含む最終集計とは異なります。

### 全 490 run（5 preset）

| metric | value |
| --- | ---: |
| avg net profit | 8840.04 |
| median net profit | 2627.62 |
| avg profit factor | 1.3995 |
| avg max drawdown | 5296.35 |
| avg closed trades | 40.31 |
| avg win rate | 42.94% |
| positive runs | 358/490 (73.1%) |

### 完走済み 4 preset（400 run）のみ

| metric | value |
| --- | ---: |
| avg net profit | 8842.70 |
| median net profit | 2618.83 |
| avg profit factor | 1.4034 |
| avg max drawdown | 5336.45 |
| avg closed trades | 39.99 |
| avg win rate | 43.40% |
| positive runs | 297/400 (74.3%) |

---

## US pilot partial（部分観測）

- `checkpoint-50.json`: 50/250 完了（2 preset × 25 symbols）
- 処理済み preset:
  1. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` — 25 runs
  2. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier` — 25 runs
- pilot 開始: `2026-04-09T17:53:11.993Z`
- pilot 最終更新: `2026-04-09T18:11:04.040Z`
- **注意**: この 2 preset は full phase で metrics 完全一致の対象であり、pilot データも同様の問題がありうる（未検証）

---

## Smoke results（確定）

### US smoke

- `recovered-summary.json`: success=100, failure=0, unreadable=0, total=100
- 全 10 preset × 10 symbols = 100 run が**全成功**

### JP smoke

- `recovered-summary.json`: success=100, failure=0, unreadable=0, total=100
- 全 10 preset × 10 symbols = 100 run が**全成功**

---

## 直前世代（market-matched 200）との比較

| 指標 | market-matched 200 (US 3-sweep) | fine-tune partial (US 5-preset) | 差分の解釈 |
| --- | ---: | ---: | --- |
| avg net | 8961.28 | 8840.04 | ほぼ同水準（未検証: preset 構成が異なるため直接比較は不適切） |
| avg PF | 1.4199 | 1.3995 | 微減だが preset 母集団が違うため判断不可 |
| positive runs | 75.3% | 73.1% | — |

> この比較は参考値であり、母集団の preset / symbol 構成が異なるため**直接の優劣判断には使えない**。

---

## 暫定的な観測まとめ

### 確定して言えること

1. **smoke は US / JP とも全成功**（100/100）— fine-tune preset は compile / apply / metrics 取得まで正常に動作する
2. **US full は 490/1000 まで進行**し、4 preset が完走、1 preset が 90/100 で停止した
3. 完走した 4 preset（ただし 2 preset の独立性は未検証）の暫定平均は avg net 8842.70, avg PF 1.4034, positive run rate 74.3%

### 部分観測として残るもの

4. 5 番目の preset（`tight-narrow`）は 90/100 で停止しており、残り 10 symbols のデータがない
5. US pilot は 2 preset のみ 50/250 で、残り 8 preset は未着手

### 未検証のまま残る問題

6. **先頭 2 preset の metrics 完全一致**は原因不明のまま — 独立データポイントとして扱えるか確認が必要
7. full partial の途中集計が最終順位をどの程度代表するかは不明
8. combined ranking（US+JP）は生成できていない

### 完全に未実行のもの

9. JP pilot / JP full は artifact 未確認（latest 上は未着手扱い）
10. US full の残り 5 preset（`tight-early`, `strict-narrow`, `strict-entry-early`, `strict-entry-late`, `strict-exit-tight`）は未着手
11. ranking / Pine export の再生成は行っていない
