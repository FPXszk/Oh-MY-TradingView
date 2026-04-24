# round7 theme trend research session log

## 概要

- round6 の breadth / persistence 優位を受けて、round7 では **theme investing proxy を 10 本に細分化** して再検証した
- `stock-themes.com` の見方を、**breadth-early / deep-pullback / quality-strict / acceleration / dip depth** に分解して proxy 化した
- 実行順は plan どおり **Mag7 10 本 → alt 6 本** の順
- 結果として、Mag7 首位は `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict`、alt 首位は `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` だった

## 実装メモ

### 追加した preset 群

- `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early`
- `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality`
- `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict`
- `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict`
- `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback`
- `donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-10pct-theme-acceleration-reentry`
- `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced`
- `donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-acceleration`
- `rsi2-buy-10-sell-70-rsp-filter-long-only-theme-shallow-dip`
- `rsi3-buy-20-sell-70-spy-filter-long-only-theme-deep-dip`

### コード変更

- `config/backtest/strategy-presets.json`
  - round7 preset 10 本を追加
  - `theme_axis` / `theme_notes` で局面ラベルを明示
- `tests/backtest.test.js`
  - round7 source generation test を追加
- `tests/preset-validation.test.js`
  - round7 preset 群の validation test を追加
- `docs/research/theme-signal-observation-round7_2015_2025.md`
  - round7 観点の深掘り観察を整理
- `docs/research/theme-strategy-shortlist-round7_2015_2025.md`
  - round7 候補 10 本の狙いを整理
- `docs/research/theme-backtest-results-round7_2015_2025.md`
  - Mag7 結果を整理
- `docs/research/theme-backtest-results-round7-alt_2015_2025.md`
  - alt 結果を整理
- `docs/DOCUMENTATION_SYSTEM.md`
  - round7 docs / raw artifact / session log への導線を追加

### 実装方針

- `src/core/research-backtest.js` / `src/core/preset-validation.js` の追加変更は不要と判断
- 既存 builder family (`donchian_breakout`, `rsi_mean_reversion`, `regime_filter`, `rsi_regime_filter`, `stop_loss`) だけで表現した
- batch 実行は current session の `round7-batch-runner.mjs` で行った

## 検証

- targeted RED/GREEN:
  - `node --test tests/backtest.test.js tests/preset-validation.test.js`
- unit:
  - `npm test`
- e2e:
  - `npm run test:e2e`
  - CDP 未接続のため 9 件 skip
- full repo:
  - `npm run test:all`

## batch 実行

### Mag7

- output:
  - `docs/references/backtests/round7-theme-mag7_20260405.json`
  - `docs/references/backtests/round7-theme-mag7_20260405.summary.json`
- result:
  - run-count `70`
  - tester-available `69`
  - top:
    1. `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict`
    2. `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict`
    3. `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early`

### alt

- selected strategies:
  - `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict`
  - `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict`
  - `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early`
  - `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality`
  - `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback`
  - `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced`
- output:
  - `docs/references/backtests/round7-theme-alt_20260405.json`
  - `docs/references/backtests/round7-theme-alt_20260405.summary.json`
- result:
  - run-count `120`
  - tester-available `120`
  - top:
    1. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback`
    2. `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early`
    3. `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict`

## 主要な判断

- round7 でも主役は **55/20 breadth / persistence**
- その中で round7 は
  - **deep pullback 許容**
  - **breadth early**
  - **quality strict**
  の 3 本線に整理できた
- `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early` は round6 winner の robustness をほぼそのまま再現した
- `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` は alt 首位となり、強テーマの深い押し許容に意味があった
- `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict` は Mag7 首位かつ alt でも高水準を維持し、leader concentration を扱う本線候補になった
- `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced` は `AAPL` 補完として残るが、主役ではない
- `rsi2-buy-10-sell-70-rsp-filter-long-only-theme-shallow-dip` は今回も `GOOGL` 補完に留まった

## 欠測メモ

- Mag7:
  - `tester_available_count = 69 / 70`
  - 欠測 1 run は `AAPL × donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced`
  - `apply_failed = true` / `tester_reason = "Skipped: strategy not applied"` / `fallback_source = chart_bars_local`
- alt:
  - `120 / 120`
  - 欠測 0 run

## round7 の最終整理

- **breadth persistence 本線**: `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early`
- **deep pullback 本線**: `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback`
- **leader quality 本線**: `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict`
- **acceleration 補完枠**: `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced`
- **dip reclaim 補完枠**: `rsi2-buy-10-sell-70-rsp-filter-long-only-theme-shallow-dip`

## 関連ファイル

- exec plan: `docs/exec-plans/completed/round7-theme-trend-research_20260405_0815.md`
- observation doc: `docs/research/theme-signal-observation-round7_2015_2025.md`
- shortlist doc: `docs/research/theme-strategy-shortlist-round7_2015_2025.md`
- Mag7 doc: `docs/research/theme-backtest-results-round7_2015_2025.md`
- alt doc: `docs/research/theme-backtest-results-round7-alt_2015_2025.md`
