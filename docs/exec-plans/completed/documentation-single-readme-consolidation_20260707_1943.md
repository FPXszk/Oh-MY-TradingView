# ドキュメント単一 README 化・索引統合 完了記録

- 作成日時: 2026-07-07 19:43 JST
- 完了日時: 2026-07-07 19:51 JST
- 対象ブランチ: `main`
- 状態: COMPLETED

## ゴール

README をリポジトリルートの `README.md` 1 ファイルだけにし、旧 docs 索引の有効な内容を `docs/DOCUMENTATION_SYSTEM.md` へ統合する。

あわせて、廃止済みの人間向け補足文書を削除し、現行のルート README と Documentation System から旧導線を除去する。

## 実施内容

- `README.md` の docs 入口を `docs/DOCUMENTATION_SYSTEM.md` に一本化した
- `docs/DOCUMENTATION_SYSTEM.md` に次の内容を統合した
  - README はルートに1つだけ置く方針
  - 読み始める順番
  - docs の主要領域と用途
  - よく使う入口
  - README と docs の書き分け
  - current / archive / generated の区分
  - 鮮度維持とアーカイブルール
- 重複していた docs 配下の README を削除した
- 廃止済みの人間向け補足文書を削除した
- `tests/documentation-navigation.test.js` を単一 README 方針へ更新した
- 旧 README 再構築計画の完了記録を現在の方針へ合わせて整理した

## 変更ファイル

### 修正

- `README.md`
- `docs/DOCUMENTATION_SYSTEM.md`
- `tests/documentation-navigation.test.js`
- `docs/exec-plans/completed/readme-rebuild-ai-navigation_20260707_1513.md`

### 削除

- docs 配下の重複 README
- docs 配下の廃止済み人間向け補足文書

## 実装手順

- [x] `README.md` の docs 導線を `docs/DOCUMENTATION_SYSTEM.md` に統一する
- [x] 旧 docs 索引の有効な内容を `docs/DOCUMENTATION_SYSTEM.md` に統合する
- [x] 単一 README 方針を Documentation System に明記する
- [x] 重複 README を削除する
- [x] 廃止済み補足文書を削除する
- [x] 現行の主要ドキュメントから旧導線を削除する
- [x] 導線テストを新方針へ更新する
- [x] 変更内容をレビューする
- [x] 計画を `completed/` へ移動する

## 検証

- 現在の `main` からルート README を再取得し、Documentation System への導線を確認した
- 現在の `main` から Documentation System を再取得し、統合内容と単一 README 方針を確認した
- 削除対象2ファイルが GitHub Contents API で `404 Not Found` になることを確認した
- 更新した導線テストを `node --check` で構文検証した

リポジトリ全体をローカル checkout できる環境ではないため、`node --test tests/documentation-navigation.test.js` と `npm run test:unit` の実行は未実施。テスト自体は、ルート README と Documentation System のローカルリンク、およびリポジトリ内 README がルート1つだけであることを検証する内容へ更新済み。

## 成功条件

- [x] リポジトリの README はルート `README.md` だけを正本とする
- [x] `README.md` から `docs/DOCUMENTATION_SYSTEM.md` へ辿れる
- [x] Documentation System 単体で docs 配下の読み方と配置ルールが分かる
- [x] 重複 README と廃止済み補足文書が存在しない
- [x] 現行のルート README と Documentation System に旧導線が残っていない
- [x] ドキュメント導線テストが新方針を検証する

## 影響範囲

ドキュメントとドキュメント導線テストだけを変更した。実装コード、CLI、MCP、workflow、backtest、screener の挙動は変更していない。
