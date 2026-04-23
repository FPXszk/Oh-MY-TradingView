# 最新 Night Batch 結果確認計画

作成日時: 2026-04-23 09:57 JST

## 目的

最新成功 run `24810235998` の結果を確認し、実行時間が短い理由と、「6戦略 × 40銘柄」が本当に実行されたかを事実ベースで確認する。今回は結果確認と原因整理までを対象とし、修正実装は含めない。

## 既存 active plan との関係

- 現在の active plan は本計画のみ
- 直前の接続ゲート修正は完了済みで、今回の対象はその成功 run の結果確認

## 変更・削除・作成するファイル

- 作成: `docs/exec-plans/active/review-latest-night-batch-result-scope_20260423_0957.md`

## 確認対象ファイル・対象物

- 確認: GitHub Actions run `24810235998`
- 確認: run summary / artifact
- 確認: `config/night_batch/bundle-foreground-reuse-config.json`
- 確認: bundle 対象 campaign の strategy / symbol 定義
- 必要に応じて確認: `python/night_batch.py`, `scripts/backtest/run-finetune-bundle.mjs`

## スコープ

### 実施すること

- 最新成功 run の summary と artifact を確認する
- 実際に走った campaign / phase / strategy 数 / symbol 数を確認する
- 7分前後という実行時間が短い理由を、設定と結果から説明する
- 「6戦略 × 40銘柄」になっているか、なっていないなら何が実際の実行単位かを整理する

### 実施しないこと

- workflow / code / config の変更
- 別 run の深掘り
- 追加 dispatch

## 実装内容と影響範囲

- run `24810235998` の artifact / summary を読む
- `bundle-foreground-reuse-config.json` と campaign 定義を照合する
- 主要確認点:
  - 実行された US campaign
  - strategy 数
  - symbol 数
  - smoke / full の phase
  - skipped / cached / resumed の有無

## TDD / 検証戦略

今回は結果確認タスクであり、修正実装は前提にしない。

### RED

- 実行時間 7分5秒が「短すぎるかもしれない」という疑義を調査対象とする

### GREEN

- summary と config を照合して、実際の実行スコープを説明できる状態にする

### REFACTOR

- 本計画の範囲外

## 想定コマンド

```bash
gh run view 24810235998
```

```bash
gh run download 24810235998 -D /tmp/night-batch-24810235998
```

```bash
find /tmp/night-batch-24810235998 -type f
```

```bash
cat config/night_batch/bundle-foreground-reuse-config.json
```

## リスク / 注意点

- artifact 取得にラグがある可能性がある
- 実行時間は runner 状態や resume 状態の影響も受ける
- campaign 定義上の「6戦略 × 40銘柄」と、実際の smoke/full の実行単位が一致しない可能性がある

## 実装ステップ

- [ ] run `24810235998` の summary を確認する
- [ ] artifact を取得して summary/json を確認する
- [ ] config と campaign 定義を確認する
- [ ] 実行された strategy 数 / symbol 数 / phase を整理する
- [ ] 実行時間が短い理由を報告する

## 完了条件

- 最新 run で実際に何が実行されたか説明できる
- 「6戦略 × 40銘柄」かどうかを明確に回答できる
- 実行時間が短く見える理由を説明できる
