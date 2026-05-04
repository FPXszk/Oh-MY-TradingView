# Exec-plan: remove-devinit-regression-test_20260505_0054

## 概要

目的: 不要になった `tests/devinit.test.js` を削除し、default test path からも外して、`npm test` がその回帰に引っかからない状態にする。

- 削除対象は `tests/devinit.test.js`
- `package.json` の `test:unit` から `tests/devinit.test.js` 参照を外す
- README に個別の `devinit.test.js` 案内はないため、README 更新は不要見込み
- 既存 active plan（`repo-structure-align-and-archive-rules_20260424_2015.md`, `run-night-batch_20260429_2344.md`）とは対象が重ならない

## 変更ファイル（作成 / 変更 / 削除）

- 変更: `package.json`
- 削除: `tests/devinit.test.js`

## 実装方針

1. `tests/devinit.test.js` を削除する
2. `package.json` の `test:unit` から `tests/devinit.test.js` を除去する
3. `npm test` を再実行し、少なくとも今回の削除対象が default path から消えていることを確認する

## 範囲

含む:

- devinit 回帰テストの削除
- default test script からの参照削除

含まない:

- `devinit.sh` 本体の修正
- 他の test suite 再編
- README の test コマンド再設計

## 実装ステップ

- [ ] `tests/devinit.test.js` を削除する
- [ ] `package.json` の `test:unit` 参照を更新する
- [ ] `npm test` で default suite から `devinit` が外れていることを確認する

## テスト戦略

RED:

- 現状の `package.json` に `tests/devinit.test.js` が含まれていることを前提として固定する

GREEN:

- `tests/devinit.test.js` を削除し、`npm test` からも参照を外す

REFACTOR:

- 追加の整理は行わず、今回の削除に直接必要な差分だけに留める

## 検証コマンド

- `npm test`

## リスク・注意点

- `devinit` の起動回帰を自動検知する test はなくなる
- `npm test` に残る他の失敗は別件として残る可能性がある

---

作成者: Copilot
作成日時: 2026-05-05T00:54:38+09:00
