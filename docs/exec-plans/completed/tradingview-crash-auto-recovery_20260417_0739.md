# TradingView Desktop クラッシュ自動復旧 / 再発防止 exec-plan

## 目的

TradingView Desktop が自動ワークフロー実行中にクラッシュし、`TradingView Desktop Critical Error / EPIPE: broken pipe, write` を契機に処理が停止する問題について、**原因を切り分け、既存の recovery 基盤を活かしながら、未完の orchestration と retry 制御を仕上げる**。

今回のゴールは、少なくとも以下を安全側で満たすこと。

- 障害を `process / port / MCP / CLI / environment` に切り分けて観測できる
- TradingView 異常時に **検知 → 完全終了 → 再起動 → readiness 待機 → MCP 再接続 → 処理リトライ** が実行される
- checkpoint が使えるときは resume、曖昧なときは phase 再実行へフォールバックする
- retry は上限付き・backoff 付き・ログ付きで無限ループしない
- tmux 経由運用で SSH 切断時もジョブが止まりにくい

## 現状整理

### 既に実装済み

- `src/core/tradingview-readiness.js`
  - popup dismiss
  - readiness retry
  - `cli-epipe` / `process-missing` / `cdp-unreachable` / `mcp-unhealthy` などの failure classification
- `src/core/tradingview-recovery.js`
  - crash severity 分類
  - recovery plan builder
  - exponential backoff
  - recovery executor
- `src/core/health.js`
  - `multiLayerHealthCheck()` による process / port / MCP の 3 層観測
- `src/core/launch.js`
  - `--remote-debugging-port=<port>` 付き TradingView 起動
- `scripts/backtest/ensure-tradingview-recovery.sh`
  - bash ベースのヘルス確認・kill・relaunch・readiness wait
- `scripts/tmux/run-night-batch-with-recovery.sh`
  - tmux 内で batch 本体と recovery watchdog を並走
- `python/night_batch.py`
  - preflight / step 実行に recovery hook あり
  - latest checkpoint の追跡あり
  - recoverable failure 判定後の再試行あり
- `tests/tradingview-readiness.test.js`
  - readiness / recovery helper 群のテストあり
- `tests/health.test.js`
  - multi-layer health のテストあり

### まだ弱い / 未完

- `scripts/backtest/run-finetune-bundle.mjs`
  - status preflight 失敗時や campaign 実行失敗時の **自動 recovery / retry orchestration** がない
  - resume checkpoint 再利用と phase 再実行の判断がない
- `python/night_batch.py`
  - 既存 recovery はあるが、**resume 優先 / rerun fallback / retry exhausted の判断ログ**をさらに明示したい
- shell / tmux 連携
  - watchdog が動いていても batch 側の再試行境界と整合していない箇所がある
- 回帰テスト
  - orchestration 層の RED が不足しており、長時間運用向けの振る舞いが固定し切れていない

### 現在の作業ツリーで確認したこと

- `python/night_batch.py`
  - preflight failure / runtime failure に対する recovery hook, recoverable 判定, checkpoint 更新追跡が既に入り始めている
- `tests/night-batch.test.js`
  - `EPIPE` を使った preflight retry / smoke rerun の RED/GREEN 系テストが既に追加されている
- `src/core/tradingview-recovery.js` / `src/core/health.js`
  - process / port / MCP の 3 層観測、および recovery plan / backoff helper が追加済み
- `scripts/backtest/ensure-tradingview-recovery.sh` / `scripts/tmux/run-night-batch-with-recovery.sh`
  - one-shot recovery helper と tmux watchdog の雛形が追加済み
- 一方で `scripts/backtest/run-finetune-bundle.mjs` は依然として失敗時に即終了するため、**bundle 境界の orchestration 不足が workflow 停止の主因候補**になっている

## スコープ

### 含む

- `EPIPE` の意味と根因候補の整理を、最終報告で明確に説明できる状態にする
- process / port / MCP の 3 層検知を orchestration 側で活用する
- TradingView crash 後の full recovery フローを bundle / night batch 実行境界で完結させる
- checkpoint が安全に使える場合の resume
- resume が unsafe / unavailable な場合の phase 再実行
- exponential backoff / 最大 retry / ログ強化
- bash watchdog / tmux runner の実運用しやすさ改善
- 既存テストの拡張による RED → GREEN → REFACTOR

### 含まない

- TradingView Desktop 自体の内部不具合修正
- OS の電源設定やネットワーク機器設定の自動変更
- 5時間超の soak test 自動化そのもの
- Node 常駐 daemon としての新しい監視サービス追加
- 無関係な readiness / campaign / strategy ロジックの全面改修

## 変更対象ファイル

### 主な更新対象

- `scripts/backtest/run-finetune-bundle.mjs`
- `python/night_batch.py`
- `scripts/backtest/ensure-tradingview-recovery.sh`
- `scripts/tmux/run-night-batch-with-recovery.sh`
- `src/core/tradingview-recovery.js`
- `src/core/health.js`
- `src/core/index.js`

### 主なテスト更新対象

- `tests/night-batch.test.js`
- `tests/launch.test.js`
- `tests/health.test.js`
- `tests/tradingview-readiness.test.js`
- `tests/windows-run-night-batch-self-hosted.test.js`

### 必要時のみ更新

- `docs/runbooks/recovery.md`
- `README.md`

## 既存 active plan との関係

### 近接する active plan

- `docs/exec-plans/active/night-batch-readiness-stabilization_20260416_1706.md`

### 競合判断

**直接競合ではないが、`python/night_batch.py` / `src/core/tradingview-readiness.js` / `src/core/health.js` では明確に近接している。**

### 今回の責務境界

- `night-batch-readiness-stabilization`
  - readiness 判定と popup / dialog 吸収
  - CLI bootstrap / preflight 契約の安定化
- 今回 plan
  - crash 後に workflow 全体が止まらないようにする orchestration
  - bundle / night batch 実行境界での retry, resume, rerun
  - bash / tmux の運用導線

## 実装方針

### 1. `EPIPE` は「表面症状」として扱う

`EPIPE: broken pipe, write` は、既に閉じられた pipe / socket / stdio に書こうとしていることを示す。  
従って根因は `EPIPE` そのものではなく、最終報告では以下を区別する。

1. TradingView Desktop プロセスクラッシュ
2. CDP `9222` 不応答 / 切断
3. MCP / CLI status 不健康
4. CLI の stdout / stderr 先喪失
5. SSH 切断 / ネットワーク断 / スリープなどの環境要因

### 2. 既存 recovery helper を「使う側」の実装に集中する

新しい常駐 monitor を増やすのではなく、既にある recovery helper を orchestration 側から正しく使う。

- `run-finetune-bundle.mjs`
  - preflight 失敗時に recovery 実行
  - campaign 実行失敗時に recoverable failure なら recovery + retry
  - retry ごとに backoff と分類ログを残す
- `python/night_batch.py`
  - 既存 recovery 実装のログと resume / rerun 判断を明確化

### 3. 再試行は安全側デフォルトにする

- **優先順位**
  1. 同一 phase / 同一 campaign に一致する checkpoint があるなら resume
  2. resume が unsafe / unavailable なら phase 再実行
  3. retry 上限到達なら分類付きで明示失敗
- 無限ループ防止のため、retry は最大回数を持つ
- backoff は既存 schedule (`5s → 15s → 30s → 60s`) を基準にする

### 4. tmux は「運用境界」として扱う

- SSH 切断耐性は tmux runner で確保する
- recovery watchdog は独立 pane で継続
- batch 本体が終了したら watchdog を止める / 状態が分かるようにするなど、運用上の事故を減らす

## TDD / 検証戦略

### RED

未完ギャップに限定して failing test を追加する。

- `tests/night-batch.test.js`
  - recoverable failure 時に recovery 後 retry される
  - latest checkpoint があるとき resume を優先する
  - resume 不可時に phase 再実行へフォールバックする
  - retry exhausted 時に分類付きで失敗終了する
- `tests/launch.test.js`
  - relaunch が recovery flow から呼ばれる境界
- `tests/health.test.js`
  - process / port / MCP 3 層観測と classification の接続
- 必要なら `tests/windows-run-night-batch-self-hosted.test.js`
  - tmux / watchdog / diagnostics 契約の固定

### GREEN

- 最小差分で orchestration を実装
- recovery helper と bundle / night batch を結線
- ログ・retry・resume/rerun 判断を通す

### REFACTOR

- retry / classification / log message の重複整理
- helper 化できる箇所のみ共通化
- 既存 readiness plan の責務を侵食しない範囲で整理

### カバレッジ方針

- 新規 coverage ツールは導入しない
- touched path の重要分岐をテストで固める
- 特に以下を網羅する
  - process missing
  - port unreachable
  - MCP unhealthy
  - recovery success
  - resume success
  - rerun fallback
  - retry exhausted

## 検証コマンド

### 対象テスト

```bash
node --test tests/tradingview-readiness.test.js tests/health.test.js tests/launch.test.js tests/night-batch.test.js
```

### 必要時の追加確認

```bash
node --test tests/windows-run-night-batch-self-hosted.test.js
```

### 全体回帰

```bash
npm test
```

### 実機導線確認

```bash
node src/cli/index.js status
python3 python/night_batch.py smoke-prod --config config/night_batch/bundle-foreground-reuse-config.json --dry-run
```

## リスク / 注意点

- `EPIPE` だけ潰しても根因対策にはならない
- recovery を増やしすぎると既存 readiness plan と責務衝突する
- resume の境界が曖昧だと、壊れた状態を持ち越す危険がある
- tmux watchdog が batch 完了後も生き残ると運用誤解を招く
- Windows スリープ / SSH 切断は完全再現しづらいので、ログ粒度が重要

## 実装ステップ

- [ ] `run-finetune-bundle.mjs` の現状フローを整理し、recovery を差し込む最小境界を確定する
- [ ] `tests/night-batch.test.js` / `tests/launch.test.js` / `tests/health.test.js` に orchestration の RED を追加する
- [ ] `run-finetune-bundle.mjs` に preflight failure / campaign failure 時の recovery + retry + backoff を実装する
- [ ] checkpoint が安全に使える場合の resume と、unsafe / unavailable 時の phase 再実行を実装する
- [ ] `python/night_batch.py` の recovery / resume / rerun ログを強化し、retry exhausted の終了理由を固定する
- [ ] `ensure-tradingview-recovery.sh` と `run-night-batch-with-recovery.sh` の契約を見直し、tmux 運用時の停止条件とログを整える
- [ ] 必要最小限で `src/core/tradingview-recovery.js` / `src/core/health.js` を調整し、分類と orchestration の整合を取る
- [ ] 関連テストを通し、その後 `npm test` で全体回帰を確認する
- [ ] 最終報告で、原因説明・再現仮説・設計・完成コード・運用方法をまとめる

## 完了条件

- TradingView crash 後に **検知 → 完全終了 → 再起動 (`--remote-debugging-port=9222`) → MCP 再接続 → リトライ** が自動で動く
- retry は上限付き・backoff 付き・分類ログ付き
- resume 可能なら resume、難しければ phase 再実行になる
- tmux 経由運用で SSH 切断耐性が向上する
- `tests/tradingview-readiness.test.js` `tests/health.test.js` `tests/launch.test.js` `tests/night-batch.test.js` が通る
- 必要な関連回帰を通したうえで `npm test` が通る
