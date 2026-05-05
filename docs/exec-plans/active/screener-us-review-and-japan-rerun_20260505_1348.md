# Exec-plan: screener-us-review-and-japan-rerun_20260505_1348

## 概要

目的: 直近の **US `Daily Fundamental Screener` run `25358101207`** の結果を確認して、期待した Phase1/Phase2/Phase3 動作になっているかを要約する。続けて **Japan workflow (`daily-screener-japan.yml`) を新規 dispatch** し、その結果も同様に確認して、チャットで「具体的に何が取れたか」を報告する。

現時点で確認済み:

- US run `25358101207` は `completed/success`
- job `74351482057` は self-hosted Windows runner `omtv-win-01` で実行され、publish step まで成功
- Japan workflow `Daily Fundamental Screener Japan` は過去 run `25334262585` が `completed/success`
- 今回は **既存 Japan run を読むだけではなく、新しく Japan workflow を動かして結果確認する** ことが要求範囲

## 変更ファイル

- `docs/exec-plans/active/screener-us-review-and-japan-rerun_20260505_1348.md`（この計画のみ）

コード変更は行わない。

## 影響範囲

- GitHub Actions run `25358101207`（US result review）
- GitHub Actions workflow `.github/workflows/daily-screener-japan.yml`（new dispatch）
- publish 済み report:
  - `docs/reports/screener/daily-ranking.md`
  - `docs/reports/screener/daily-ranking-run.json`
  - `docs/reports/screener/daily-ranking-jp.md`
  - `docs/reports/screener/daily-ranking-jp-run.json`

## 範囲外

- screener ロジックの再修正
- workflow YAML の編集
- report の手動改変
- 失敗した場合の追加実装修正

## 実施ステップ

- [ ] US run の成果物と publish 結果を確認する
  - run/job status
  - report / metadata / artifact の有無
  - report 本文から Phase1 セクターランキング、採用セクター、銘柄ランキングを読む

- [ ] US 側が期待動作かを判定する
  - Phase1 セクターランキングが出ているか
  - Phase2 通過銘柄のランキング/内訳が出ているか
  - publish step まで成功して main へ反映されているか

- [ ] Japan workflow を dispatch する
  - `Daily Fundamental Screener Japan`
  - main branch
  - run id を取得して監視する

- [ ] Japan run の成果物と publish 結果を確認する
  - run/job status
  - report / metadata / artifact の有無
  - report 本文から Phase1 セクターランキング、採用セクター、銘柄ランキングを読む

- [ ] 期待動作との比較をまとめる
  - US/JP それぞれ何が取れたか
  - 想定どおりか / 気になる点があるか

## テスト戦略

- RED/GREEN のコード変更はなし
- 検証は workflow run / artifact / publish 結果の確認で行う

## 検証コマンド

- `gh run view 25358101207`
- `gh workflow run "Daily Fundamental Screener Japan" --ref main`
- `gh run watch <jp-run-id>`
- `gh run view <jp-run-id>`

## リスク・注意点

- Japan workflow は self-hosted Windows runner の空き状況に依存する
- publish step により report が main へ反映されるため、確認時点で内容が更新される
- workflow が success でも report 内容が期待とずれている可能性があるため、本文確認を省略しない

## 競合確認

- `docs/exec-plans/active/run-night-batch_20260429_2344.md`
- `docs/exec-plans/active/night-batch-rerun-focus8-200pack_20260505_0300.md`
- `docs/exec-plans/active/repo-structure-align-and-archive-rules_20260424_2015.md`

ファイル競合はない。ただし operational には同じ self-hosted runner を使うため、Japan rerun は runner 利用中ジョブとのタイミング影響を受ける。

---

作成者: Copilot
作成日時: 2026-05-05T13:48:00+09:00
