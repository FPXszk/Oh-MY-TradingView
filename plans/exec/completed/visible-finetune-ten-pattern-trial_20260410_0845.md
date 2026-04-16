# Exec Plan: visible-finetune-ten-pattern-trial_20260410_0845

## 目的

既存の fine-tune bundle から **先頭 10 パターン**を、**コード変更なしの運用検証**として実行し、ユーザーが **目視で TradingView Desktop の動作を確認**できる状態を作る。  
前提は修正済みの現行運用に固定する: **Windows ローカル TradingView は `9222`、WSL からの接続先は `172.31.144.1:9223`**。

> この計画は **runtime verification first** の計画であり、コード変更計画ではない。  
> 実行中にコード不具合が見つかった場合は、この計画内で修正せず、**別の exec-plan に分離**する。

## 事前確認

- `docs/exec-plans/active/` は現時点で競合中の active plan なし
- 既存コマンド / 既存スクリプトのみを使用する
- source 配下の編集は想定しない
- artifact は `docs/research/results/` 配下に限定して残してよい

## 対象ファイル

### 作成

- `docs/exec-plans/active/visible-finetune-ten-pattern-trial_20260410_0845.md`
- `docs/research/results/runtime-verification/visible-finetune-ten-pattern-trial_20260410_0845/run.log`
- `docs/research/results/runtime-verification/visible-finetune-ten-pattern-trial_20260410_0845/summary.md`

### 変更

- なし（source edit は行わない）
- 実行結果として既存 `docs/research/results/` 配下に追加出力が出る可能性あり
- `/home/fpxszk/.copilot/session-state/4f84407c-148b-41f6-9407-bf4fea3dc382/plan.md`

### 削除

- なし

## スコープ

### In Scope

- 修正済み前提の明示: **Windows `9222` / WSL `9223` (`172.31.144.1:9223`)**
- 既存 fine-tune bundle のうち、`next-long-run-us-finetune-100x10.json` の `preset_ids` 先頭 10 件を対象にする
- 既存 CLI コマンド `node src/cli/index.js backtest preset ...` を使って、可視の TradingView が実際に動くことを確認する
- 実行ログと簡易サマリを `docs/research/results/` に残す
- 実行前 preflight と実行後の結果確認を行う

### 対象 10 パターン

1. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback`
2. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier`
3. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
4. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
5. `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow`
6. `donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early`
7. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow`
8. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
9. `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`
10. `donchian-55-18-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-exit-tight`

## Out of Scope

- `src/`, `scripts/`, `tests/`, `config/` の編集
- bundle 全件実行、`smoke -> full` の長時間実行
- dual-worker 化、`9224` / `9225` 利用、並列化の再設計
- Python orchestration への切替
- 不具合修正そのもの
- テスト追加・リファクタ・カバレッジ改善

## 実行方針

- まず **WSL から `172.31.144.1:9223` が見えていること**を確認する
- 次に CLI の `status` で TradingView 接続を確認する
- その後、**同一シンボル（既定は `NVDA`）** に対して先頭 10 preset を順番に流し、画面の遷移・チャート反応・ストラテジー適用の可視挙動を確認する
- 1 回ごとの stdout / stderr を `run.log` に追記する
- 異常を見つけた場合は現象を記録し、**修正は別 exec-plan** に分離する

## Validation commands

```bash
# 1. WSL -> Windows CDP preflight
curl -sS http://172.31.144.1:9223/json/version
curl -sS http://172.31.144.1:9223/json/list

# 2. CLI status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status

# 3. 対象 preset の存在確認（bundle 定義の目視確認）
node scripts/backtest/run-finetune-bundle.mjs --dry-run --host 172.31.144.1 --ports 9223

# 4. artifact 置き場
mkdir -p docs/research/results/runtime-verification/visible-finetune-ten-pattern-trial_20260410_0845
```

```bash
# 5. visible runtime verification（既存 CLI のみ使用）
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset donchian-55-18-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-exit-tight --symbol NVDA
```

```bash
# 6. 実行後確認
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
test -s docs/research/results/runtime-verification/visible-finetune-ten-pattern-trial_20260410_0845/run.log
```

## 完了条件

- `172.31.144.1:9223` への preflight が成功する
- `node src/cli/index.js status` が成功する
- 先頭 10 preset を順次実行できる
- ユーザーが visible app の操作遷移を観測できる
- `docs/research/results/runtime-verification/visible-finetune-ten-pattern-trial_20260410_0845/` にログ / サマリが残る
- 問題があれば「現象」「再現コマンド」「切り分け要否」をまとめる
- **コード issue は別 plan に分離**される

## リスク

- Windows 側 `9222` は生きていても、WSL 側 `9223` portproxy / firewall 経路が死んでいる可能性
- visible セッションの UI 状態により `panel_not_visible` / `no_strategy_applied` / `metrics_unreadable` が出る可能性
- 長い preset 名の手入力ミスで誤実行する可能性
- チャート状態やシンボル状態次第で一部 preset が安定再現しない可能性
- 実行中にコード不具合らしき兆候が出ても、その場で修正を始めると本計画の目的がぶれる

## 実行ステップ

- [ ] `docs/exec-plans/active/visible-finetune-ten-pattern-trial_20260410_0845.md` を作成する
- [ ] 修正済み前提を明示する: **Windows `9222` / WSL `172.31.144.1:9223`**
- [ ] `curl` で `9223` preflight を確認する
- [ ] `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status` を実行する
- [ ] `node scripts/backtest/run-finetune-bundle.mjs --dry-run --host 172.31.144.1 --ports 9223` で bundle 定義を再確認する
- [ ] `docs/research/results/runtime-verification/visible-finetune-ten-pattern-trial_20260410_0845/` を作成する
- [ ] 対象 10 preset を `NVDA` 固定で順次実行する
- [ ] 各実行の stdout / stderr と観測メモを `run.log` / `summary.md` に残す
- [ ] visible app が実際に遷移・反応したかを記録する
- [ ] 実行後に再度 `status` を確認する
- [ ] 失敗があれば現象を切り分け、**コード issue は別 exec-plan を起票**する
- [ ] source edit をしていないことを確認して完了とする
