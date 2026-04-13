# Exec Plan: consolidate-latest-backtest-results-and-push_20260413_1623

## 1) 背景 / 目的

ユーザー依頼は、**最新バックテストの成績を含む結果をドキュメント化して報告し、最後に必要な commit/push まで完了すること**。  
現時点で確認できている最新の実バックテストは GitHub Actions run `24341576697` の `smoke-prod` で、US full / JP full ともに `1000/1000` 完走。  
一方で、現在 `docs/research/latest/` は **2026-04-10 の partial report 世代** のままで、最新完了世代を指していない。

また、Git の確認時点では **未 push commit は存在しない**。そのため COMMIT/PUSH フェーズでは、今回の文書更新を commit して push する想定で進める。

## 2) 変更 / 作成 / 削除するファイル

### 作成
- `docs/exec-plans/active/consolidate-latest-backtest-results-and-push_20260413_1623.md`
- `docs/research/latest/next-long-run-finetune-complete-results_20260413_1623.md`
- `docs/research/latest/next-long-run-finetune-complete-handoff_20260413_1623.md`
- `docs/references/backtests/next-long-run-finetune-complete_20260413.summary.json`
- `docs/working-memory/session-logs/latest-backtest-results-consolidation_20260413_1623.md`

### 更新
- `docs/research/latest/README.md`

### 移動
- `docs/research/latest/next-long-run-finetune-partial-results_20260410_1503.md`
  -> `docs/research/next-long-run-finetune-partial-results_20260410_1503.md`
- `docs/research/latest/next-long-run-finetune-partial-handoff_20260410_1503.md`
  -> `docs/research/next-long-run-finetune-partial-handoff_20260410_1503.md`

### 参照のみ
- `results/gh-run-24341576697/night-batch-24341576697-1/gha_24341576697_1-summary.md`
- `results/gh-run-24341576697/night-batch-24341576697-1/gha_24341576697_1.log`
- `results/gh-run-24341576697/night-batch-24341576697-1/round-manifest.json`
- `results/campaigns/external-phase1-run8-us-jp-top6/smoke-session.log`
- `results/campaigns/external-phase1-run8-us-jp-top6/smoke/recovered-summary.json`
- `/mnt/c/actions-runner/_work/Oh-MY-TradingView/Oh-MY-TradingView/results/campaigns/next-long-run-us-finetune-100x10/full/recovered-results.json`
- `/mnt/c/actions-runner/_work/Oh-MY-TradingView/Oh-MY-TradingView/results/campaigns/next-long-run-us-finetune-100x10/full/recovered-summary.json`
- `/mnt/c/actions-runner/_work/Oh-MY-TradingView/Oh-MY-TradingView/results/campaigns/next-long-run-jp-finetune-100x10/full/recovered-results.json`
- `/mnt/c/actions-runner/_work/Oh-MY-TradingView/Oh-MY-TradingView/results/campaigns/next-long-run-jp-finetune-100x10/full/recovered-summary.json`
- `.github/workflows/night-batch-self-hosted.yml`

### 削除
- なし

## 3) 実装内容と影響範囲

### 実装内容
- 最新完了世代の backtest report を `docs/research/latest/` に作成する
- latest README の pointer を partial report から complete results 世代へ切り替える
- US / JP full 1000-run の結果から、**平均成績・上位戦略・代表的な top combo・成功件数** を抽出し、machine-readable な summary JSON を repo 内に固定する
- GitHub Actions の latest success のうち、`24353498557` が stale schedule による skip success であることを明記する
- ローカル smoke (`external-phase1-run8-us-jp-top6`) の experiment gating 結果を、別節として統合する
- session log に、証跡の対応表・run ID・外部 `/mnt/c/...` 依存の扱いを残す

### 影響範囲
- `docs/research/latest/` の最新世代参照導線
- 以後の handoff / 調査で参照する latest backtest summary
- 直近 run の成功可否だけでなく、成績比較まで repo 内 docs で追えるようになる
- コード本体や runner workflow は変更しない

## 4) スコープ

### In Scope
- run `24341576697` の最新完了結果を latest 世代へ昇格
- US full / JP full の成績要約作成
- stale schedule run `24353498557` の位置づけ整理
- local smoke (`external-phase1-run8-us-jp-top6`) の gating 結果統合
- latest README 更新
- partial latest docs の世代入れ替え
- session log と summary JSON の追加
- このタスク由来の commit / push

### Out of Scope
- backtest の再実行・再開
- workflow / runner script / command.md の修正
- 生の `recovered-results.json` 全量を repo に取り込むこと
- unrelated な `results/` 差分の commit
- 既存 active plan が扱う self-hosted runner 運用メモの再編

## 5) active plan との重複確認

確認した active plan:
- `docs/exec-plans/active/investigate-night-batch-self-hosted-queued_20260410_2307.md`
- `docs/exec-plans/active/document-self-hosted-runner-foreground-autostart_20260412_0006.md`
- `docs/exec-plans/active/rerun-night-batch-after-run-cmd_20260410_1714.md`
- `docs/exec-plans/active/run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md`

今回の plan は **結果報告 docs / latest 世代更新 / commit-push** が主目的であり、runner 運用や workflow 実行手順の変更には踏み込まない。  
そのため直接衝突は低いが、night-batch 実行結果を題材にするため、`command.md` や runner 手順書には触れない方針で進める。

## 6) TDD / Test Strategy

### RED
- 現状の `docs/research/latest/README.md` と latest 2 文書が、**partial report 世代** を指しており、最新完了 run `24341576697` の結果・成績を表していないことを確認する
- repo 内に latest full-run の成績要約 JSON が存在しない状態を失敗条件とみなす

### GREEN
- latest results / handoff doc を追加し、US / JP full と local smoke を 1 世代で読めるようにする
- `docs/references/backtests/next-long-run-finetune-complete_20260413.summary.json` に、docs が参照する集計済み成績を固定する
- `docs/research/latest/README.md` を新世代へ更新し、旧 partial docs を `docs/research/` へ退避する

### REFACTOR
- 文書間の重複説明を減らし、README は入口、results doc は数値、handoff は判断材料、session log は証跡対応に責務分離する
- summary JSON は docs で使う指標に絞り、生データ全量 commit を避ける

## 7) 実装ステップ

- [ ] latest report の正本証跡を固定する（run `24341576697`, run `24353498557`, local smoke）
- [ ] `/mnt/c/.../recovered-results.json` から US / JP full の集計項目を決める
- [ ] `docs/references/backtests/next-long-run-finetune-complete_20260413.summary.json` を作成する
- [ ] latest results doc の章立てを作る
  - 実行概要
  - run status / stale schedule の扱い
  - US full 成績
  - JP full 成績
  - local smoke gating 成績
  - 総括
- [ ] `docs/research/latest/next-long-run-finetune-complete-results_20260413_1623.md` を作成する
- [ ] `docs/research/latest/next-long-run-finetune-complete-handoff_20260413_1623.md` を作成する
- [ ] `docs/working-memory/session-logs/latest-backtest-results-consolidation_20260413_1623.md` を作成する
- [ ] `docs/research/latest/README.md` を新世代向けに更新する
- [ ] existing latest partial docs 2 件を `docs/research/` へ移動する
- [ ] 差分を見直し、docs / reference summary だけに閉じていることを確認する
- [ ] plan を `docs/exec-plans/completed/` へ移して commit / push する

## 8) Validation Commands

```bash
git --no-pager diff -- docs/research/latest docs/research docs/references/backtests docs/working-memory/session-logs docs/exec-plans
git --no-pager diff --check
rg -n "24341576697|24353498557|1000/1000|Promoted 37|Hold 10|Rejected 13|stale" docs/research docs/working-memory/session-logs docs/references/backtests
jq empty docs/references/backtests/next-long-run-finetune-complete_20260413.summary.json
```

docs-only / data-summary 変更のため、コードや workflow に変更が入らない限り既存テストの追加は不要。  
必要な検証は、**数値整合・参照整合・JSON 妥当性・diff 崩れなし** を中心に行う。

## 9) Risks / 注意点

- latest full-run の成績正本は `/mnt/c/actions-runner/...` 側にあり、repo から直接追えないため、必要な指標は summary JSON と文書に十分スナップショット化する必要がある
- `recovered-results.json` 全量は約 1.2 MB × 2 本あり、丸ごと commit すると docs/report 目的に対して重い
- latest success と latest executed run を混同すると誤解を生むため、`24353498557` は skip success と明記する必要がある
- 現在 worktree には `results/night-batch/detached-production-state.json` と `results/...` の未追跡差分があるため、今回の commit に unrelated artifact を混ぜないよう注意する
- 現時点で未 push commit はないため、「末コミットのものを push」は今回作る commit を push する解釈で進める

## 10) 補足

- latest docs の世代交代は、現行ルールどおり `docs/research/latest/README.md` を入口にし、旧世代を `docs/research/` 側へ退避する
- もし集計過程で軽い抽出 script が必要になった場合は、先に RED を定義できる範囲で既存 test に従う。ただし現時点の第一案は **jq / 既存 artifact のみで docs 化する docs-only 実装**
