# Exec-plan: capture-test-hang-fix_20260505_0253

## 概要

目的: `tests/capture.test.js` が完走しない問題を修正する。

現時点の根本原因:

- `tests/capture.test.js` の前半 5 件はすぐ終わる
- 後半 2 件 (`rejects when CDP is not connected`) が `captureScreenshot()` から `getClient()` → `connect()` に入り、実際の CDP 接続リトライを実行してしまう
- `src/connection.js` の `connect()` は 5 回リトライ + 指数バックオフを持つため、unit test としては不必要に長く、`npm test` 全体の完走も阻害している

方針:

- 本番挙動は変えず、`captureScreenshot()` に **テスト用の依存注入ポイント** を最小限追加する
- `tests/capture.test.js` は実 CDP 接続を待たず、即時 reject する stub を使って失敗系を検証する

## 変更ファイル

- `docs/exec-plans/active/capture-test-hang-fix_20260505_0253.md` (この計画)
- `src/core/capture.js` (最小の dependency injection 追加)
- `tests/capture.test.js` (ハングしている reject-path テストを stub 化)

変更しないもの:

- `src/connection.js` の本番用リトライ戦略
- capture の e2e / 実 CDP 接続フロー
- 他の screenshot / file path ロジック

## 実装ステップ

- [ ] root cause を固定する
  - `tests/capture.test.js` のどのケースが長時間化しているかを確認
  - `captureScreenshot()` が本番の `getClient()` を直接呼んでいる点を確認

- [ ] `captureScreenshot()` に最小 DI を追加する
  - `getClient` 相当を上書き可能にする
  - 本番既定値は現状の `getClient` を維持する

- [ ] unit test を高速化する
  - `rejects when CDP is not connected` 系 2 ケースで、即 reject する stub を使う
  - 「エラーメッセージを返す」意図だけを残し、実接続待ちはしない

- [ ] 検証する
  - `node --test tests/capture.test.js`
  - 必要最小限の関連テストを追加実行して回帰がないことを確認する

## テスト戦略

- RED:
  - 既存 `tests/capture.test.js` が接続リトライで長時間化する現状を前提に、stub ベースの期待へ書き換える
- GREEN:
  - `src/core/capture.js` を最小修正し、reject-path unit test を即時完了させる
- REFACTOR:
  - 依存注入は capture 周辺に閉じ、広い抽象化は追加しない

## 検証コマンド

- `node --test tests/capture.test.js`
- `npm test`

## リスク・注意点

- `captureScreenshot()` のシグネチャ変更で既存呼び出しを壊さないよう、追加引数は後方互換にする必要がある
- テスト高速化のために本番ロジックを過度に分岐させないこと
- `npm test` は別件で長い/詰まる可能性があるため、少なくとも `tests/capture.test.js` 自体の完走は個別確認する

## 競合確認

- `docs/exec-plans/active/` の既存 active plan は `repo-structure-align-and-archive-rules_20260424_2015.md` と `run-night-batch_20260429_2344.md`
- capture test 修正とは直接競合しない

---

作成者: Copilot
作成日時: 2026-05-05T02:53:00+09:00
