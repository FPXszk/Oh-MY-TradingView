# Breakout 6-Pack 手動失敗調査計画

作成日時: 2026-04-23 10:12 JST

## 目的

`Night Batch Self Hosted` 最新成功 run で発生した `FAIL (unknown)` の原因を調査する。まずは `breakout-6pack-us40` の 6 戦略について、手動または単体実行で成功するかを確認し、Pine スクリプト側の問題か、適用・コンパイル・Strategy Tester 側の問題かを切り分ける。

## 既存 active plan との関係

- 直前の結果確認 plan は completed へ移動済み
- 現在の active plan は本計画のみ

## 変更・削除・作成するファイル

- 作成: `docs/exec-plans/active/investigate-breakout-6pack-manual-strategy-failures_20260423_1012.md`

## 確認対象ファイル・対象物

- 確認: `config/backtest/campaigns/current/breakout-6pack-us40.json`
- 確認: `config/backtest/strategy-presets.json`
- 確認: `config/backtest/public-library-sources/*.pine` または対応 source
- 確認: `src/core/backtest.js`
- 確認: `scripts/backtest/run-finetune-bundle.mjs`
- 確認: 最新 run artifact / log
- 実行確認: 6 戦略それぞれの手動 backtest / preset 実行

## スコープ

### 実施すること

- `breakout-6pack-us40` の 6 戦略 ID を確認する
- まず smoke 相当（SPY）で各戦略を単体実行して成功可否を確認する
- compile success / strategy attach / tester available / metrics read のどこで落ちるかを切り分ける
- Pine source / preset 定義に共通不備があるかを確認する
- 「Pine スクリプトがおかしいのか」を事実ベースで整理する

### 実施しないこと

- いきなり 40 銘柄 full を全部手動再現しない
- 原因未確定のまま修正実装しない
- 無関係な strategy の調査を広げない

## 実装内容と影響範囲

- まず 6 戦略 × SPY の単体確認を行う
- 主要確認点:
  - compile が通るか
  - chart に strategy が attach されるか
  - Strategy Tester が開けるか
  - metrics が読めるか
  - 6 戦略に共通の失敗か、個別失敗か

## TDD / 検証戦略

今回は調査タスクであり、修正実装は前提にしない。

### RED

- 最新 run の `FAIL (unknown)` を既知の失敗事実として扱う
- 単体実行で同様の failure を再現する

### GREEN

- 各戦略の失敗位置を説明できる状態にする

### REFACTOR

- 本計画の範囲外

## 想定コマンド

```bash
node src/cli/index.js backtest preset <preset-id> --symbol SPY --date-from 2015-01-01 --date-to 2025-12-31
```

```bash
node scripts/backtest/run-finetune-bundle.mjs --host 172.31.144.1 --ports 9223 --phases smoke --us-campaign breakout-6pack-us40
```

```bash
rg -n "\"breakout-finder-tight\"|\"breakout-trend-follower-slow\"" config/backtest
```

## リスク / 注意点

- 手動単体実行でも TradingView UI 状態の影響を受ける可能性がある
- 1 戦略でも成功した場合、bundle orchestration 側の問題の可能性が上がる
- 全戦略で同じ attach / tester failure なら Pine source そのものではなく UI 適用経路や preset 定義の問題の可能性が高い

## 実装ステップ

- [ ] 6 戦略 ID と対応 preset/source を確認する
- [ ] smoke 相当で 6 戦略を単体実行する
- [ ] 各戦略の失敗位置を compile / attach / tester / metrics に分解する
- [ ] 共通失敗か個別失敗かを整理する
- [ ] 「Pine スクリプトが原因か」を報告する

## 完了条件

- 6 戦略それぞれの単体実行結果が確認できている
- `FAIL (unknown)` の共通原因候補が説明できる
- Pine source 問題か、それ以外かを判断できる
