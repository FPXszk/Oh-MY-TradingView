# Add Rule of 40 to US Screener 2026-05-12 19:55

## 目的

`docs/strategy/momentum-fundamental-screening-indicators-research_20260505.md` の提案通り、US のスクリーニングワークフローに Rule of 40 proxy を追加する。初回は hard filter ではなく、Software 系候補の説明・補助 ranking・レポート表示として導入し、実行結果で効き方を確認する。

## 変更ファイル

- 変更: `src/core/fundamental-screener.js`
  - `total_revenue_yoy_growth_ttm + free_cash_flow_margin_ttm` で `ruleOf40` を計算する。
  - US market の Technology Services / Software 系 industry に限定して Rule of 40 を適用する。
  - Rule of 40 を小さな補助 ranking block として追加し、非対象銘柄は rank 欠損として扱う。
  - criteria に Rule of 40 の導入方針を記録する。
- 変更: `scripts/screener/run-fundamental-screening.mjs`
  - 上位理由、ランキング表、採用指標、scoring guide に Rule of 40 を表示する。
  - `ruleOf40 >= 40` を badge、`ruleOf40 < 20` を warning として読み取れる表示にする。
- 変更: `tests/fundamental-screener.test.js`
  - US Software 系銘柄で Rule of 40 が計算されることを確認する。
  - Japan workflow では Rule of 40 が適用されないことを確認する。
- 変更: `tests/daily-screener-report.test.js`
  - Markdown レポートに Rule of 40 列・説明が出ることを確認する。
- 移動: `docs/exec-plans/active/add-rule-of-40-to-us-screener_20260512_1955.md` → `docs/exec-plans/completed/add-rule-of-40-to-us-screener_20260512_1955.md`
  - 実装と検証完了後に completed へ移動する。
- 生成/更新の可能性: `docs/reports/screener/daily-ranking.md`, `docs/reports/screener/daily-ranking-run.json`
  - 実行結果の確認用。既存ワークフローの出力先に合わせる。

## 影響範囲

- US (`america`) のファンダメンタルスクリーナーのみ。
- Japan workflow には Rule of 40 を適用しない。
- Rule of 40 は hard filter にしないため、候補数を直接減らさない。
- 既存の revenue growth / FCF margin は残し、Rule of 40 の weight は低くして二重カウントを抑える。

## 実装ステップ

- [ ] `fundamental-screener` に US Software 判定と Rule of 40 計算を追加する。
- [ ] Rule of 40 補助 ranking block と criteria 出力を追加する。
- [ ] 日次レポート Markdown に Rule of 40 の列・badge・warning・scoring guide を追加する。
- [ ] 単体テストを更新し、USのみ適用されることを確認する。
- [ ] `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js` を実行する。
- [ ] 実スクリーナーをUS設定で実行し、出力結果と上位候補の Rule of 40 を確認する。
- [ ] `git diff --check` と必要な追加検証を実行する。
- [ ] 計画ファイルを completed に移動して、実装変更をコミット・pushする。

## 検証

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `node scripts/screener/run-fundamental-screening.mjs`
- `git diff --check`

## リスク

- TradingView の industry 名が Software 系を十分に表さない場合、Rule of 40 対象が少なく出る可能性がある。
- Rule of 40 は revenue growth と FCF margin の合成指標なので、weight を上げすぎると既存 growth / quality block と二重カウントになる。
- 実行時点の TradingView データ欠損により、`ruleOf40` が `N/A` になる銘柄がある。
