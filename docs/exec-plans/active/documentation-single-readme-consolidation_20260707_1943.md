# ドキュメント単一 README 化・索引統合計画

- 作成日時: 2026-07-07 19:43 JST
- 対象ブランチ: `main`
- 状態: ACTIVE

## ゴール

README をリポジトリルートの `README.md` 1 ファイルだけにし、旧 `docs/README.md` の索引内容を `docs/DOCUMENTATION_SYSTEM.md` へ統合する。

あわせて、削除済み扱いの `docs/explain-forhuman.md` と、その名称・パスへの参照をリポジトリから除去する。

## 変更対象

### 修正

- `README.md`
  - docs の入口を `docs/DOCUMENTATION_SYSTEM.md` に一本化する
  - `docs/README.md` へのリンクを削除する
- `docs/DOCUMENTATION_SYSTEM.md`
  - `docs/README.md` の索引内容を統合する
  - README はルートに1つだけ置く方針を明文化する
  - 読み順、配置ルール、主要領域、current/archive/generated、鮮度維持を現行構成に合わせる
- `tests/documentation-navigation.test.js`
  - `docs/README.md` の存在前提を削除する
  - ルート README と Documentation System のリンクを検証する
  - 廃止ファイルと旧導線が復活しないことを検証する
- `docs/exec-plans/completed/readme-rebuild-ai-navigation_20260707_1513.md`
  - 旧 `docs/README.md` 前提の完了記録を、現在の単一 README 方針に合わせて整理する

### 削除

- `docs/README.md`
- `docs/explain-forhuman.md`

## 影響範囲

ドキュメント、ドキュメント導線テスト、過去の README 再構築計画の記録だけを変更する。実装コード、CLI、MCP、workflow、backtest、screener の挙動は変更しない。

## 実装手順

- [ ] `README.md` の docs 導線を `docs/DOCUMENTATION_SYSTEM.md` に統一する
- [ ] `docs/README.md` の有効な内容を `docs/DOCUMENTATION_SYSTEM.md` に統合する
- [ ] 単一 README 方針を Documentation System に明記する
- [ ] `docs/README.md` を削除する
- [ ] `docs/explain-forhuman.md` を削除する
- [ ] 旧パス・旧名称への参照を削除する
- [ ] 導線テストを新方針へ更新する
- [ ] 変更内容をレビューする
- [ ] 計画を `completed/` へ移動する

## 成功条件

- リポジトリ内の README はルート `README.md` だけである
- `README.md` から `docs/DOCUMENTATION_SYSTEM.md` へ辿れる
- `docs/DOCUMENTATION_SYSTEM.md` 単体で docs 配下の読み方と配置ルールが分かる
- `docs/README.md` と `docs/explain-forhuman.md` が存在しない
- 現行ドキュメントに旧2ファイルへの参照が残っていない
- `tests/documentation-navigation.test.js` が新方針を検証する
