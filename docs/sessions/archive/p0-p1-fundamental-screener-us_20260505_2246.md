# Session Log 20260505_2246

## 作業概要

`docs/strategy/momentum-fundamental-screening-indicators-research_20260505.md` の P0 / P1 評価基準を、米国株の日次ファンダメンタル × モメンタムスクリーナーへ実装した。

従来の `Perf.3M + ROE + FCF margin [+ revenueGrowth]` の単純 rank-sum から、以下の block scoring へ変更した。

| ブロック | 重み | 指標 |
|---|---:|---|
| Price momentum | 35% | `Perf.3M`, `Perf.6M`, `Perf.Y`, 52週高値比率 |
| Sector strength | 20% | Phase1 sector rank、sector 12M / 6M / 3M momentum |
| Profitability / quality | 25% | ROIC、gross profit/assets、operating margin、FCF margin、cash conversion |
| Growth confirmation | 10% | 売上 YoY、EPS YoY、FCF YoY、Yahoo revenue growth |
| Risk / value guard | 10% | P/FCF、EV/EBITDA、ATR%、beta、D/E |

## 実装内容

- `src/core/sector-momentum.js`
  - US sector ETF Phase1 に `Perf.6M` / `Perf.Y` を追加。
  - `Perf.1M` と RSI は表示・補助には残し、rank の中心は 12M / 6M / 3M momentum に寄せた。

- `src/core/fundamental-screener.js`
  - P0 / P1 用の TradingView columns を追加。
  - 派生指標として 52週高値比率、gross profit/assets、cash conversion、ATR%、P/FCF fallback を計算。
  - block ごとの平均 rank を出し、重み付き合計を `rankScore` にした。
  - 旧来の ROE / 粗利率 / FCF / RSI / 相対出来高の server-side hard filter は外し、広く取って scoring で評価する形に変更。
  - split / corporate-action 系の外れ値対策として `Perf.6M <= 600%`、`Perf.Y <= 1000%` の data-quality guard を追加。

- `scripts/screener/run-fundamental-screening.mjs`
  - Markdown レポートを P0 / P1 block scoring 用に再構成。
  - 上位5件に、ブロック別順位、主要指標、リスク確認、選定理由を表示。
  - 「今後改善できそうな点」をレポート内にも追加。

- `tests/fundamental-screener.test.js`
  - 新 columns の payload order と block scoring を反映。

- `tests/daily-screener-report.test.js`
  - 新レポート体裁、block weights、hard gate / scoring guide 表示を固定。

## 実行結果

実行コマンド:

```bash
SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE SCREENER_REPORT_PATH=docs/reports/screener/daily-ranking.md node scripts/screener/run-fundamental-screening.mjs
```

結果:

- Phase2 候補取得: 219 銘柄
- スコープ通過: 143 銘柄
- クライアントフィルター通過: 85 銘柄
- 最終表示: 上位20件
- 採用セクター: Semiconductors / Energy / Technology
- レポート: `docs/reports/screener/daily-ranking.md`

上位5件:

| rank | symbol | sector | score | 主な強み | 主な注意点 |
|---:|---|---|---:|---|---|
| 1 | MU | Electronic Technology | 17.46 | sector strength、12M/6M momentum、EPS YoY | beta 2.12、P/FCF 69.5 |
| 2 | DIOD | Electronic Technology | 28.35 | price momentum | quality block が弱い |
| 3 | YOU | Technology Services | 28.74 | profitability / quality | EPS YoY が弱い |
| 4 | ADI | Electronic Technology | 28.94 | sector strength、FCF margin | beta 1.55 |
| 5 | KEYS | Electronic Technology | 30.70 | price momentum、quality | sector block が相対的に弱い |

## 検証

```bash
node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js
```

結果: pass

補足:

- `tests/sector-momentum.test.js` は現行 tree に存在しないため未実行。
- `docs/reports/screener/daily-ranking.md` の `N/A` は TradingView field の欠損値表示であり、未実装メモや根拠不足ではない。

## 今後改善できそうな点

1. 12-1 momentum の正式実装
   - 現在は `Perf.Y` をそのまま使っている。
   - OHLC 履歴を取得できるようにして、直近1カ月を除外した標準的な 12-1 momentum を計算する。

2. SUE / earnings surprise の導入
   - 現在は EPS YoY growth が proxy。
   - consensus と actual の差分を取れるデータソースを追加できれば、PEAD 系の根拠に近い growth confirmation へ改善できる。

3. Residual momentum
   - 現在は sector strength を別 block にしているが、個別銘柄の sector / beta 由来ではない固有 momentum までは分離していない。
   - 履歴リターンと beta 推定を使い、raw momentum の補助スコアとして検証する。

4. Data-quality guard の高度化
   - 今回は `Perf.6M > 600%`、`Perf.Y > 1000%` を外れ値として除外した。
   - 将来は split-adjusted return、上場日、corporate action flag で判定した方がよい。

5. Risk/value block の calibration
   - MU のように momentum と sector strength が強いが P/FCF と beta が高い銘柄が首位になる。
   - 実運用前に risk/value block の重みを 10% から 15% に上げる ablation、または P/FCF / beta の soft cap を検証する。

6. セクター別 scoring
   - Energy と Semiconductors では P/FCF、EV/EBITDA、ROIC の効き方が違う。
   - 次段階では block weight は共通のまま、risk/value guard の閾値だけセクター別に調整する。
