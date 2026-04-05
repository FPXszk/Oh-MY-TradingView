# round8 theme trend research session log

## 概要

- round7 で強かった top7 の近傍だけを 12 本に広げ、**local tuning で robustness を改善できるか** を検証した
- `stock-themes.com` の解釈は round7 から大きく変えず、**entry strictness / hard stop / pullback 許容幅** の最適化に集中した
- 実行順は plan どおり **Mag7 12 本 → alt 6 本** の順
- 結果として、Mag7 首位は `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced`、alt 首位は `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier` だった

## 実装メモ

### 追加した preset 群

- `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier`
- `donchian-55-20-rsp-filter-rsi14-regime-50-theme-breadth-balanced`
- `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded`
- `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-quality-early`
- `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict`
- `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier`
- `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
- `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced`
- `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded`
- `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-8pct-theme-quality-strict-stop-wide`
- `donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-8pct-theme-acceleration-balanced-strict`
- `donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-8pct-theme-acceleration-reentry-tight`

### コード変更

- `config/backtest/strategy-presets.json`
  - round8 preset 12 本を追加
  - `implementation_stage: round8`, `phase: phase-8`, `theme_axis`, `theme_notes`, `mag7_notes` を整理
- `tests/backtest.test.js`
  - round8 source generation test を追加
- `tests/preset-validation.test.js`
  - round8 preset validation を追加
- `docs/research/theme-signal-observation-round8_2015_2025.md`
  - round8 の local tuning 観点を整理
- `docs/research/theme-strategy-shortlist-round8_2015_2025.md`
  - round8 候補 12 本と alt shortlist 6 本を整理
- `docs/research/theme-backtest-results-round8_2015_2025.md`
  - Mag7 結果を整理
- `docs/research/theme-backtest-results-round8-alt_2015_2025.md`
  - alt 結果を整理
- `docs/DOCUMENTATION_SYSTEM.md`
  - round8 docs / raw artifact / session log への導線を追加

### 実装方針

- 既存 builder family (`donchian_breakout`, `regime_filter`, `rsi_regime_filter`, `stop_loss`) だけで表現した
- round8 でも `src/core/research-backtest.js` 側の追加変更は不要だった
- batch 実行は current session の `round8-batch-runner.mjs` で行った

## テスト駆動

### RED

- `tests/preset-validation.test.js`
  - round8 count / id / tag / metadata alignment test を追加
- `tests/backtest.test.js`
  - round8 source generation test を追加
- `node --test tests/backtest.test.js tests/preset-validation.test.js`
  - 未定義 preset に対して fail を確認

### GREEN

- `config/backtest/strategy-presets.json` に round8 preset 12 本を追加
- targeted test が pass する状態まで最小差分で実装

### REFACTOR

- duplicate variant を docs 上で明示し、次 round の pruning 条件として整理

## batch 実行

### Mag7

- output:
  - `docs/references/backtests/round8-theme-mag7_20260405.json`
  - `docs/references/backtests/round8-theme-mag7_20260405.summary.json`
- result:
  - run-count `84`
  - tester-available `83`
  - top:
    1. `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced`
    2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict`
    3. `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded`

### alt

- selected strategies:
  - `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced`
  - `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict`
  - `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded`
  - `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier`
  - `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
  - `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded`
- output:
  - `docs/references/backtests/round8-theme-alt_20260405.json`
  - `docs/references/backtests/round8-theme-alt_20260405.summary.json`
- result:
  - run-count `120`
  - tester-available `119`
  - top:
    1. `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier`
    2. `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced`
    3. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`

## 主要な判断

- round8 でも主役は **55/20 family**
- `breadth-earlier` は round7 `breadth-early` の robustness を再確認した
- `quality-strict-balanced` は round8 最大の改善点で、leader quality 本線を一段洗練した
- `deep-pullback-tight` は十分強いが、round7 base の `deep-pullback` を超えられなかった
- `breadth-quality-early` は `breadth-early-guarded` と executable logic が一致していたため、round8 では taxonomy alias として扱った
- `breadth-quality-strict` と `breadth-early-guarded` は alt で同値となり、breakthrough ではなく補助改善に留まった
- acceleration 系は今回も alt shortlist に残らず、補完枠から昇格しなかった

## 欠測メモ

- Mag7:
  - `tester_available_count = 83 / 84`
  - 欠測 1 run は `GOOGL × donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict`
  - `apply_failed = true` / `tester_reason = "Skipped: strategy not applied"` / `fallback_source = chart_bars_local`
- alt:
  - `tester_available_count = 119 / 120`
  - 欠測 1 run は `sp500-top10-point-in-time × JNJ × donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded`
  - `apply_failed = true` / `tester_reason = "Skipped: strategy not applied"` / `fallback_source = chart_bars_local`

## round8 の最終整理

- **breadth 本線継続候補**: `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier`
- **leader quality 改善候補**: `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced`
- **DD 重視の代替候補**: `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded`
- **round7 base を残すべき枠**: `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback`
- **drop 候補**: `breadth-balanced`, `breadth-quality-early`, `breadth-quality-strict`, `breadth-early-guarded`, acceleration 2 本

## 関連ファイル

- exec plan: `docs/exec-plans/completed/round8-theme-neighborhood-optimization_20260405_2009.md`
- observation doc: `docs/research/theme-signal-observation-round8_2015_2025.md`
- shortlist doc: `docs/research/theme-strategy-shortlist-round8_2015_2025.md`
- Mag7 doc: `docs/research/theme-backtest-results-round8_2015_2025.md`
- alt doc: `docs/research/theme-backtest-results-round8-alt_2015_2025.md`
