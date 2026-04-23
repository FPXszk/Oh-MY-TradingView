# Breakout 6-Pack Public Strategy 修正計画

作成日時: 2026-04-23 10:22 JST

## 目的

`breakout-6pack-us40` で全件 `FAIL (unknown)` になっている原因を修正する。手動確認で判明した 2 系統の不具合、つまり Trend Follower 3 本の Pine compile failure と Finder 3 本の strategy title 不整合を直し、各戦略が少なくとも単体 smoke 相当では通る状態に戻す。

## 既存 active plan との関係

- `investigate-breakout-6pack-manual-strategy-failures_20260423_1012.md` で原因切り分けは完了
- 本計画はその調査結果を受けた修正 plan
- active plan が複数になるため、実装開始時に競合がないことを再確認する

## 変更・削除・作成するファイル

- 作成: `docs/exec-plans/active/fix-breakout-6pack-public-strategy-failures_20260423_1022.md`
- 変更: `config/backtest/public-library-sources/breakout-trend-follower-fast.pine`
- 変更: `config/backtest/public-library-sources/breakout-trend-follower-balanced.pine`
- 変更: `config/backtest/public-library-sources/breakout-trend-follower-slow.pine`
- 変更: `config/backtest/public-library-sources/breakout-finder-tight.pine`
- 変更: `config/backtest/public-library-sources/breakout-finder-balanced.pine`
- 変更: `config/backtest/public-library-sources/breakout-finder-wide.pine`
- 変更候補: `tests/backtest.test.js`
- 変更候補: `tests/preset-validation.test.js`

## スコープ

### 実施すること

- Trend Follower 3 本の `timestamp("...")` を現行 TradingView で通る形式へ修正する
- Finder 3 本の `strategy("...")` title を preset 名と整合させる
- 失敗を再現する RED テストを追加または拡張する
- 単体手動実行で 6 戦略の結果を再確認する
- 必要なら最新 workflow を再実行し、smoke での改善有無を確認する

### 実施しないこと

- 6 戦略以外の public-library source 修正
- キャンペーン構成や failure-budget の仕様変更
- 指標読取ロジックの別件改修

## 実装内容と影響範囲

- Pine source のみを最小修正し、戦略ロジック自体は変えない
- title 変更は attach verification と Strategy Tester 認識に影響する
- timestamp 修正は compile 可否に直接影響する
- テストは raw source preset の整合性確認を増やす方向で追加する

## TDD / 検証戦略

### RED

- Finder 系 raw source と preset 名の不一致を検出するテストを追加する
- Trend Follower 系 raw source の文字列 timestamp を不正として検出するテストを追加する

### GREEN

- Pine source を最小修正して新規テストを通す
- 既存 backtest 関連テストを通す

### REFACTOR

- 重複する assertion や fixture があれば整理する
- 実装修正が不要なら source 以外には手を広げない

## 検証コマンド

```bash
node --test tests/backtest.test.js tests/preset-validation.test.js
```

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset breakout-finder-tight --symbol SPY --date-from 2015-01-01 --date-to 2025-12-31
```

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset breakout-trend-follower-fast --symbol SPY --date-from 2015-01-01 --date-to 2025-12-31
```

## リスク / 注意点

- title を変えると TradingView UI 上の既存 script 名表示が変わる可能性がある
- compile が通っても tester metrics 読取で別問題が残る可能性がある
- public-library source は retired preset 参照も含むため、source 修正の影響をテストで確認する

## 実装ステップ

- [ ] RED: source 整合性テストを追加し、現状 fail を確認する
- [ ] GREEN: Trend Follower 3 本の timestamp を修正する
- [ ] GREEN: Finder 3 本の strategy title を preset 名に合わせる
- [ ] GREEN: backtest / preset-validation テストを通す
- [ ] 手動で 6 戦略を smoke 相当で再実行する
- [ ] 必要なら workflow を再実行して smoke 改善を確認する
- [ ] REVIEW: ロジック破綻や過剰変更がないか確認する

## 完了条件

- 6 本すべてで compile failure または title mismatch は解消している
- 追加したテストが通る
- 手動実行結果が修正前より前進していることを確認できる
