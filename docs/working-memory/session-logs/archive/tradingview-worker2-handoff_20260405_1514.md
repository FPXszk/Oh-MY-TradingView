# Session handoff: round8 research and TradingView worker2 stabilization

## セッションのゴール

- `stock-themes.com` を踏まえたトレンドフォロー型テーマ投資 research を継続し、round7 の強戦略近傍を round8 として再検証する
- TradingView Desktop を 2 worker 構成にできるか確認し、可能なら WSL から両方の CDP endpoint に安定到達できる状態まで持っていく

## ユーザー意図の変遷

1. session log と計画を思い出しつつ、`docs/research` を踏まえて新戦略を 10 本前後考えて試したい
2. `stock-themes.com` を参考に、テーマ投資のトレンドフォロー本線を強化したい
3. round8 完了後、backtest に時間がかかるので並列化できないか調べたい
4. worker2 の複数起動 feasibility と WSL 到達性を実機で切り分けたい
5. worker2 を安定常駐させ、複数起動が成立するところまで進めたい
6. 最後に、ここまでの会話を引き継げる log を docs に残し、未push の変更を整理したい

## round8 でやったこと

### 実装

- round7 top7 の近傍から round8 preset 12 本を設計して `config/backtest/strategy-presets.json` に追加
- `tests/backtest.test.js` と `tests/preset-validation.test.js` に round8 向け RED -> GREEN を追加
- Mag7 84 runs、alt 120 runs を実行し、以下を作成済み
  - `docs/research/theme-signal-observation-round8_2015_2025.md`
  - `docs/research/theme-strategy-shortlist-round8_2015_2025.md`
  - `docs/research/theme-backtest-results-round8_2015_2025.md`
  - `docs/research/theme-backtest-results-round8-alt_2015_2025.md`
  - `docs/references/backtests/round8-theme-mag7_20260405.json`
  - `docs/references/backtests/round8-theme-mag7_20260405.summary.json`
  - `docs/references/backtests/round8-theme-alt_20260405.json`
  - `docs/references/backtests/round8-theme-alt_20260405.summary.json`
  - `docs/working-memory/session-logs/round8-theme-trend_20260405_2219.md`

### round8 の確定結論

- **breadth 本線**: `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier`
  - alt robustness を維持し、round7 `breadth-early` 本線を再確認
- **leader quality 改善**: `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced`
  - round8 最大の改善点
- **deep-pullback-tight**
  - 十分強いが round7 base `deep-pullback` を超えなかった
- `breadth-quality-early` は `breadth-early-guarded` と executable alias
- acceleration 系は今回も補完枠から昇格しなかった

詳細は `docs/working-memory/session-logs/round8-theme-trend_20260405_2219.md` を優先参照。

## worker2 調査の時系列

### 1. feasibility

- 同一 profile で `--remote-debugging-port=9224` を足しただけでは single-instance lock に阻まれた
- 2台目には **別 profile (`--user-data-dir`) が必須** と判断

### 2. proxy debug

- `C:\TradingView\TradingView.exe --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2`
  で worker2 自体は一時的に起動
- Windows では `127.0.0.1:9224` と `172.31.144.1:9225` が短時間だけ応答
- WSL では `172.31.144.1:9225` が `Connection reset by peer` / `Empty reply from server`
- 切り分けの結果、**WSL 固有ではなく、worker2 の 9224 listener が消えたあとに 9225 portproxy だけ残ること** が主因と判明

### 3. stabilization

- GPU/renderer 側が worker2 の短命化に効いていると仮説を置き、起動条件を再探索
- 最終的に **`--in-process-gpu` が効いた**

## 成立した dual-worker recipe

### worker1

- Windows local: `127.0.0.1:9222`
- WSL access: `172.31.144.1:9223`

### worker2

- Windows local: `127.0.0.1:9224`
- WSL access: `172.31.144.1:9225`
- stable launch command:

```powershell
C:\TradingView\TradingView.exe --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu
```

### 検証結果

- 30 秒監視を 2 回連続で通過
- さらに 60 秒延長でも
  - Windows `127.0.0.1:9224/json/version`
  - Windows host `172.31.144.1:9225/json/version`
  - WSL `172.31.144.1:9225/json/version`
  - `TV_CDP_PORT=9225 node src/cli/index.js status`
  が継続成功
- 同時に `TV_CDP_PORT=9223 node src/cli/index.js status` も成功し、worker1 と worker2 の共存を確認

## 現在の環境状態

- worker1 main process:
  - `"C:\TradingView\TradingView.exe" --remote-debugging-port=9222`
- worker2 main process:
  - `"C:\TradingView\TradingView.exe" --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu`
- current portproxy:
  - `0.0.0.0:9223 -> 127.0.0.1:9222`
  - `0.0.0.0:9225 -> 127.0.0.1:9224`
- current WSL checks:
  - worker1 status success
  - worker2 status success

## 現在の repo 状態

- round8 の docs / raw artifact / tests / commit は完了済み
- dual-worker 成立の知見はまだ repo code には組み込んでいない
- `src/connection.js` は依然として **single endpoint 前提**
- この wrapup では以下を整理する
  - この handoff log を追加
  - 必要なら `docs/DOCUMENTATION_SYSTEM.md` に導線追加
  - active plan を completed へ移動
  - 未commit / 未push の docs 変更を commit / push

## 次セッションの最短再開ポイント

1. この log を読む
2. `docs/working-memory/session-logs/round8-theme-trend_20260405_2219.md` を読む
3. 判断する
   - round9 をやるか
   - round8 の上位候補を production shortlist に絞るか
   - worker2 を repo 側で使えるように multi-worker orchestration へ進むか
4. もし multi-worker 実装へ進むなら、最初の論点は以下
   - endpoint inventory をどう表現するか
   - `src/connection.js` の global single client をどう抽象化するか
   - CLI/MCP から worker をどう選ぶか

## 優先して読むべきファイル

### round8

- `docs/working-memory/session-logs/round8-theme-trend_20260405_2219.md`
- `docs/research/theme-signal-observation-round8_2015_2025.md`
- `docs/research/theme-strategy-shortlist-round8_2015_2025.md`
- `docs/research/theme-backtest-results-round8_2015_2025.md`
- `docs/research/theme-backtest-results-round8-alt_2015_2025.md`
- `docs/references/backtests/round8-theme-mag7_20260405.summary.json`
- `docs/references/backtests/round8-theme-alt_20260405.summary.json`

### worker2 / infra

- `docs/exec-plans/completed/tradingview-multi-worker-feasibility_20260405_1432.md`
- `docs/exec-plans/completed/tradingview-worker2-proxy-debug_20260405_1449.md`
- `docs/exec-plans/completed/tradingview-worker2-stabilization_20260405_1501.md`
- `src/connection.js`
- `README.md`

## リスク / 注意点

- `--in-process-gpu` は今は効いているが、長時間運用や TradingView 更新後の安定性は未確認
- worker2 profile は新規に作ったものなので、ログイン状態や chart 初期状態が worker1 とズレる可能性がある
- repo 側はまだ single endpoint 前提なので、dual-worker を programmatic に使うには別タスクで実装が必要
- round8 drop 候補は preset catalog に残っているため、pruning は次 round で明示的にやる必要がある
