# Daily Ranking Template Table Refresh 2026-05-12 20:25

## 目的

日次スクリーニングレポートのテンプレートと実出力を整理し、`市場カバレッジ`、`採用した P0 / P1 指標`、`今後改善できそうな点` を削除する。最後の `フィルター条件と scoring guide` は詳細を確認しやすい Markdown 表へ変更し、そのうえで実際にレポートを再生成する。

## 変更ファイル

- 変更: `docs/reports/screener/TEMPLATE.md`
  - 不要セクションを削除し、最後の guide を表形式の雛形へ変更する。
- 変更: `scripts/screener/run-fundamental-screening.mjs`
  - 不要セクションの出力を削除する。
  - `フィルター条件と scoring guide` を詳細な表で出力する。
- 変更: `tests/daily-screener-report.test.js`
  - 削除セクションが出ないこと、guide が表形式で出ることを検証する。
- 生成更新: `docs/reports/screener/daily-ranking.md`
  - US 実行結果を新フォーマットで再生成する。
- 移動: `docs/exec-plans/active/daily-ranking-template-table-refresh_20260512_2025.md` → `docs/exec-plans/completed/daily-ranking-template-table-refresh_20260512_2025.md`

## 影響範囲

- レポートの見た目と説明部分のみを変更し、スクリーニング条件やランキング計算ロジックは変更しない。
- US / JP の Markdown 出力は同じ構造変更を受ける。

## 実装ステップ

- [ ] テンプレートから不要セクションを外し、guide 表の雛形を定義する。
- [ ] `buildMarkdown()` を更新して guide を表形式で出力する。
- [ ] テストを更新する。
- [ ] `node --test tests/daily-screener-report.test.js tests/fundamental-screener.test.js` を実行する。
- [ ] `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs` を実行してレポートを再生成する。
- [ ] `git diff --check` を実行する。
- [ ] 計画を completed へ移動し、変更をコミット・push する。

## 検証

- `node --test tests/daily-screener-report.test.js tests/fundamental-screener.test.js`
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs`
- `git diff --check`

## リスク

- guide を表に寄せると横幅が増えるので、列数は抑えて読みやすさを優先する。
- セクター別条件を表へ落とし込む際に、既存の補助ポリシーと混ざって読みにくくならないよう行の粒度を揃える。
