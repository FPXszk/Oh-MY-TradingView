# Exec-plan: night-batch-test-baseline-align_20260510_1921

## 概要

目的: `npm run test:night-batch` に残っている 5 件の失敗を、**現行のリポジトリ実装を正** として解消する。古い期待値に寄ったテストを現行契約へ合わせつつ、もしテストではなく実装修正が必要な箇所があれば最小限で直す。

- 対象失敗:
  - `smoke-prod fails without launching when startup check fails`
  - `smoke-prod emits heartbeat logs while foreground steps are still running`
  - `production-child writes the latest backtest summary for detached bundle runs`
  - `preflight fails when chart target is visible but tv status reports api_available=false`
  - `summary classifies readiness failure distinctly from preflight failure`
- 基本方針: **repo の現在挙動を source of truth** とし、テスト fixture / 期待値を優先的に整合させる

## 変更ファイル（作成/変更予定）

- docs/exec-plans/active/night-batch-test-baseline-align_20260510_1921.md
- tests/night-batch.test.js
- python/night_batch.py

## 実装方針

- `tests/night-batch.test.js` の 5 ケースを、現行 `python/night_batch.py` の契約に合わせて再設計する
- startup-check miss でも preflight host/port が通る現行挙動は成功経路として扱い、古い「即 fail」前提を外す
- heartbeat test は smoke / production が heartbeat 境界を確実に跨ぐ fixture に直し、log timing 由来の偽陰性を消す
- detached `production-child` latest summary は dry-run の意味と現行 summary 出力条件を再確認し、必要なら test か `maybe_write_latest_backtest_summary_from_child_args()` 周辺を最小修正する
- readiness failure 2 件は、現行 recovery ルール（`api_available=false` を recoverable とみなす）を前提に、テストを deterministic にするため fake recovery helper / retry 設定を明示する
- 実装修正が入る場合も `python/night_batch.py` の public behavior を不用意に巻き戻さず、summary 書き出しや recovery 判定の core contract に限定する

## 範囲

### In scope

- `npm run test:night-batch` の現行 5 fail の解消
- 失敗原因に応じた test fixture / assertion の更新
- 必要最小限の `python/night_batch.py` 調整

### Out of scope

- `windows-run-night-batch-self-hosted` 以外のテスト群の広範な整理
- OpenD / logon launcher 周りの追加仕様変更
- night-batch 本体の新機能追加
- 既存 active plan の内容変更

## 実装ステップ

- [x] 5 fail を「テスト期待値ずれ」と「実装修正が必要なもの」に分類する
- [x] `tests/night-batch.test.js` の startup-check / heartbeat / readiness recovery ケースを現行契約へ合わせて更新する
- [x] detached summary failure がテストだけで閉じない場合、`python/night_batch.py` を最小修正する
- [x] `npm run test:night-batch` を通す
- [x] `npm test` を再実行して repo 全体の既定テストが通ることを確認する

## テスト戦略

- RED: 現在の `npm run test:night-batch` 失敗 5 件を再現し、各ケースの現行 runtime contract をコードから確認する
- GREEN: まず test fixture / assertion を調整し、それで閉じない failure だけ `python/night_batch.py` を直す
- REFACTOR: 失敗再現用 fixture の sleep / recovery helper / summary assertion を整理し、将来また同じ誤検知が起きにくい形へ整える

## 検証コマンド

- `npm run test:night-batch`
- `npm test`

## リスク・注意点

- 「repo を正とする」と言っても、summary 未出力のような明白な破綻があればテストではなく実装を直す必要がある
- readiness recovery は timeout / helper 呼び出しの影響で flaky になりやすいので、fixture を deterministic にしないと再発する
- heartbeat test は wall-clock 依存が強く、sleep 秒数の設計を誤ると再び偽陰性になる
- 既存 active plans (`night-batch-rerun-focus8-200pack_20260505_0300.md`, `repo-structure-align-and-archive-rules_20260424_2015.md`, `run-night-batch_20260429_2344.md`) とは対象が重ならないことを確認済み

## 完了条件

- `npm run test:night-batch` が pass する
- `npm test` も pass する
- 変更が現行 runtime behavior とテスト契約の整合に留まり、不要な仕様巻き戻しを含まない

## 実施結果

- 5 fail はすべて **現行実装に対するテスト契約ずれ** と整理し、今回は `tests/night-batch.test.js` のみを更新した
- startup-check miss ケースは「preflight target が ready なら成功継続」という現行挙動に合わせて test 名と assertion を更新した
- heartbeat case は status / smoke / production を分けた fake node fixture に変え、heartbeat が確実に発火する秒数へ調整した
- detached `production-child` summary case は `--dry-run` を外し、summary 生成を本当に通す形へ変えた
- readiness failure 2 件は `--recovery-step-retries 0` を明示して deterministic にし、現行の preflight-failed 契約へ合わせた

---

作成者: Copilot
作成日時: 2026-05-10T19:21:00+09:00
