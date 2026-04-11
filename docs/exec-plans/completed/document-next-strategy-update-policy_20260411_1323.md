# Exec Plan: document-next-strategy-update-policy_20260411_1323

## 背景 / 目的

`README.md` の self-hosted runner 運用説明（`README.md:393-417` 付近）と `command.md` の manual launch 手順（`command.md:537-568` 付近）には、すでに **service mode は使わず、runner は手動 `run.cmd` 系で起動する** 方針が明記されている。  
また、`.github/workflows/night-batch-self-hosted.yml` は **detached child の起動確認で workflow 自体は終了しうる** 一方、production 本体は Windows ローカルで継続するため、**workflow が終わった＝live checkout を安全に更新できる** とは限らない。

このため、次ラウンド向けの strategy / config を更新したくても、**self-hosted runner または detached night-batch がまだ active な間は、現在の live checkout を直接編集しない** という運用ポリシーを文書化する。  
特に `config/backtest/strategy-presets.json` を含む live strategy 関連ファイルは mid-run 変更の影響が大きく、**次 strategy は別 worktree / clone / branch で準備し、detached 完了後に live checkout へ反映し、`advance-next-round` を明示して次 run を起動する** 方針を docs に残す。

---

## 変更・作成するファイル

### 作成
- `docs/exec-plans/active/document-next-strategy-update-policy_20260411_1323.md`

### 更新候補
- `README.md`
- `command.md`
- `docs/DOCUMENTATION_SYSTEM.md`  
  - 入口文書から運用ポリシーへ辿れるようにする場合のみ
- `docs/working-memory/session-logs/round-aware-night-batch-layout_20260410_1332.md` または新規 session log  
  - documentation governance / 運用履歴を残す必要がある場合のみ
- `tests/windows-run-night-batch-self-hosted.test.js`  
  - 既存の docs assertion harness を拡張する場合のみ

### 参照のみ（原則変更しない）
- `.github/workflows/night-batch-self-hosted.yml`
- `scripts/windows/run-night-batch-self-hosted.cmd`
- `config/night_batch/bundle-detached-reuse-config.json`
- `config/backtest/strategy-presets.json`
- live strategy / backtest 入力として参照されうる `config/backtest/**`

### 削除予定
- なし

---

## スコープ

### In Scope
- self-hosted runner / detached night-batch が active な間の **next strategy 更新ポリシー** の文書化
- **live checkout を mid-run で編集しない** ことの明文化
- **別 worktree / clone / branch で次 strategy を準備する** 手順レベルのガイド追加
- detached 完了後に **live checkout 更新 → 明示的な次 run 起動（`advance-next-round`）** へ進む流れの整理
- README / command / docs index 間の整合確認
- 必要なら docs assertion の追加検討

### Out of Scope
- runner / workflow / Python 実装の変更
- detached state 判定ロジックや lock 制御の実装
- worktree 自動生成スクリプトの追加
- backtest / strategy ロジック変更
- `config/backtest/strategy-presets.json` など live strategy ファイルの実データ更新
- 既存 active plan の統合・置換
- self-hosted runner の再設定や GitHub Actions 運用そのものの変更

---

## 実装内容と影響範囲

### 文書化したい中核ポリシー
1. **workflow 終了だけでは safe とはみなさない**  
   - detached child 起動後も production はローカル継続しうるため、workflow run の終了だけで live checkout 更新可とは判断しない。
2. **active run 中は live checkout を編集しない**  
   - 特に `config/backtest/strategy-presets.json` など strategy / backtest 入力は mid-run 編集禁止対象として明示する。
3. **次 strategy は別の作業領域で準備する**  
   - worktree / clone / branch のいずれかで次変更を準備し、current run が参照している live checkout とは分離する。
4. **detached 完了後に live checkout を更新する**  
   - detached state / 実行完了を確認してから、必要な差分を live checkout に反映する。
5. **次 run は明示的に開始する**  
   - 次ラウンド開始時は `advance-next-round` を明示して起動する運用を docs に残す。

### 影響範囲
- 主影響は運用文書
- 実装コードへの変更予定は現時点でなし
- 既存 docs と矛盾しない形で、**manual runner 運用** と **detached 継続実行** の注意点を補強する
- docs assertion を追加する場合のみ、既存 test ファイルへ軽微な追記が入る可能性がある

---

## 既存 active plan との非重複方針

以下の active plan はすでに存在するため、本 plan は **「運用ポリシーの文書化」だけ** に限定し、調査・rerun・workflow 実行そのものとは重ねない。

- `docs/exec-plans/active/investigate-night-batch-self-hosted-queued_20260410_2307.md`
- `docs/exec-plans/active/rerun-night-batch-after-run-cmd_20260410_1714.md`
- `docs/exec-plans/active/run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md`

### 非重複の整理
- 上記 3 本は runner 割当、workflow rerun、dispatch 実行、blocker 切り分けが主題
- 本 plan は **live checkout をいつ更新してよいか** という documentation / governance 主題
- 実装時も、GitHub Actions の追加調査や rerun は本 plan の成果物に含めない
- 必要な事実は既存 docs / 既存 active plan の既知コンテキストを参照し、同じ調査を再実行しない

---

## TDD / テスト戦略（RED → GREEN → REFACTOR）

本件は docs 主体だが、既存の `tests/windows-run-night-batch-self-hosted.test.js` に README / command.md の docs assertion があるため、必要に応じてそれを活用する。

### RED
- 現状 docs では「service mode は使わない」「manual run.cmd 起動」「detached child 後もローカル継続」は説明済みだが、  
  **active detached 中は live checkout を編集しない**、**別 worktree / clone / branch で次 strategy を準備する**、**`advance-next-round` を明示する** まで一貫して保証できていない状態をギャップとして固定する。
- docs assertion を追加する場合は、まず不足文言を検出する failing test を先に置く。

### GREEN
- README / command.md / 必要なら `docs/DOCUMENTATION_SYSTEM.md` に最小限の追記を行い、上記ポリシーを通しで読める状態にする。
- docs assertion を追加した場合は、その test を通す。

### REFACTOR
- 文言の重複・表現ゆれを整理し、README と command の責務を分ける。
- 入口導線が必要なら `docs/DOCUMENTATION_SYSTEM.md` を最小限更新する。
- 実装コードや運用スクリプトには触れない。

> 注記: 将来の実装で test を足す可能性はあるが、**現時点では code change は予定しない**。

---

## 検証コマンド

実装時の検証は、変更内容に応じて既存コマンドのみ使う。

### docs assertion を追加・更新した場合
```bash
node --test tests/windows-run-night-batch-self-hosted.test.js
npm test
```

### docs のみ更新で test 追加なしの場合
- README / command / `docs/DOCUMENTATION_SYSTEM.md` の相互整合を目視確認
- `advance-next-round`、manual runner、detached 継続実行、live checkout 非編集方針が文書上で追えることを確認

---

## リスク

- 「runner が active」と「detached child が active」が別概念なので、文言が曖昧だと誤運用を招く
- worktree / clone / branch のどれを標準とするかを強く固定しすぎると、既存運用との差分が大きくなる
- README と command.md の両方を更新する場合、説明重複や表現差異が生じやすい
- `config/backtest/strategy-presets.json` 以外の live strategy 関連ファイル範囲が広いため、禁止対象の例示が不足すると危険
- active plan が複数あるため、本 plan が調査・運用実行へ広がると重複作業になる
- docs assertion を追加しない場合、将来 drift を自動検知できない可能性がある

---

## チェックボックス形式のタスクリスト

- [ ] 既存 active plan 3 本と本 plan の境界を固定し、本件を documentation policy に限定する
- [ ] `README.md` と `command.md` の既存記述から、manual runner / detached 継続実行 / `advance-next-round` の事実を再確認する
- [ ] 「workflow 終了後も production がローカル継続しうるため、live checkout を即編集してはいけない」方針文を起案する
- [ ] `config/backtest/strategy-presets.json` を含む live strategy 関連ファイルが mid-run 変更高リスクであることを docs に落とし込む
- [ ] active run 中は **live checkout を編集せず、別 worktree / clone / branch で次 strategy を準備する** 手順を整理する
- [ ] detached 完了後に live checkout を更新し、`advance-next-round` を明示して次 run を開始する流れを整理する
- [ ] README と command.md の責務分担を決め、必要な追記箇所を確定する
- [ ] discoverability が不足する場合のみ `docs/DOCUMENTATION_SYSTEM.md` 更新要否を判断する
- [ ] documentation governance / 履歴が必要な場合のみ `docs/working-memory/session-logs/` 追記要否を判断する
- [ ] 既存 `tests/windows-run-night-batch-self-hosted.test.js` を流用した docs assertion 追加可否を判断する
- [ ] 実装時に使う validation commands を最終確定する
- [ ] 変更が docs-only であり、現時点で code change を計画していないことを最終確認する
