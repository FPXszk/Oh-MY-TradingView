# US Screener SEC EPS YoY numeric fallback plan

## Goal

TradingView の `earnings_per_share_diluted_yoy_growth_ttm` が `null` の米国銘柄について、SEC companyfacts の同四半期または同年度 EPS 比較から通常の EPS YoY 数値も補完する。既存の黒字転換表示・採点は維持し、通常補完では出典が分かる表示にする。

## Files

| File | Action | Scope |
|---|---|---|
| `src/core/sec-edgar.js` | MODIFY | SEC EPS 比較結果を黒字転換限定ではなく通常 YoY 補完にも使う |
| `src/core/fundamental-screener.js` | MODIFY | 通常 SEC EPS YoY 補完を `epsGrowthTtm` / 表示 / provenance に反映する |
| `tests/sec-edgar.test.js` | MODIFY | positive-to-positive / positive decline の SEC numeric YoY 補完を固定する |
| `tests/fundamental-screener.test.js` | MODIFY | screener 統合で `SEC補完` 表示と score source が反映されることを固定する |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY if needed | 表示関数が既存の `epsGrowthDisplay` で足りない場合のみ調整する |
| `docs/reports/screener/daily-ranking.md` | VERIFY/UPDATE if feasible | 実行可能なら再生成して MRVL/VRTX などの表示差分を確認する |

## Implementation Steps

- [ ] Step 1: 既存 SEC EPS 比較ロジックと missing metric merge を確認し、補完データ形を最小に決める。
  - Check: 黒字転換の既存 `epsGrowthStatus`, `epsGrowthScoreValue` を壊さない。
- [ ] Step 2: RED テストを追加する。
  - Check: positive-to-positive EPS 比較で SEC numeric YoY が返り、統合結果に `SEC補完` 表示が出る。
- [ ] Step 3: `sec-edgar` の補完出力を通常 YoY に拡張する。
  - Check: `previousEps === 0` や比較不能ケースでは無理に補完しない。
- [ ] Step 4: screener 側の merge を拡張する。
  - Check: TradingView 値がある場合は上書きせず、欠損時だけ SEC 補完を採用する。
- [ ] Step 5: テストとレポート生成を実行する。
  - Check: `npm run test:unit` と `git diff --check` が通る。可能なら daily report で MRVL/VRTX の `N/A%` が補完表示へ変わることを確認する。
- [ ] Step 6: 自己レビューし、計画を completed へ移動してコミット・プッシュする。
  - Check: 変更範囲が上記ファイルに収まり、関係ない差分がない。

## Out of Scope

- SEC companyfacts 以外の新データプロバイダ追加。
- EPS YoY 以外の GP/A、P/FCF、ATR% 補完拡張。
- TradingView の生値がある銘柄を SEC 値で置き換えること。
- SEC filing HTML/PDF の保存。

## Risks

- SEC の EPS 期間比較は TradingView TTM YoY と完全同義ではないため、表示に `SEC補完` を残す。
- 前年 EPS が 0 の場合は YoY 計算不能なので N/A 維持にする。
- SEC API は User-Agent がないと取得できないため、その場合は従来通り N/A 維持になる。

## Validation Commands

```powershell
npm run test:unit
git diff --check
node scripts/screener/run-fundamental-screening.mjs
```
