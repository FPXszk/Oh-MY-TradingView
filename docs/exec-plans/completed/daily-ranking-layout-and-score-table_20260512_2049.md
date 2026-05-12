# Daily Ranking Layout And Score Table 2026-05-12 20:49

## 目的

日次スクリーニングレポートの並び順と説明の出し方をさらに整える。`Phase1 セクターランキング` 冒頭の `アプローチ` / `採用セクター` を削除し、`上位5件の選定理由` を `銘柄ランキング` の下へ移動する。テンプレの `超急騰候補` 説明を簡略化し、`スコア算出` は重み・評価項目・重要度が分かる表形式へ変更する。その上で実レポートを再生成する。

## 変更ファイル

- 変更: `docs/reports/screener/TEMPLATE.md`
  - `Phase1 セクターランキング` の説明を `Phase1 ソース候補数` のみにする。
  - `上位5件の選定理由` を `銘柄ランキング` の下に移動する。
  - `超急騰候補` のテンプレ説明を削る。
  - `スコア算出` を表形式の雛形へ変更する。
- 変更: `scripts/screener/run-fundamental-screening.mjs`
  - `Phase1 セクターランキング` 直下の `アプローチ` / `採用セクター` を出さない。
  - `上位5件の選定理由` の出力位置を `銘柄ランキング` の後ろへ移動する。
  - `スコア算出` を重み・評価項目・役割が分かる表で出力する。
- 変更: `tests/daily-screener-report.test.js`
  - 新しい並び順と削除文言、`スコア算出` 表を検証する。
- 生成更新: `docs/reports/screener/daily-ranking.md`
  - US レポートを新レイアウトで再生成する。
- 移動: `docs/exec-plans/active/daily-ranking-layout-and-score-table_20260512_2049.md` → `docs/exec-plans/completed/daily-ranking-layout-and-score-table_20260512_2049.md`

## 影響範囲

- レポートの構成と説明文のみを変更し、スクリーニングの計算や抽出条件は変えない。
- US / JP とも Markdown 構造変更の影響を受ける。

## 実装ステップ

- [x] テンプレートの章順と説明文を更新する。
- [x] 実生成ロジックの順序と `スコア算出` 表を更新する。
- [x] テストを更新する。
- [x] `node --test tests/daily-screener-report.test.js tests/fundamental-screener.test.js` を実行する。
- [x] `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs` を実行してレポートを再生成する。
- [x] `git diff --check` を実行する。
- [x] 計画を completed へ移動し、変更をコミット・push する。

## 検証

- `node --test tests/daily-screener-report.test.js tests/fundamental-screener.test.js`
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs`
- `git diff --check`

## リスク

- `上位5件の選定理由` を後ろに移すと、最初にランキング表を読む前提になるので、表の可読性を維持する必要がある。
- `スコア算出` 表の列数を増やしすぎると Markdown 上で崩れやすいため、役割と重みの要点に絞る。
