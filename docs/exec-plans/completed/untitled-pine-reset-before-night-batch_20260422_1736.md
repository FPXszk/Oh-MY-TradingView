# Night Batch 開始前の無題 Pine 切替計画

作成日時: 2026-04-22 17:36 JST

## 目的

`Night Batch Self Hosted` / backtest 実行開始時に、保存済み Pine Script を編集中の状態から始めないようにする。

具体的には、workflow が Pine Script を反映する前に **`名前なしのスクリプト` へ切り替える** ことで、既存の保存済みスクリプトを上書きせず、`保存しますか？` モーダルも出さない実行動線へ戻す。

## 背景 / 現状認識

- 現在の workflow 実行中 UI では、保存済みスクリプト `Gold HFT - Hybrid MT5 Final` が Pine Editor に開かれた状態で backtest が始まっていた
- その状態で `setSource()` による source 差し替えが走るため、TradingView が「保存していない変更があります」と確認モーダルを出していた
- 既存コードには `src/core/pine.js` の `createNewPineScript()` がすでにあり、`名前なしのスクリプト` を開く機能自体は存在する
- ただし現時点では、night batch / preset backtest 実行入口からその helper が呼ばれていない

## 既存 active plan との関係

- `dispatch-selected-us40-8pack_20260422_1655.md`
- `re-dispatch-night-batch-selected-us40-8pack_20260422_1720.md`

上記は運用実行 plan であり、今回の実装修正とは近接する。今回の plan では **実装と回帰テスト** に限定し、dispatch は修正後にあらためて行う前提とする。

## 変更・確認対象ファイル

### 変更予定

- `src/core/backtest.js`
- `tests/backtest.test.js`
- 必要なら `tests/night-batch.test.js`
- 必要なら `tests/windows-run-night-batch-self-hosted.test.js`

### 確認のみ

- `src/core/pine.js`
- `scripts/backtest/run-finetune-bundle.mjs`
- `python/night_batch.py`
- `.github/workflows/night-batch-self-hosted.yml`

### 追加候補

- なしを第一候補とする

既存 helper を再利用し、ファイル追加よりも `src/core/backtest.js` 側の責務追加で収める方針。

## 実装内容と影響範囲

- `src/core/backtest.js`
  - preset backtest / NVDA backtest の source 差し替え前に `createNewPineScript()` を呼ぶ
  - これにより、保存済みスクリプトを直接編集せず、無題 script 上で source を注入する
  - restore 処理との整合を崩さないよう、既存 restore policy の意味を保持する
- `tests/backtest.test.js`
  - `createNewPineScript()` を source 差し替え前に呼ぶことを固定する regression test を追加する
  - 保存済み script の上書き起点にならない順序をテストで明示する
- 必要なら night batch 周辺テスト
  - workflow / python 側ではなく backtest 実行入口で吸収する方針なので、原則 `backtest.test.js` を主戦場にする

## 方針

1. 既存 helper `createNewPineScript()` を再利用する
2. `runNvdaMaBacktest()` と `runPresetBacktest()` の compile 前フローで、`clearChartStudies()` / `setSource()` より前に `createNewPineScript()` を挿入する
3. 既に `名前なしのスクリプト` なら no-op になる既存挙動をそのまま使う
4. モーダル回避の責務は workflow 側ではなく backtest 実行ロジック側に置く

## TDD / 検証戦略

### RED

- `tests/backtest.test.js` に、backtest 実行が source 差し替え前に `createNewPineScript()` を呼ぶ failing test を追加する
- 必要なら「保存済み script を直接編集しない」意図を回帰テストで固定する

### GREEN

- `src/core/backtest.js` の最小差分で `createNewPineScript()` 呼び出しを追加する
- RED テストを通す

### REFACTOR

- backtest 2 系統 (`runNvdaMaBacktest`, `runPresetBacktest`) の重複挿入を小さく整える
- helper 化が必要なら既存ファイル内の小関数抽出に留める

### カバレッジ方針

- 新規 coverage ツールは導入しない
- 変更箇所に対しては
  - untitled script 切替の呼び出し
  - source 差し替え前の順序
  - 既存 restore / compile フローへの非破壊性
  をテスト化し、実質的な分岐カバレッジを確保する

## 検証コマンド

```bash
node --test tests/backtest.test.js
```

必要なら:

```bash
node --test tests/night-batch.test.js tests/windows-run-night-batch-self-hosted.test.js
```

回帰確認:

```bash
npm run test:ci
```

実機確認候補:

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js capture --output untitled-reset-check.png
```

## リスク / 注意点

- `createNewPineScript()` の UI セレクタが TradingView 側 UI 変化に弱い可能性がある
- 無題 script へ切り替えることで、元の editor source を restore する意味合いが少し変わるため、restore policy との整合確認が必要
- workflow 側で既に途中 run が動いている場合、修正前の run には効かない

## 実装ステップ

- [ ] `tests/backtest.test.js` に、backtest 実行前に `createNewPineScript()` を呼ぶことを固定する failing test を追加する
- [ ] `src/core/backtest.js` に、compile 前の untitled script 切替を最小差分で追加する
- [ ] `node --test tests/backtest.test.js` を実行して RED→GREEN を確認する
- [ ] 必要なら関連テストを追加で実行し、night batch 周辺への副作用がないことを確認する
- [ ] `npm run test:ci` を実行して回帰確認する
- [ ] 実機で `保存しますか？` モーダルが出ない開始状態になっているかを確認する

## 完了条件

- backtest / night batch 開始前に `名前なしのスクリプト` へ切り替わる
- 保存済み script を直接編集しない
- `保存しますか？` モーダル起因の停止が再発しにくい構成になる
- 追加した regression test と `npm run test:ci` が通る
