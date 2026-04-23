# Night Batch 接続ゲート bridge-ready 化計画

作成日時: 2026-04-23 09:36 JST

## 目的

`Wait for TradingView connection (required gate)` の成功条件を、実際に WSL から利用する接続経路に合わせて修正する。現在は `startup_check_host=127.0.0.1:9222` も必須条件に含めているため、手動では `172.31.144.1:9223` と `tv status` が成功していても workflow gate が失敗する。今回は、`9222` は診断情報として残しつつ、必須条件は bridge (`172.31.144.1:9223`) と `tv status` に揃える。

## 既存 active plan との関係

- 先ほどの「成功まで再試行」plan は completed へ移動済み
- 現在の active plan は本計画のみ

## 変更・削除・作成するファイル

- 変更: `src/core/night-batch-connection-gate.js`
- 変更: `tests/tradingview-readiness.test.js`
- 変更: `tests/windows-run-night-batch-self-hosted.test.js`（必要な場合のみ）
- 変更: `docs/exec-plans/active/fix-night-batch-gate-to-use-bridge-readiness_20260423_0936.md`

## 確認対象ファイル・対象物

- 確認: `src/core/night-batch-connection-gate.js`
- 確認: `scripts/backtest/wait-for-tradingview-readiness.mjs`
- 確認: `.github/workflows/night-batch-self-hosted.yml`
- 確認: 最新失敗 run `24809429709` と再試行 run `24810003079`
- 確認: 手動確認結果
  - Windows 側 `127.0.0.1:9222` は TradingView が listen
  - WSL 側 `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status` は success

## スコープ

### 実施すること

- 接続ゲートの success 判定を `bridgeReachable && statusReady` ベースへ変更する
- `startup_check` は診断結果として残し、summary に含める
- RED → GREEN でテストを更新する
- 修正後に workflow を再実行して gate success を確認する

### 実施しないこと

- workflow 全体の大幅改修
- `Ensure TradingView is running` のロジック変更
- portproxy や Windows OS 側設定の恒久修正

## 実装内容と影響範囲

- `src/core/night-batch-connection-gate.js`
  - success 条件を `summaryParts.length === 0` から、startup 診断を warning 扱いに分離した条件へ変更
  - `startup_check unreachable` は summary に残すが hard fail にはしない
- `tests/tradingview-readiness.test.js`
  - bridge と status が成功していれば gate success になるケースを追加
  - startup check だけ失敗しても gate success になる契約を固定
- 必要なら `tests/windows-run-night-batch-self-hosted.test.js`
  - gate step の存在・名称は維持されることを確認

## TDD / 検証戦略

### RED

- `tests/tradingview-readiness.test.js` に「startup_check failure でも bridge と status が成功なら gate success」ケースを追加して失敗させる

### GREEN

- `src/core/night-batch-connection-gate.js` を修正し、追加テストを通す

### REFACTOR

- summary / warning の表現を最小限整理する

### カバレッジ方針

- 接続ゲート契約は unit test で固定する
- workflow レベルは既存 test の回帰確認に留める

## 検証コマンド

```bash
node --test tests/tradingview-readiness.test.js tests/windows-run-night-batch-self-hosted.test.js
```

```bash
gh workflow run night-batch-self-hosted.yml -f config_path=config/night_batch/bundle-foreground-reuse-config.json
```

```bash
gh run watch <run-id>
```

## リスク / 注意点

- `startup_check` を hard fail から外すため、Windows 側ローカル 9222 が壊れていても bridge 経由で通るケースを許容する
- これは現在の実利用経路には一致するが、将来 9222 の健全性を別 step で監視したい場合は summary / warning で拾う必要がある
- backtest 本体が別理由で落ちる可能性は残る

## 実装ステップ

- [ ] 接続ゲートの RED テストを追加する
- [ ] ゲート判定を bridge と `tv status` 優先に修正する
- [ ] 関連テストを実行して GREEN を確認する
- [ ] workflow を再dispatchして gate success を確認する
- [ ] 結果を報告する

## 完了条件

- bridge と `tv status` が成功していれば gate success になる
- 追加テストが通る
- workflow で `Wait for TradingView connection (required gate)` が success になり、`Run smoke gate and foreground production` に進む
