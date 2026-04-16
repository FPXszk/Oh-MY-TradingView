# round6 theme trend research session log

## 概要

- round5 までの breakout / RSI 研究を受けて、round6 では **theme investing の proxy 戦略 10 本** を追加検証した
- `stock-themes.com` の公開情報を調べ、**heat / acceleration / persistence / breadth / dip reclaim / macro alignment** をテーマ判断軸として整理した
- 実行順は plan どおり **Mag7 10 本 → alt core 6 本 → alt extension 2 本** の順
- 結果として、round6 の robust winner は `donchian-55-20-rsp-filter-rsi14-regime-50`、次点は `donchian-55-20-spy-filter-rsi14-regime-55` だった

## 実装メモ

### 追加した preset 群

- `donchian-55-20-spy-filter-rsi14-regime-55`
- `donchian-55-20-rsp-filter-rsi14-regime-50`
- `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-8pct`
- `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct`
- `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct`
- `donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-10pct`
- `donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-6pct`
- `donchian-20-10-rsp-filter-rsi14-regime-55-hard-stop-6pct`
- `rsi2-buy-10-sell-65-rsp-filter-long-only`
- `rsi3-buy-15-sell-65-spy-filter-long-only`

### コード変更

- `config/backtest/strategy-presets.json`
  - round6 preset 10 本を追加
  - `theme_axis` / `theme_notes` メタデータを追加
- `tests/backtest.test.js`
  - round6 の source generation test を追加
- `tests/preset-validation.test.js`
  - round6 preset 群の validation test を追加
- `docs/research/theme-signal-observation-round6_2015_2025.md`
  - `stock-themes.com` の公開観察を整理
- `docs/research/theme-strategy-shortlist-round6_2015_2025.md`
  - round6 候補 10 本の狙いを整理

### 実装方針

- `src/core/research-backtest.js` / `src/core/preset-validation.js` の追加変更は不要と判断
- 既存 builder family (`donchian_breakout`, `rsi_mean_reversion`, `regime_filter`, `rsi_regime_filter`, `stop_loss`) だけで表現した
- batch 実行は round4 由来の **session artifact runner** を env override で再利用した

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
  - `docs/references/backtests/round6-theme-mag7_20260405.json`
  - `docs/references/backtests/round6-theme-mag7_20260405.summary.json`
- result:
  - run-count `70`
  - tester-available `61`
  - top:
    1. `donchian-55-20-spy-filter-rsi14-regime-55`
    2. `donchian-55-20-rsp-filter-rsi14-regime-50`
    3. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct`

### alt core

- selected strategies:
  - `donchian-55-20-spy-filter-rsi14-regime-55`
  - `donchian-55-20-rsp-filter-rsi14-regime-50`
  - `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct`
  - `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-8pct`
  - `donchian-20-10-rsp-filter-rsi14-regime-55-hard-stop-6pct`
  - `donchian-20-10-spy-filter-rsi14-regime-55-hard-stop-6pct`
- output:
  - `docs/references/backtests/round6-theme-alt_20260405.json`
  - `docs/references/backtests/round6-theme-alt_20260405.summary.json`
- result:
  - run-count `120`
  - tester-available `120`
  - top:
    1. `donchian-55-20-rsp-filter-rsi14-regime-50`
    2. `donchian-55-20-spy-filter-rsi14-regime-55`
    3. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct`

### alt extension

- rationale:
  - round5 で `20/10 + 10% stop` が robust だったため、round6 でも 2 本だけ追加で確認
- selected strategies:
  - `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct`
  - `donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-10pct`
- output:
  - `docs/references/backtests/round6-theme-alt-extension_20260405.json`
  - `docs/references/backtests/round6-theme-alt-extension_20260405.summary.json`
- result:
  - run-count `40`
  - tester-available `40`
  - top:
    1. `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct`
    2. `donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-10pct`

## 主要な判断

- `stock-themes.com` の判断軸を proxy 化すると、round6 では **breadth を伴う persistence** が最も robust だった
- `donchian-55-20-rsp-filter-rsi14-regime-50` は Mag7 と alt の両方で強く、**継続テーマの本命 proxy** として最有力
- `donchian-55-20-spy-filter-rsi14-regime-55` は PF / DD の見栄えが良く、**品質改善型の本線**
- `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct` は 20/10 family では最良だが、今回は 55/20 上位を超えなかった
- `rsi2-buy-10-sell-65-rsp-filter-long-only` は `GOOGL` best となり、**押し目回復の補完枠** として残す意味がある

## 欠測メモ

- Mag7:
  - `tester_available_count = 61 / 70`
  - 欠測 9 run はすべて `apply_failed = true` / `tester_reason = "Skipped: strategy not applied"` / `fallback_source = chart_bars_local`
  - symbol 偏り:
    - `MSFT`: 4 run
    - `GOOGL`: 5 run
- alt:
  - core `120 / 120`
  - extension `40 / 40`
  - 欠測 0 run

## round6 の最終整理

- **継続テーマの本命 proxy**: `donchian-55-20-rsp-filter-rsi14-regime-50`
- **品質改善型**: `donchian-55-20-spy-filter-rsi14-regime-55`
- **品質改善 + stop**: `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct`
- **加速テーマの補完枠**: `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-10pct`
- **押し目補完枠**: `rsi2-buy-10-sell-65-rsp-filter-long-only`

## 関連ファイル

- exec plan: `docs/exec-plans/completed/round6-theme-trend-research_20260405_0603.md`
- observation doc: `docs/research/theme-signal-observation-round6_2015_2025.md`
- shortlist doc: `docs/research/theme-strategy-shortlist-round6_2015_2025.md`
- Mag7 doc: `docs/research/theme-backtest-results-round6_2015_2025.md`
- alt doc: `docs/research/theme-backtest-results-round6-alt_2015_2025.md`

## 完了状態

- review: 完了
- commit: `1de51b0dc6666b499b030ec95dcd61a383075911`
- push: `origin/main`
- current status: 次の指示待ち
