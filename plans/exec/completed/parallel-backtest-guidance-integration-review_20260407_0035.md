# 実行計画: 並列バックテスト運用方針の統合レビューと durable docs 更新 (20260407_0035)

- ステータス: COMPLETED
- 種別: docs review / docs integration / unstaged changes review

## Problem

直前セッションでは、parallel backtest の運用方針に関わる未ステージ変更が複数残っている。

- `docs/research/small-parallel-benchmark-analysis_20260406_2306.md`
  - `20 run` では shard parallel が strategy-aware より速かった
  - ただし当時は sample size が小さく、長時間 workload の第一候補はまだ `strategy-aware + runtime-aware` を維持していた
- `docs/research/mid-parallel-benchmark-analysis_20260406_2330.md`
  - `32 run` でも shard parallel が最速
  - `strategy-aware + micro-shard checkpoint` は pure strategy-aware を改善しなかった
  - `metrics_unreadable` 1回で rollback + partial retry する current 実装は sequential より遅かった
- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
  - 長時間 workload guidance はまだ「`strategy-aware + runtime-aware` もしくは `30〜40 run shard`」という並列記述が残っている
  - さらに mid-sample update の未ステージ追記が入っている
- `docs/command.md`
  - 7c に同様の未ステージ追記が入っている

このため、**調査結果そのものは概ね揃っているのに、durable docs 上の最終結論と運用順位がまだ完全には統合されていない**。

## Approach

今回の作業は docs-only かつ review 中心タスクとして扱い、**まず未ステージ変更の妥当性をレビューし、そのうえで durable docs のソースオブトゥルースを整理して、最終運用方針を一貫した形に統合する**。

進め方:

1. session log / active plan / research docs を読み、直前セッションの到達点を短く整理する
2. 未ステージ変更をレビューし、方向性は正しいか、曖昧さや矛盾がないか確認する
3. small sample / mid sample / round8 follow-up を「証拠」と「運用結論」に分離して整理する
4. runbook を正式な運用方針のソースオブトゥルースにし、`docs/command.md` を quick reference に揃える
5. checkpoint / partial retry の位置づけを明文化し、今後の標準運用と非推奨事項を固定する

## Relationship to existing active plans / non-conflict

- `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md`
  - proxy / reachability の別テーマであり、今回の docs 統合作業とは非競合
- `docs/exec-plans/completed/mid-parallel-benchmark-hybrid-partial-retry_20260406_2330.md`
  - 今回レビュー対象となる直前実験 plan であり、本 plan はその実験結果を durable guidance に統合する後続 plan
- 本 plan は新規 active plan として追加し、既存 active plan は上書きしない

## Source of truth

### 運用上の durable source of truth

- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
  - 長時間 parallel backtest の正式な運用方針・前提条件・非推奨事項の主記録

### 実務クイックリファレンス

- `docs/command.md`
  - runbook の短縮版 / オペレーション向け要約

### 証拠と背景

- `docs/research/small-parallel-benchmark-analysis_20260406_2306.md`
- `docs/research/mid-parallel-benchmark-analysis_20260406_2330.md`
- round8 follow-up を説明している既存 docs

### 生ログ / 補助証跡

- `docs/working-memory/session-logs/...`
- `docs/references/backtests/...json`

## Files to review / modify / create

### 参照

- `docs/command.md`
- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `docs/research/small-parallel-benchmark-analysis_20260406_2306.md`
- `docs/research/mid-parallel-benchmark-analysis_20260406_2330.md`
- `docs/exec-plans/completed/mid-parallel-benchmark-hybrid-partial-retry_20260406_2330.md`
- `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md`

### レビュー対象の未ステージ変更

- modified: `docs/command.md`
- modified: `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- untracked: `docs/exec-plans/completed/mid-parallel-benchmark-hybrid-partial-retry_20260406_2330.md`
- untracked: `docs/references/backtests/mid-parallel-benchmark-comparison_20260406_2330.json`
- untracked: `docs/research/mid-parallel-benchmark-analysis_20260406_2330.md`
- untracked: `docs/working-memory/session-logs/mid-parallel-benchmark-hybrid-partial-retry_20260406_2330.md`

### 新規作成

- `docs/exec-plans/active/parallel-backtest-guidance-integration-review_20260407_0035.md`

### 条件付き更新

- `docs/command.md`
- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- 必要時のみ `docs/research/mid-parallel-benchmark-analysis_20260406_2330.md`

## Scope

- 直前セッションの文脈復元
- 未ステージ変更のレビュー
- small sample / mid sample / round8 follow-up の関係整理
- parallel backtest の最終運用方針の明文化
- `docs/command.md` と runbook の一貫性修正

## Out of scope

- 新しい benchmark の追加実行
- backtest ロジック・scheduler・retry 実装の変更
- checkpoint / partial retry のアルゴリズム改善
- dual-worker topology の再設計
- reachability / proxy 問題の再調査

## Review perspectives

1. 結論の一貫性
2. long-running guidance の順位づけの明確さ
3. checkpoint と partial retry の切り分け
4. runbook と `docs/command.md` の責務分離
5. 一時的観測が durable docs に混ざり過ぎていないか
6. 今後の運用で迷いなく参照できる構造になっているか

## Docs-only task としての RED -> GREEN -> REFACTOR

### RED

- 未ステージ docs を読み、運用方針の揺れ・曖昧な文言・責務の混線を明示する

### GREEN

- runbook と `docs/command.md` を最小修正し、最終順位・checkpoint の位置づけ・partial retry の非推奨条件を一貫して読める状態にする

### REFACTOR

- runbook = 正式運用方針
- `docs/command.md` = quick reference
- research / session log / JSON = 根拠

の責務を明確化する

## Validation commands

```bash
git --no-pager status --short
git --no-pager diff -- docs/command.md docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md
git --no-pager diff -- docs/research/mid-parallel-benchmark-analysis_20260406_2330.md
npm test
```

必要時のみ:

```bash
curl -sS http://172.31.144.1:9223/json/version
curl -sS http://172.31.144.1:9225/json/version
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

## Risks

- round8 follow-up の文脈を削りすぎると経緯が見えなくなる
- 経緯を残しすぎると durable guidance が曖昧になる
- checkpoint の有用性と partial retry の失敗を混同すると改善余地まで否定したように読める
- `docs/command.md` が runbook の詳細を重複しすぎる可能性がある

## Steps

- [ ] 直前セッションの session log / active plan / research docs から到達点を整理する
- [ ] 既存 active plan との非競合を再確認し、本 plan の対象が docs review / integration であることを固定する
- [ ] 未ステージ変更一覧をもとに、各ファイルの役割とレビュー観点を整理する
- [ ] small sample / mid sample / round8 follow-up の関係を整理し、最終運用方針の叩き台を作る
- [ ] `docs/command.md` の差分をレビューし、最終順位・partial retry 記述の曖昧さを確認する
- [ ] runbook の差分をレビューし、durable guidance として不足または過剰な記述を確認する
- [ ] runbook を必要最小限で修正し、正式な運用方針のソースオブトゥルースにする
- [ ] `docs/command.md` を必要最小限で修正し、runbook と矛盾しない quick reference に揃える
- [ ] 必要なら research doc の結論表現を微修正する
- [ ] `git diff` で未ステージ変更全体を再レビューする
- [ ] `npm test` を実行して既存整合性を確認する

## Completion criteria

- 未ステージ変更のレビュー結果が反映されている
- long-running workload guidance の第一候補・第二候補・非推奨が runbook 上で明確
- `docs/command.md` が runbook と矛盾しない
- checkpoint と partial retry の位置づけが誤読されない
- 今後の運用で **runbook を主、`docs/command.md` を従** として参照できる状態になっている
