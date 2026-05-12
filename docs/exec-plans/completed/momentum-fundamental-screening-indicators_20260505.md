# Momentum Fundamental Screening Indicators 2026-05-05

## 概要

`docs/strategy/deep-research-instruction.md` に基づき、「モメンタムがあり、かつファンダメンタルが強い銘柄」を日次で抽出する指標セットを調査した。

最終レポート:

- `docs/strategy/momentum-fundamental-screening-indicators-research_20260505.md`

結論は、現行スクリーナーの `Perf.3M + ROE + FCF margin` という軸は妥当だが、次の指標を追加した方が目的に近い。

- `Perf.6M`, `Perf.Y`, 可能なら 12-1 momentum
- 52週高値比率または新高値 flag
- `return_on_invested_capital`
- `gross_profit_ttm / total_assets`
- `operating_margin_ttm`
- `total_revenue_yoy_growth_*`, `earnings_per_share_diluted_yoy_growth_*`, `free_cash_flow_yoy_growth_ttm`
- `enterprise_value_ebitda_ttm`, `price_free_cash_flow_ttm`
- `ATR`, `beta_1_year`, `debt_to_equity`

## 調査対象

- 現行実装:
  - `src/core/fundamental-screener.js`
  - `src/core/sector-momentum.js`
  - `src/core/sector-screening-profiles.js`
  - `scripts/screener/run-fundamental-screening.mjs`
- 現行指標:
  - RSI
  - Perf.3M
  - 相対出来高
  - 52週高値比率
  - ROE
  - 粗利率
  - FCF マージン
  - EPS
  - P/FCF
  - 売上成長率
  - Close > SMA200 / SMA50
  - 時価総額
- 追加候補40項目:
  - momentum、profitability、growth、valuation、technical、quality、macro/market environment の全候補
- 外部根拠:
  - Jegadeesh and Titman、Moskowitz and Grinblatt、George and Hwang、Asness et al.、Blitz et al.、Moskowitz/Ooi/Pedersen、Novy-Marx、Fama-French、Piotroski、Sloan、PEAD、AQR / Kenneth French / Alpha Architect / Robeco / Quantpedia など
  - X/Twitter、Reddit、Substack、GitHub は補助情報として扱った

## 採用 / 不採用の判断

### 採用優先

- 中期モメンタムは最強クラスの根拠があるため、`Perf.3M` 単独から `Perf.3M + Perf.6M + Perf.Y + 52週高値比率` へ拡張する。
- sector/industry momentum は現行 Phase1 のまま維持する。Moskowitz and Grinblatt (1999) と整合する。
- ROE は残すが、ROIC と D/E で歪みを抑える。
- 粗利率は Tech/Software では有用だが、全業種では Novy-Marx 型の `gross profit / assets` を優先する。
- FCF マージンは現行維持。追加で cash conversion / accruals を検討する。
- ATR と beta は alpha 指標ではなく risk overlay として使う。

### 降格

- RSI は entry confirmation に降格し、rank 中核にしない。
- Perf.1M は短期リバーサルの影響があるため、Phase1 補助に限定する。
- 売上成長率単独 rank は glamour リスクがあるため、EPS/FCF 成長とセットで扱う。
- P/FCF の一律上限はセクター別に調整する。
- MACD、Bollinger breakout、VWAP は日次スクリーナーの中核ではなく、別途 entry 条件で扱う。

### 不採用または後回し

- Forward EPS growth、Forward P/E、PEG は analyst estimate 依存が強く、現行データ経路では安定取得を確認できない。
- Short interest と institutional ownership change は根拠はあるが、日次スクリーナーには外部データが必要。
- Piotroski F-score と Altman Z-score は有効だが、今回の「強いモメンタム銘柄」抽出では first-pass の中核ではなく、risk/value 補助とする。

## このプロジェクトへの接続点

次にコードへ反映する場合、最小変更は `src/core/fundamental-screener.js` の TradingView columns と rank-sum 対象を増やすこと。

初回追加候補:

- `Perf.6M`
- `Perf.Y`
- `return_on_invested_capital`
- `gross_profit_ttm`
- `total_assets`

次段階候補:

- `operating_margin_ttm`
- `total_revenue_yoy_growth_ttm`
- `earnings_per_share_diluted_yoy_growth_ttm`
- `free_cash_flow_yoy_growth_ttm`
- `enterprise_value_ebitda_ttm`
- `price_free_cash_flow_ttm`
- `ATR`
- `beta_1_year`
- `debt_to_equity`

スクリーナー実装時の注意:

- 初回から複雑な weight model にしない。既存の rank-sum へ少数列を追加し、ablation で効果を見る。
- Financials / Real Estate / Utilities は現行どおり Phase2 から外す。別 universe と別指標セットが必要。
- 日本株では raw momentum より業種内 rank、流動性、出来高 confirmation を強める。
- X/Twitter、Reddit、Substack 由来の仮説は、論文またはバックテストで確認するまで中核に入れない。
