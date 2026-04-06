# Exec Plan: dual-worker distinct strategy backtest trial

## Problem

- dual-worker 自体は安定復旧済みで、WSL から
  - worker1: `172.31.144.1:9223`
  - worker2: `172.31.144.1:9225`
  を個別指定できる
- ただし repo の公開 CLI / MCP はまだ **`nvda-ma` 固定**
- `src/core/research-backtest.js` と `config/backtest/strategy-presets.json` は research preset 実行の土台を持つが、repo から呼ぶ最小の CLI 導線がない
- したがって現時点の blocker は worker 切替ではなく、**別戦略を指定して backtest を走らせる最小経路の不在**

## Approach

worker 切替は今の `TV_CDP_HOST` / `TV_CDP_PORT` env override をそのまま使い、repo には **preset-driven の CLI 入口だけ** を最小追加する。

基本方針:

1. `runNvdaMaBacktest()` の固定 orchestration を、strategy source / title / symbol を受け取れる薄い generic runner に抽出する
2. `strategy-presets.json` から preset を読み、既存 validator で検証し、`buildResearchStrategySource()` で Pine source を組み立てる
3. CLI に `backtest preset <preset-id> --symbol <symbol>` を追加する
4. worker1 / worker2 を別々の `TV_CDP_PORT` で呼び出して、異なる 2 戦略を試走する

初回の候補 pair は差分が見やすい以下を想定する。

- worker1: `ema-cross-9-21`
- worker2: `rsi-mean-reversion`

## Outcome

- `tv backtest preset <preset-id> --symbol <symbol>` を追加し、repo CLI から preset-driven backtest を実行可能にした
- `loadPreset()` は repo CLI generator で build 不可な preset を事前に拒否するようにした
- study-limit recovery は preset 実行時も正しい strategy title を使うよう修正した
- 実測:
  - worker1 (`9223`) + `ema-cross-9-21` は成功
  - worker2 (`9225`) + `rsi-mean-reversion` は compile success だが TradingView 側で strategy attach 未確認
- `worker2` は `nvda-ma` でも同じ attach failure を再現したため、repo 実装ではなく TradingView UI state 側の問題として扱う

## Files to read

- `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md`
- `src/cli/commands/backtest.js`
- `src/core/backtest.js`
- `src/core/research-backtest.js`
- `src/core/preset-validation.js`
- `config/backtest/strategy-presets.json`
- `tests/backtest.test.js`
- `package.json`

## Files to change

- `src/cli/commands/backtest.js`
- `src/core/backtest.js`
- `src/core/index.js`
- `tests/backtest.test.js`

## Optional changes only if needed

- `README.md`
- `src/server.js`
- `src/tools/backtest.js`

MCP まで広げると scope が増えるため、初回は CLI 限定で進める。

## In scope

- fixed `nvda-ma` 導線の横に、preset-driven CLI 入口を最小追加
- repo 内の preset / builder / validator を使って別戦略 backtest を実行可能にする
- worker1 と worker2 で別 preset を個別実行
- 可能なら 2 プロセス同時実行も試す
- 既存 `backtest nvda-ma` を壊さない

## Out of scope

- multi-worker scheduler / queue
- session artifact runner の完全復元
- preset 一括 batch runner の repo 追加
- 3 worker 以上への一般化
- 無関係な README / docs 全面整理

## Test strategy

### RED

- `tests/backtest.test.js` に generic runner / preset execution path の失敗テストを追加
- `nvda-ma` 既存経路が維持される回帰も確認する

### GREEN

- generic runner を最小抽出
- preset loader + validator + Pine source builder を接続
- `backtest preset <preset-id>` を通す

### REFACTOR

- `runNvdaMaBacktest()` を薄い wrapper に整理
- fixed path と preset-driven path の責務境界を明確化

## Validation commands

```bash
npm test
npm run test:e2e
npm run test:all
```

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

想定する個別試走:

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA
```

想定する同時試走:

```bash
(
  TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA
) &
(
  TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA
) &
wait
```

既存回帰:

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest nvda-ma
```

## Risks

- `src/core/backtest.js` の cleanup / restore を壊すと既存安定経路に影響する
- preset により compile / apply の安定度が異なる
- 2 worker が分離されていても、TradingView 側の UI 状態差で結果再現性が揺れる
- active plan が複数並ぶため、完了時に適切な plan 移動整理が必要

## Steps

- [x] active plan を保存し、このタスクの実行境界を固定する
- [x] `src/core/backtest.js` の generic runner 化ポイントを特定する
- [x] preset 読み込み + validation + source build の最小接続を決める
- [x] `tests/backtest.test.js` に RED を追加する
- [x] generic runner と preset CLI を実装する
- [x] `backtest nvda-ma` の回帰を確認する
- [x] `npm test` / `npm run test:e2e` / `npm run test:all` のうち `npm test` を実行し、preset path の追加テストを通した
- [x] worker1 / worker2 で別戦略を個別実行した
- [x] 可能なら 2 プロセス同時実行を試すか判断する（worker2 attach failure が残るため今回は見送り）
- [x] 必要時のみ docs を最小更新する
- [x] 完了後に plan を `completed/` へ移動する
