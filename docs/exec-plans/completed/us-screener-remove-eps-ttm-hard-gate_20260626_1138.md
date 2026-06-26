# US Screener remove EPS TTM hard gate plan

## Goal

米国 Daily Fundamental Screener の個別銘柄候補取得・スクリーニングから `EPS(TTM) > 0` の hard gate を外し、INTC のように直近 EPS(TTM) が赤字でも強い価格モメンタムとセクター/Industry条件を満たす銘柄をランキング対象に入れられるようにする。

## Files

| File | Action | Scope |
|---|---|---|
| `src/core/fundamental-screener.js` | MODIFY | TradingView scanner request の `earnings_per_share_diluted_ttm > 0` filter と criteria 表示値を削除/無効化 |
| `src/core/sector-screening-profiles.js` | MODIFY if needed | profile threshold から `epsMin` が不要なら削除、または未使用化に合わせて最小調整 |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | レポートの共通条件から `EPS(TTM) > 0` 文言を外す |
| `tests/fundamental-screener.test.js` | MODIFY | EPS赤字でも候補に残ること、既存ランキングが壊れないことを固定 |
| `tests/daily-screener-report.test.js` | MODIFY | レポート共通条件の表示変更を固定 |
| `docs/reports/screener/daily-ranking.md` | UPDATE | レポートを再生成し、INTC が対象に入るか確認する |

## Implementation Steps

- [x] Step 1: 現行の EPS gate 適用箇所を確認する。
  - Check: Phase1/Phase2 Industry広域取得には EPS gate がないこと、個別候補取得だけが対象であることを確認する。
- [x] Step 2: RED テストを更新/追加する。
  - Check: EPS(TTM) がマイナスの米国銘柄が TradingView候補取得から除外されない期待にする。
- [x] Step 3: `EPS(TTM) > 0` hard gate を外す。
  - Check: TradingView request body から EPS filter が消え、診断/criteria 表示も矛盾しない。
- [x] Step 4: レポート文言を更新する。
  - Check: 共通条件に EPS(TTM) > 0 が残らない。
- [x] Step 5: テストと実レポート生成を実行する。
  - Check: `npm run test:unit` と `git diff --check` が通り、`daily-ranking.md` で INTC の扱いを確認する。
- [x] Step 6: 自己レビューし、計画を completed へ移動してコミット・プッシュする。
  - Check: CRDO の全セクター方式はこの実装に混ぜず、設計検討として報告する。

## Out of Scope

- Phase1 セクターランキング方式の変更。
- CRDO を入れるための全セクター上位N方式や Technology Services 強制追加の実装。
- EPS赤字銘柄専用の新スコアリングブロック追加。
- SEC/外部データで EPS(TTM) 自体を補完する実装。

## Risks

- EPS赤字銘柄がランキング対象に増えるため、品質スコアや成長スコアで赤字リスクを十分に反映できているか確認が必要。
- INTC のような大型赤字ターンアラウンド候補は入る一方、低品質の赤字銘柄も母集団に入りやすくなる。
- TradingView の scanner取得件数上限内で、EPS gate削除により候補分布が変わる可能性がある。

## Validation Commands

```powershell
npm run test:unit
git diff --check
$env:SEC_USER_AGENT='Oh-MY-TradingView szk23b0702@gmail.com'; node scripts/screener/run-fundamental-screening.mjs
```
