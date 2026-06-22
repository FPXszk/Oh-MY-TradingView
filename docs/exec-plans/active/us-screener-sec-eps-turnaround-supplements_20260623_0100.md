# Exec-plan: us-screener-sec-eps-turnaround-supplements_20260623_0100

## Goal

米国 daily screener の EPS YoY が `N/A` になっている銘柄のうち、SEC companyfacts で前年同区分 EPS が赤字またはゼロ以下、直近期 EPS が黒字と確認できるものを `黒字転換` として表示・採点できるようにする。

## Problem

前回の対策は `eps > 0 && epsGrowthTtm < -100` の TradingView raw 値が返るケースには効く。しかし現在の `SNDK` は TradingView 側の `earnings_per_share_diluted_yoy_growth_ttm` が `null` になっており、レポート上は `N/A%` に見える。公式 SEC companyfacts では `SNDK` は FY2026 Q3 diluted EPS 29.42、前年同 Q3 -11.16 で黒字転換のため、N/A のままでは意図に反する。

## Assumptions

- 今回は毎回 SEC API を全銘柄に対して叩く実装は入れない。
- まずは現在の US report で EPS YoY が `N/A` になっている銘柄を SEC companyfacts で確認し、意味が明確な黒字転換だけを repo の static supplement に追加する。
- TradingView raw 値は引き続き優先し、欠損時だけ static supplement を使う。
- 補助データには source / period / current EPS / previous EPS を残す。

## Investigation Snapshot

2026-06-23 01:00 JST 時点の `daily-ranking.md` 再生成後、EPS YoY が `N/A` だった主な US 銘柄:

- `SNDK`: SEC `EarningsPerShareDiluted`, FY2026 Q3 29.42 vs FY2025 Q3 -11.16, `turnaround_to_profit`
- `MRVL`: SEC `EarningsPerShareDiluted`, FY2027 Q1 0.04 vs FY2026 Q1 0.20, `same_sign_or_normal`
- `GFS`: SEC IFRS `DilutedEarningsLossPerShare`, FY2025 FY 1.59 vs FY2024 FY -0.48, `turnaround_to_profit`
- `MTSI`: SEC `EarningsPerShareDiluted`, FY2026 Q2 1.23 vs FY2025 Q2 -1.85, `turnaround_to_profit`
- `MCHP`: SEC `EarningsPerShareDiluted`, FY2026 FY 0.22 vs FY2025 FY -0.01, `turnaround_to_profit`
- `MCHPP`: same CIK/facts as `MCHP`, `turnaround_to_profit`
- `COHR`: SEC `EarningsPerShareDiluted`, FY2026 Q3 2.92 vs FY2025 Q3 0.30, `same_sign_or_normal`
- `NBIS`: SEC `EarningsPerShareDiluted`, FY2025 FY 0.33 vs FY2024 FY -2.28, `turnaround_to_profit`

## Files

| File | Action | Purpose |
|---|---|---|
| `config/screener/us-fundamental-supplements.json` | MODIFY | SEC-backed EPS turnaround supplement entriesを追加 |
| `src/core/fundamental-screener.js` | MODIFY | static supplement の EPS turnaround metadata を TradingView 欠損時に適用 |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | 必要なら EPS display の補足文言を微調整 |
| `tests/fundamental-screener.test.js` | MODIFY | static SEC supplement で `N/A` が `黒字転換` 表示/採点に変わることを固定 |
| `tests/daily-screener-report.test.js` | MODIFY | レポート上の `黒字転換` 表示を固定 |
| `docs/reports/screener/daily-ranking.md` | MODIFY | 実行結果を再生成して SNDK 等の表示を更新 |
| `docs/exec-plans/active/us-screener-sec-eps-turnaround-supplements_20260623_0100.md` | CREATE | 本計画 |
| `docs/exec-plans/completed/us-screener-sec-eps-turnaround-supplements_20260623_0100.md` | MOVE | 完了時に移動 |

## Scope

### In scope

- SEC companyfacts で確認済みの `turnaround_to_profit` 銘柄だけ補助する。
- EPS YoY raw が欠損している場合に `黒字転換 (SEC current→previous)` のように表示する。
- growth block では既存の `EPS_TURNAROUND_SCORE` を使って加点する。
- Moomoo/Python が無い環境でも static supplement だけで動くようにする。

### Out of scope

- SEC API を日次で全候補へ自動問い合わせする仕組み。
- MRVL/COHR のような黒字転換ではない N/A を無理に補完すること。
- Japan screener の EPS 補完。
- 公式 IR PDF/ニュースリリース全文の保存。

## Implementation Steps

- [ ] Step 1: static supplement の schema を最小拡張する。
  - 確認: existing NBIS 補助との互換性を壊さない。
- [ ] Step 2: `computeStaticMissingMetricSupplement` / EPS metadata 適用を拡張する。
  - 確認: TradingView 欠損時だけ static EPS turnaround が使われる。
- [ ] Step 3: SEC-backed supplement entries を追加する。
  - 確認: SNDK/GFS/MTSI/MCHP/MCHPP/NBIS が `turnaround_to_profit` になる。
- [ ] Step 4: focused tests を追加/更新する。
  - 確認: core と markdown 表示の両方で `黒字転換` が出る。
- [ ] Step 5: US screener report を再生成する。
  - 確認: `docs/reports/screener/daily-ranking.md` の SNDK が `N/A%` ではなく `黒字転換` になる。
- [ ] Step 6: 検証とレビュー。
  - 確認: focused tests と `npm run test:unit` が通る。

## Validation Commands

```powershell
node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js
npm run test:unit
```

Report regeneration:

```powershell
$env:SCREENER_WORKFLOW_LABEL='daily-screener'
$env:SCREENER_REPORT_PATH='docs/reports/screener/daily-ranking.md'
$env:SCREENER_RESULT_LIMIT='90'
$env:SCREENER_MARKET='america'
$env:SCREENER_EXCHANGES='NASDAQ,NYSE'
$env:SCREENER_SELECTED_SECTOR_COUNT='3'
$env:SCREENER_EXTRA_PHASE1_SECTORS='Technology Services'
$env:SCREENER_GROSS_MARGIN_MIN_PCT='30'
$env:SCREENER_SCOPE_LABEL='NASDAQ + NYSE stocks only (OTC excluded)'
node scripts/screener/run-fundamental-screening.mjs
```

## Risks

- Static supplement は将来の新しい決算で古くなるため、source/period を表示またはメタデータとして残す必要がある。
- SEC fiscal period と TradingView TTM YoY は完全一致しない。今回は `EPS YoY%` の代替数値ではなく、状態ラベル `黒字転換` として扱う。
- Preferred share ticker `MCHPP` は `MCHP` と同じ CIK/facts を参照するため、表示・採点で普通株と同じ会社 EPS を使う妥当性を明示する。
