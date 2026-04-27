# Strongest Plus Recovery US40 50-Pack Deep Dive

## Problem / goal

run70 の改善点 5 項目を、**50 strategies × 40 symbols = 2000 runs** の次回 US backtest で一気に切り分けられる形へ再設計する。  
今回は **注文履歴 / シグナル件数 export は含めず**、既存 night-batch 成果物で比較できる範囲に絞る。  
また、既定 workflow (`config/night_batch/bundle-foreground-reuse-config.json`) は壊さず、**専用 campaign + 専用 config を追加して明示 dispatch** する。

## Assumptions / scope bounds

- 50 戦略は **合計 50 本** とする（既存 10pack の anchor 10 本を含む）。
- 40 銘柄 universe は現行 `public-top10-us-40` をそのまま使う。
- TSLA 除外確認は **39-symbol の別 campaign を作らず**、同じ 2000-run の recovered-results を後処理して確認する。
- SMA20/SMA25 の「約定履歴 / signal count」比較はこのタスク外。今回は **同一 40 銘柄での集計 metrics 差分** を first pass とする。
- default bundle の差し替え、README の恒久運用説明追加、JP 側 campaign 追加はこのタスク外。

## No-overlap check

- `docs/exec-plans/active/repo-structure-align-and-archive-rules_20260424_2015.md` は docs / archive 運用の整理であり、今回の backtest preset / campaign 追加とは直接競合しない。

## Files to create / modify

### Create

- `config/backtest/campaigns/strongest-plus-recovery-reversal-us40-50pack.json`
- `config/night_batch/strongest-plus-recovery-reversal-us40-50pack.json`
- `docs/references/pine/strongest-plus-recovery-reversal-us40-50pack/` 配下の新規 raw_source Pine 一式

### Modify

- `config/backtest/strategy-presets.json`
- `config/backtest/strategy-catalog.json`
- `tests/backtest.test.js`
- `tests/campaign.test.js`
- `tests/preset-validation.test.js`
- `tests/repo-layout.test.js`
- `tests/strategy-catalog.test.js`
- `tests/strategy-live-retired-diff.test.js`

## 50-strategy lineup

### Cohort A — anchor controls (existing 10)

1. `donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50`
2. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma25-rsi65`
3. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma25-rsi65`
4. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi65`
5. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi35-vixpeak-sma25-rsi65`
6. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi45-vixpeak-sma25-rsi65`
7. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi65`
8. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma25-rsi60`
9. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2x10-sma25-rsi65`
10. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-rsi2x10-sma25-rsi65`

### Cohort B — SMA20 vs SMA25 parity completion (new 8)

11. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma20-rsi65`
12. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi65`
13. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi35-vixpeak-sma20-rsi65`
14. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi45-vixpeak-sma20-rsi65`
15. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi60`
16. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma20-rsi60`
17. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi60`
18. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi35-vixpeak-sma25-rsi60`

### Cohort C — recovery overlay confirmation slicing (new 12)

19. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2only-sma25-rsi65`
20. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-rsi2only-sma25-rsi65`
21. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-rsi2only-sma25-rsi65`
22. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-or-rsi2x10-sma25-rsi65`
23. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-or-rsi2x10-sma25-rsi65`
24. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-or-rsi2x10-sma25-rsi65`
25. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-and-rsi2x10-sma25-rsi65`
26. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-and-rsi2x10-sma25-rsi65`
27. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-and-rsi2x10-sma25-rsi65`
28. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-noconfirm-sma25-rsi65`
29. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-noconfirm-sma25-rsi65`
30. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-noconfirm-sma25-rsi65`

### Cohort D — DD suppression sweep (new 12)

31. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma15-rsi60`
32. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi62`
33. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma25-rsi62`
34. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma15-rsi62`
35. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma15-rsi60`
36. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma15-rsi62`
37. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma20-rsi62`
38. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma25-rsi62`
39. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma15-rsi60`
40. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma15-rsi62`
41. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi62`
42. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi62`

### Cohort E — RSI2x10 / vixpeak ablation follow-up (new 8)

43. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2only-sma20-rsi65`
44. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-and-rsi2x10-sma20-rsi65`
45. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2only-sma25-rsi60`
46. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-and-rsi2x10-sma25-rsi60`
47. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-rsi2only-sma25-rsi60`
48. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-and-rsi2x10-sma25-rsi60`
49. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-rsi2only-sma25-rsi60`
50. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-and-rsi2x10-sma25-rsi60`

## Why this 50-pack

- **Item 1 / SMA 実効差分**: Cohort A + B で、run70 上位に近い gate を SMA20/SMA25 で paired 比較できる。
- **Item 2 / overlay 純増効果**: baseline 1 本を anchor にしつつ、Cohort C で recovery confirm の強さ別に寄与元を比較できる。
- **Item 3 / DD 抑制**: Cohort D で VIX gate を固定しながら exit 側だけ tighten し、7,000 未満への復帰余地を見る。
- **Item 4 / TSLA 依存**: 追加 strategy は不要。全 50 本を同一 40 銘柄で回し、post-analysis で TSLA を除外した再集計を行う。
- **Item 5 / RSI2x10 取捨選別**: Cohort A + C + E で rsi2only / vixpeak / and / or を切り分けられる。

## Implementation approach

1. `strategy-presets.json` に新規 40 preset を追加する。
2. `strategy-catalog.json` に同じ 40 preset を live strategy として追加する。
3. baseline (`donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50`) は既存 `source_path` を維持し、新 directory には **新規 40 raw_source だけ** を置く。
4. raw_source は `vix20-rsi40-vixpeak-sma25-rsi65` 系を template base にし、session-local の複製手順で以下だけを差し替える。
   - weakMarket gate: `recovery_vix_min`, `recovery_spy_rsi_max`
   - confirm logic: `vixPeakout`, `rsi2Confirm`, `or`, `and`, `noconfirm`
   - exit logic: `recoveryExitSma` period, `recoveryExitRsi` threshold
   - strategy title / preset id
5. 新 campaign は既存 10 strategy を再利用しつつ、新規 40 strategy を足して 50 本構成にする。
6. 新 night-batch config は `bundle.us_campaign` のみ新 50pack に向け、既定 workflow を変えず `gh workflow run ... -f config_path=...` で使う。

## Impact

- `loadCampaign()` が参照する campaign / preset / catalog の 3 点セットが増える。
- live strategy 数が増えるため、catalog / layout 系テストの期待値影響を確認する必要がある。
- live preset は `34 -> 74`、catalog は `36 -> 76` に増える想定なので、hardcoded count test を同時更新する必要がある。
- raw_source の確認漏れがあると compile / preset-load 系テストが落ちやすい。

## TSLA exclusion post-analysis approach

- 50pack 本体は 40 symbols のまま走らせる。
- run 後は recovered-results を `summarizeMarketCampaign()` に流す前に `symbol !== 'TSLA'` で絞り、39-symbol の再集計を取る。
- このタスクでは committed helper script は増やさず、既存 report tooling を使う one-off analysis 手順として記録する。
- もし同じ除外再集計を継続運用したくなったら、その時点で別 task として `generate-rich-report.mjs` 拡張を切る。

## Test strategy

### RED

- `tests/campaign.test.js` に 50 strategy / 40 symbol campaign が正しく解決されるケースを追加する。
- `tests/backtest.test.js` に代表的な新 confirm mode (`rsi2only`, `vixpeak-or-rsi2x10`, `noconfirm`) と tighter exit preset の raw_source load テストを追加する。
- `tests/preset-validation.test.js` の `EXPECTED_LIVE_IDS` と live preset count を post-change totals に更新する。
- `tests/repo-layout.test.js` の live preset / catalog count を post-change totals (`74`, `76`) に更新する。
- `tests/strategy-catalog.test.js` と `tests/strategy-live-retired-diff.test.js` の live/catalog count hardcode を post-change totals に更新する。

### GREEN

- campaign 定義、preset 定義、catalog 追加、raw_source 追加を行い、上記 focused tests を通す。

### REFACTOR

- strategy naming と raw_source directory 構成を揃え、重複説明や不要差分を削る。

## Validation commands

- `node --test tests/campaign.test.js`
- `node --test tests/backtest.test.js`
- `node --test tests/preset-validation.test.js`
- `node --test tests/strategy-catalog.test.js tests/strategy-live-retired-diff.test.js`
- `node --test tests/repo-layout.test.js`

## Risks / watchpoints

- `strategy-catalog.json` の live 件数期待値は既存 baseline drift があるため、今回追加分だけでなく repo 現況差分も見える可能性がある。
- `noconfirm` と `rsi2only` は DD 悪化の可能性が高いので、実装時に weakMarket 条件そのものは触らず confirm 条件だけを切り替える。
- raw_source 40 本の量が多いので、手編集ではなく既存 Pine からの外科的複製で揃える。
- `tests/preset-validation.test.js` と `tests/repo-layout.test.js` は件数と順序を hardcode しているため、campaign / preset 実装だけでは終わらない。
- `tests/strategy-catalog.test.js` と `tests/strategy-live-retired-diff.test.js` も live/catalog count と ID 一覧を hardcode している。
- 今回は signal count / order-history export を入れないため、SMA20/SMA25 の「完全同値なら preset 統合」判断までは行わず、まずは metrics 差分の有無確認までに留める。

## Execution checklist

- [ ] `strongest-plus-recovery-reversal-us40-50pack` の campaign / config 命名で統一する
- [ ] 既存 10 anchor strategy を campaign に再利用する
- [ ] 新規 40 preset id を `strategy-presets.json` に追加する
- [ ] 新規 40 live catalog entry を `strategy-catalog.json` に追加する
- [ ] baseline preset は既存 `source_path` を維持し、新 directory へ複製しない
- [ ] 新規 raw_source Pine を `docs/references/pine/strongest-plus-recovery-reversal-us40-50pack/` に追加する
- [ ] `tests/campaign.test.js` に 50pack campaign 解決テストを追加する
- [ ] `tests/backtest.test.js` に代表 preset load テストを追加する
- [ ] `tests/preset-validation.test.js` / `tests/repo-layout.test.js` の hardcoded count と order を更新する
- [ ] `tests/strategy-catalog.test.js` / `tests/strategy-live-retired-diff.test.js` の hardcoded count と order を更新する
- [ ] focused tests を通す
- [ ] `gh workflow run` 用の専用 config path を使う前提で最終 review する
