# Exec-plan: test-suite-lighten-and-prune-obsolete-guards_20260504_2353

## 概要

目的: `npm test` を日常運用向けに短くし、不要になった `repo-layout` 回帰を削除しつつ、obsolete な `night-batch` fixture 依存ケースを整理して、普段のテスト実行を軽く・壊れにくくする。

- `tests/repo-layout.test.js` は削除する
- デフォルトの `npm test` / `npm run test:ci` から `tests/night-batch.test.js` を外して軽量化する
- `night-batch` 系は必要なら明示的に叩ける入口を残す
- `tests/night-batch.test.js` 内の、現行 repo 構造とズレた `campaigns/current/next-long-run-*.json` 依存ケースは不要分を削除する
- 既存 active plan（`repo-structure-align-and-archive-rules_20260424_2015.md`, `run-night-batch_20260429_2344.md`）とは対象が重ならない

## 変更ファイル（作成 / 変更 / 削除）

- 変更: `package.json`
- 変更: `README.md`
- 変更: `tests/night-batch.test.js`
- 削除: `tests/repo-layout.test.js`

## 実装方針

1. `package.json` の test scripts を整理し、日常の `npm test` を軽量セットにする
2. `night-batch` は別 script に分離するか、少なくとも default path から外して手動実行前提にする
3. `tests/repo-layout.test.js` を削除し、script 参照も除去する
4. `tests/night-batch.test.js` の末尾付近にある obsolete な live-checkout baseline warning ケース群を削除し、fixture 不整合で落ちる経路を消す
5. `README.md` の test コマンド説明を新しい運用に合わせる

## 範囲

含む:

- default test command の軽量化
- obsolete / brittle test の削除
- README の test 実行案内更新

含まない:

- `night-batch` 本体ロジックの修正
- 欠落 fixture の新規作成
- repo policy を別ファイルで再実装すること
- E2E / TradingView 接続系テストの範囲変更

## 実装ステップ

- [ ] `package.json` の `test` / `test:ci` / `test:all` を見直し、default path から `night-batch` と `repo-layout` を外す
- [ ] `tests/repo-layout.test.js` を削除し、参照を完全に外す
- [ ] `tests/night-batch.test.js` から obsolete な `next-long-run-*` current campaign 前提ケースを削除する
- [ ] `README.md` のテスト実行例を新しい script 構成に合わせて更新する
- [ ] 軽量化後の default test と、残す `night-batch` 専用入口の両方が意図通り動くことを確認する

## テスト戦略

RED:

- `package.json` / `README.md` / `tests/night-batch.test.js` / `tests/repo-layout.test.js` の変更前提を先に確認し、不要ケースが default path に残っている状態を解消対象として固定する

GREEN:

- `npm test` が `night-batch` / `repo-layout` なしで走る状態にする
- `night-batch` の残す入口では、obsolete case を除いた suite が実行できる状態にする

REFACTOR:

- script 名と README 記述を揃え、重複した説明を残さない

## 検証コマンド

- `npm test`
- `node --test tests/night-batch.test.js`
- `npm run test:all`

## リスク・注意点

- `repo-layout` を削除するので、repo 構造の崩れを検知する自動ガードは弱くなる
- `night-batch` を default path から外すことで、関連回帰は明示的に専用 script を回さない限り見逃しやすくなる
- `tests/night-batch.test.js` から削る範囲を広げすぎると、live-checkout baseline 保護の回帰検知まで失う可能性がある

---

作成者: Copilot
作成日時: 2026-05-04T23:53:42+09:00
