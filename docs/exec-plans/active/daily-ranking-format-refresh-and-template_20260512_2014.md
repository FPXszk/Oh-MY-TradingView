# Daily Ranking Format Refresh And Template 2026-05-12 20:14

## 目的

`docs/reports/screener/daily-ranking.md` とその Markdown 生成処理について、見出しと日時表記を分かりやすく整え、冒頭の集計ラベルを意味が伝わる表現へ変更する。あわせて、現状コード内に埋め込まれているレポート雛形を独立したテンプレート文書として保存する。

## 変更ファイル

- 変更: `scripts/screener/run-fundamental-screening.mjs`
  - タイトルを `スクリーニング結果 YYYY/MM/DD（曜）` 形式へ変更する。
  - 更新行を JST のみの単独表記へ変更する。
  - 冒頭サマリーの `Phase2候補取得` / `スコープ通過` / `Phase1 選択セクター通過` / `クライアントフィルター通過` / `上位` を、処理内容が分かる日本語へ変更する。
  - 必要なら集計ラベル生成の小さな補助関数を追加する。
- 変更: `tests/daily-screener-report.test.js`
  - 新しいタイトル、日時表記、冒頭サマリー表現に合わせてテストを更新する。
- 作成: `docs/reports/screener/TEMPLATE.md`
  - 日次スクリーニングレポートの見出し、セクション順、冒頭サマリーの意味を確認できる雛形文書を追加する。
- 生成更新: `docs/reports/screener/daily-ranking.md`
  - 実スクリーナー再実行で新フォーマットの出力を反映する。
- 移動: `docs/exec-plans/active/daily-ranking-format-refresh-and-template_20260512_2014.md` → `docs/exec-plans/completed/daily-ranking-format-refresh-and-template_20260512_2014.md`
  - 完了時に completed へ移動する。

## 影響範囲

- 対象は日次レポートの表示文言とテンプレート文書のみで、スクリーニングの絞り込みロジック自体は変更しない。
- US / JP どちらの Markdown 出力にも同じ見出し・冒頭サマリー改善が反映される。
- テンプレートは説明用の静的文書として置き、実生成ロジックの正本は引き続き `buildMarkdown()` にある状態を維持する。

## 実装ステップ

- [ ] 現行の冒頭サマリー各件数がコード上で何を意味するか確認し、ユーザー向けラベル案へ落とす。
- [ ] `run-fundamental-screening.mjs` のタイトル・更新日時・冒頭サマリーを変更する。
- [ ] `docs/reports/screener/TEMPLATE.md` を追加し、各セクションの意図も短く記載する。
- [ ] `tests/daily-screener-report.test.js` を新フォーマットに合わせて更新する。
- [ ] `node --test tests/daily-screener-report.test.js tests/fundamental-screener.test.js` を実行する。
- [ ] `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs` を実行して実出力を確認する。
- [ ] `git diff --check` を実行する。
- [ ] 計画ファイルを completed へ移動し、変更をコミット・push する。

## 検証

- `node --test tests/daily-screener-report.test.js tests/fundamental-screener.test.js`
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs`
- `git diff --check`

## リスク

- ラベルを自然な日本語に寄せすぎると、コード上の処理段階との対応がかえって見えにくくなる可能性がある。
- タイトルを日付ベースにすると、レポート内容の種類が一目で分かりにくくなるため、`スクリーニング結果` の文言は残す。
- テンプレート文書と実コードの表記が将来ずれる可能性があるため、テンプレートには「正本は `buildMarkdown()`」であることを明記する。
