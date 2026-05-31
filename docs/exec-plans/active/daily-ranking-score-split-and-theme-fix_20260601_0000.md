# Daily Ranking Score Split And Theme Fix 2026-06-01 00:00

## 目的

US 日次スクリーニングレポートについて、銘柄表の `総合点` を「Technical / Fundamental の内訳が見える表示」に改善し、`Rule40` 列の補助注記（`Rule 40+` / `20未満注意`）を外して数値中心の表示へ揃える。あわせて、`Phase2 テーマランキング` の `Unclassified` を徹底調査し、分類漏れが原因なら最小変更で解消する。

## 変更ファイル

- 変更: `scripts/screener/run-fundamental-screening.mjs`
  - 銘柄表の `総合点` 列表示を、総合点に加えて `T` / `F` 内訳が読める形へ変更する。
  - `Rule40` 列の badge / warning 文言を削り、数値または欠損情報だけを表示する。
- 変更候補: `src/core/theme-taxonomy.js`
  - `Unclassified` の原因が分類ロジック側なら、最小限の判定修正を行う。
- 変更候補: `config/screener/theme-taxonomy-us.json`
  - `Unclassified` の原因が taxonomy coverage 不足なら、該当銘柄 / keyword を追加する。
- 変更: `tests/daily-screener-report.test.js`
  - 新しい `総合点` 表示と `Rule40` 表示を検証し、生成 Markdown の期待値を更新する。
- 追加候補: `tests/theme-taxonomy.test.js`
  - `Unclassified` 調査結果が taxonomy 修正に繋がる場合、該当銘柄が期待テーマへ分類されることを固定化する。
- 生成更新: `docs/reports/screener/daily-ranking.md`
  - 実レポートを再生成し、新表示とテーマ修正を反映する。
- 生成更新の可能性: `docs/reports/screener/daily-ranking-run.json`
  - 再生成で theme / score 表示に関連する出力が変わる場合は追従させる。
- 必要時のみ変更: `docs/reports/screener/TEMPLATE.md`
  - 列見出しや読み方の説明が雛形とズレる場合のみ追従する。

## 影響範囲

- 対象は US 日次レポートの表示改善と theme taxonomy の分類精度。
- 既存の Phase1 / Phase2 抽出条件、総合点そのものの計算式、並び順は変更しない。
- `Rule40` の表示簡素化は US レポート中心だが、共有関数を触る場合は JP 出力への副作用も確認する。
- `Unclassified` 調査は、まず実データと taxonomy の照合を行い、修正は原因に直結する最小範囲に限定する。

## 実装方針

- `総合点` は現行 `rankBreakdown` を再利用し、**Technical = Price momentum + Sector strength、Fundamental = Profitability/quality + Growth confirmation + Risk/value guard + Rule of 40** として表示のみ集約する。
- まず RED として、`tests/daily-screener-report.test.js` に新しい `総合点` / `Rule40` 表示の期待値を追加する。
- `Unclassified` は現行 run と taxonomy を照らし、`themeMatchReason` と row metadata から原因を切り分ける。
- taxonomy 側の不足であれば config 追加を優先し、ロジック変更は config で解決できない場合に限る。

## 実装ステップ

- [ ] `buildMarkdown()` と関連 helper のうち、`総合点` / `Rule40` 表示に必要な最小変更点を特定する。
- [ ] `tests/daily-screener-report.test.js` に新表示の RED を追加する。
- [ ] `scripts/screener/run-fundamental-screening.mjs` を更新し、`総合点` の `T/F` 内訳表示と `Rule40` の簡素表示を実装する。
- [ ] `Phase2 テーマランキング` の `Unclassified` について、現行 run 出力・taxonomy・会社/industry 情報を突き合わせて原因を確定する。
- [ ] 原因に応じて `config/screener/theme-taxonomy-us.json` または `src/core/theme-taxonomy.js` を最小変更で修正する。
- [ ] 必要なら `tests/theme-taxonomy.test.js` を追加し、該当銘柄の分類を固定化する。
- [ ] `node --test tests/daily-screener-report.test.js tests/theme-taxonomy.test.js` を実行する（追加しない場合は既存テストのみ）。
- [ ] `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs` を実行し、`docs/reports/screener/daily-ranking.md` を再生成する。
- [ ] `git diff --check` を実行する。
- [ ] 計画ファイルを completed へ移動し、変更をコミット・push する。

## 検証

- `node --test tests/daily-screener-report.test.js`
- `node --test tests/theme-taxonomy.test.js`（追加した場合）
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs`
- `git diff --check`

## リスク

- `総合点` の列に情報を詰め込みすぎると Markdown 表が読みにくくなるため、内訳は短い表記に留める必要がある。
- `Rule40` 表示 helper は JP 側でも共有しているため、US 向けの簡素化で欠損表示まで壊さないよう注意が必要。
- `Unclassified` が単純な symbol 漏れではなく industry 名の揺れなら、狭すぎる fix だと再発しうる一方、広げすぎると誤分類を増やす。

## 既存プランとの重複確認

- 作業ディレクトリ上の `docs/exec-plans/active/` に競合する進行中 plan は見当たらない。
- ただし git status 上は前タスクの active plan 削除差分が残っているため、この PLAN コミットでは新規 plan ファイルだけを stage する。

## スコープ外

- 総合点の重み配分そのものの見直し
- Phase1 / Phase2 の hard gate や採用セクター数の再設計
- Communications / Producer Manufacturing の profile 条件変更
- テーマ taxonomy の全面刷新や大規模リネーム
