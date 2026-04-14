# Session log: latest-backtest-results-consolidation_20260413_1623

## 目的

最新バックテストの完了結果を repo 内 docs に固定し、latest 世代を partial report から complete results へ更新する。

## 確認した証跡

1. GitHub Actions run `24341576697`
   - 実行済み最新 run
   - `smoke-prod`
   - US full / JP full とも `1000/1000` success
2. GitHub Actions run `24353498557`
   - latest success ではあるが stale schedule のため skip
3. local smoke `external-phase1-run8-us-jp-top6`
   - `60/60` success
   - gating `promote 37 / hold 10 / reject 13`

## データ固定化の方針

- latest full-run の raw metrics 正本は `/mnt/c/actions-runner/.../recovered-results.json`
- repo には raw 全量ではなく `docs/references/backtests/next-long-run-finetune-complete_20260413.summary.json` を追加
- latest docs はこの summary JSON を参照して書く

## 実装方針メモ

- `docs/research/latest/README.md` を新世代に更新
- partial latest docs は `docs/research/` へ退避
- new latest docs は results と handoff の 2 枚構成
- runner / workflow / docs/command.md には触れない

## push スコープ

- plan 作成時点で pre-existing な unpushed commit はなかった
- commit 対象は今回の docs / summary JSON / exec-plan 移動に限定する
- `docs/research/results/` 配下の unrelated artifact は commit しない

