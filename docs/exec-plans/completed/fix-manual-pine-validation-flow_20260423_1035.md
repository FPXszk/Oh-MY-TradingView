# 手動 Pine 動作確認フロー修正計画

作成日時: 2026-04-23 10:35 JST

## 目的

前回途中で中断した「手動で Pine Script が TradingView 上で動くか確認する作業」を再開し、残っている修正を完了する。直近で raw source 6 本の静的修正は完了しているため、本計画では手動確認フロー自体と、その実行時に残る不具合を最小範囲で潰す。

## 既存 active plan との関係

- `docs/exec-plans/active/` は現在空であり、競合する in-flight plan はない
- `docs/exec-plans/completed/investigate-breakout-6pack-manual-strategy-failures_20260423_1012.md` の調査結果を前提にする
- `docs/exec-plans/completed/fix-breakout-6pack-public-strategy-failures_20260423_1022.md` で実施した raw source 修正の続きとして扱う

## 変更・削除・作成するファイル

- 作成: `docs/exec-plans/active/fix-manual-pine-validation-flow_20260423_1035.md`
- 変更候補: `src/core/pine.js`
- 変更候補: `src/core/backtest.js`
- 変更候補: `src/cli/commands/pine.js`
- 変更候補: `tests/e2e.pine-loop.test.js`
- 変更候補: `tests/backtest.test.js`

## スコープ

### 実施すること

- 直近の手動確認対象だった Pine 操作フローを再現し、どの段階で落ちるかを確定する
- `pine set` / `pine compile` / backtest preset 実行のいずれに不具合が残っているか切り分ける
- 再現できた不具合に対して、最小限のコード修正を入れる
- 失敗を先に固定するテストを追加または拡張する
- 修正後に手動確認を再実行し、Pine Script が少なくとも対象ケースで通ることを確認する

### 実施しないこと

- breakout 6-pack 以外の戦略群への横展開修正
- TradingView 起動方式や night batch 起動基盤の別件改修
- 未再現の仮説ベース修正

## 実装内容と影響範囲

- Pine editor のオープン、source 注入、compile、strategy attach、tester 読み取りのどこかに残る不具合を対象にする
- 修正が CLI 層で済むなら `src/cli/commands/pine.js` に限定する
- UI 操作や検知ロジックの問題であれば `src/core/pine.js` または `src/core/backtest.js` を最小修正する
- テストは既存の `backtest` / `e2e.pine-loop` に寄せて追加し、回帰防止を入れる

## TDD / 検証戦略

### RED

- 残存している手動確認フローの失敗を再現する
- 再現点をカバーするテストを追加または既存テストを拡張し、まず失敗を確認する

### GREEN

- 原因箇所のみ最小修正して、新規テストと既存関連テストを通す
- 手動の Pine compile / backtest 実行を再確認する

### REFACTOR

- 重複した判定やメッセージ整形があれば小さく整理する
- 振る舞いを変えない範囲で保守性を上げる

## 想定コマンド

```bash
node --test tests/backtest.test.js tests/e2e.pine-loop.test.js
```

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js pine compile
```

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset breakout-finder-tight --symbol SPY --date-from 2015-01-01 --date-to 2025-12-31
```

## リスク / 注意点

- TradingView Desktop のその時点の UI 状態に依存し、純粋なコード不具合と混ざる可能性がある
- E2E 系テストは CDP 接続前提なので、環境依存で skip または不安定化する可能性がある
- `src/core/pine.js` と `src/core/backtest.js` は UI 依存が強く、副作用を広げないよう最小修正が必要

## 実装ステップ

- [ ] 手動確認フローを再現し、失敗箇所を `set` / `compile` / `attach` / `tester` に分解する
- [ ] RED: 再現した不具合を固定するテストを追加または拡張する
- [ ] GREEN: 原因箇所を最小修正する
- [ ] GREEN: 関連テストを実行して通す
- [ ] 手動で対象 Pine Script / preset を再確認する
- [ ] REVIEW: ロジック破綻、過剰変更、不要な複雑化がないか確認する

## 完了条件

- 残っていた手動 Pine 動作確認フローの失敗原因が説明できる
- 追加または拡張したテストが通る
- 対象ケースで手動 compile または backtest が成功する
