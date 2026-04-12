# Exec Plan: harden-night-batch-summary-and-document-run8_20260412_0215

- **plan名**: `harden-night-batch-summary-and-document-run8_20260412_0215.md`
- **配置先**: `docs/exec-plans/active/harden-night-batch-summary-and-document-run8_20260412_0215.md`

## 1. 重複確認（active plan との非重複）

既存 active plan は以下を確認済みです。

- `docs/exec-plans/active/document-self-hosted-runner-foreground-autostart_20260412_0006.md`
- `docs/exec-plans/active/investigate-actions-run8-backtest-failure_20260412_0123.md`
- `docs/exec-plans/active/investigate-night-batch-self-hosted-queued_20260410_2307.md`
- `docs/exec-plans/active/rerun-night-batch-after-run-cmd_20260410_1714.md`
- `docs/exec-plans/active/run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md`

本計画は、**run 8 / run_id 24282322391 の調査結果が確定した前提で、再発防止の実装修正と run 8 結果ドキュメント整備を行う実装計画**です。  
既存の調査系 plan とは役割が異なり、`self-hosted runner` の autostart / queued 調査そのものや再実行作業は扱わないため、**直接の重複はありません**。

---

## 2. 背景 / 目的

GitHub Actions `Night Batch Self Hosted` の **run_number 8 / run_id 24282322391** では、バックテスト本体は artifact 上で完了していました。

- `summary.json`
  - `success: true`
  - `termination_reason: success`
  - `failed_step: startup-check`
  - `last_checkpoint: results/campaigns/next-long-run-jp-finetune-100x10/full/checkpoint-1006.json`

一方で workflow 全体は、`.github/workflows/night-batch-self-hosted.yml` の **`Append night batch workflow summary`** step にある **Windows PowerShell 構文エラー**で失敗しました。  
main にはすでに `$failedStep` / `$lastCheckpoint` を事前変数化する応急修正が入っていますが、**inline PowerShell のままでは再発余地が残る**ため、より durable でテストしやすい構成へ寄せます。

あわせて、run 8 の結果を **docs 配下の専用レポート**に整理し、`README.md` / `command.md` から辿れるようにします。

---

## 3. 変更・作成・削除するファイル

### 変更
- `.github/workflows/night-batch-self-hosted.yml`
- `tests/windows-run-night-batch-self-hosted.test.js`
- `README.md`
- `command.md`

### 作成
- `scripts/windows/github-actions/find-night-batch-outputs.ps1`
- `scripts/windows/github-actions/append-night-batch-workflow-summary.ps1`
- `docs/reports/night-batch-self-hosted-run8.md`

### 削除
- なし

> 第一候補は、**workflow 内の inline PowerShell を外出しして再発しづらくする**構成です。  
> 必要最小限の範囲に留め、backtest 本体や runner bootstrap 系 script には原則触れません。

---

## 4. 実装内容と影響範囲

### 実装内容

#### A. 再発防止（第一候補）
- `Append night batch workflow summary` の inline PowerShell を、専用 `.ps1` スクリプトへ移す
- 必要に応じて `Locate night batch outputs` も同様に外出しし、workflow YAML 側の PowerShell ロジックを薄くする
- script 引数・入出力を明示し、**null / 空文字 / path 未発見**をスクリプト内で安全に扱う
- workflow 側は「引数受け渡し」と「step wiring」に集中させる

#### B. テスト強化
- `tests/windows-run-night-batch-self-hosted.test.js` を拡張し、少なくとも以下を固定化する
  - workflow が大きな inline PowerShell 本文を持たないこと
  - workflow が新規 `.ps1` script を呼び出すこと
  - summary script が `failed_step` / `last_checkpoint` の nullable 値を安全に扱うこと
  - summary script が `success` / `termination_reason` / `failed_step` / `last_checkpoint` / `summary_json` を出力し続けること
  - README / command.md から run 8 専用レポートへ辿れること

#### C. ドキュメント整備
- `docs/reports/night-batch-self-hosted-run8.md` に run 8 の専用レポートを作成する
- レポートには以下を含める
  - 対象 run 情報（workflow 名 / run_number / run_id）
  - 「**workflow failure だが backtest result は成功**」という結論
  - root cause（PowerShell 構文エラー）
  - artifact ベースの結果サマリー
  - `failed_step` と `termination_reason` の読み方
  - `last_checkpoint` と今後の参照価値
  - 今回入れた再発防止策の要約
- `README.md` / `command.md` に、run 8 結果レポートへの導線を追加する

### 影響範囲
- **直接影響**
  - GitHub Actions `Night Batch Self Hosted` の summary / artifact 付帯処理
  - workflow 保守性
  - 運用ドキュメント導線
- **影響しない想定**
  - backtest エンジン本体
  - campaign 実行ロジック
  - self-hosted runner の bootstrap / autostart 動作
  - TradingView / CDP 接続ロジック

---

## 5. TDD 方針（RED → GREEN → REFACTOR）

## RED
- `tests/windows-run-night-batch-self-hosted.test.js` に失敗テストを先に追加する
- 失敗条件の例
  - workflow が依然として summary step の大きな inline PowerShell を保持している
  - workflow が新規 `.ps1` script を参照していない
  - 新規 summary script が required field を維持していない
  - README / command.md から run 8 レポートへ辿れない

## GREEN
- `.github/workflows/night-batch-self-hosted.yml` を最小限変更し、external `.ps1` 呼び出しへ切り替える
- `scripts/windows/github-actions/*.ps1` を追加し、PowerShell の nullable/path 処理を script 側へ閉じ込める
- run 8 レポートと README / command.md の導線を追加し、テストを通す

## REFACTOR
- workflow YAML の責務を「配線」に限定し、PowerShell 実装詳細を script へ集約する
- step 名・script 名・引数名を読みやすく揃える
- docs は重複説明を避け、README / command.md は短い案内、詳細は専用レポートへ寄せる

> 既存 package.json に coverage 計測コマンドは無いため、**数値の coverage 80% 計測は現状コマンドでは直接確認不可**です。  
> その代わり、今回の変更範囲（workflow summary hardening / docs 導線）についてはテスト追加で主要分岐を明示的に塞ぎます。

---

## 6. 実装ステップ

- [ ] 現状の `.github/workflows/night-batch-self-hosted.yml` にある PowerShell step を棚卸しし、external script 化する範囲を確定する
- [ ] `tests/windows-run-night-batch-self-hosted.test.js` に RED の失敗テストを追加する
- [ ] `scripts/windows/github-actions/find-night-batch-outputs.ps1` を新規作成する
- [ ] `scripts/windows/github-actions/append-night-batch-workflow-summary.ps1` を新規作成する
- [ ] workflow から inline PowerShell を可能な限り排除し、新規 script 呼び出しへ差し替える
- [ ] nullable field / missing artifact / missing markdown の扱いを script 側で統一する
- [ ] run 8 専用レポート `docs/reports/night-batch-self-hosted-run8.md` を作成する
- [ ] レポートに run 8 の結果サマリー、失敗原因、checkpoint、再発防止策を整理する
- [ ] `README.md` に専用レポートへの案内を追加する
- [ ] `command.md` に run 8 結果レポートへの参照と運用上の注意を追加する
- [ ] `npm test` で関連回帰を確認する
- [ ] 必要に応じて `npm run test:all` で全体回帰を確認する
- [ ] `git --no-pager diff --check` と導線確認用 `rg` で文書崩れ・記載漏れを確認する

---

## 7. 検証コマンド

### package.json 既存コマンド
```bash
npm test
npm run test:all
```

### 補助確認
```bash
git --no-pager diff --check
rg -n "find-night-batch-outputs|append-night-batch-workflow-summary" .github/workflows/night-batch-self-hosted.yml tests/windows-run-night-batch-self-hosted.test.js
rg -n "night-batch-self-hosted-run8\.md" README.md command.md docs/reports/night-batch-self-hosted-run8.md
```

### 判定基準
- `npm test` が通る
- 必要に応じて `npm run test:all` が通る
- workflow が summary 周りで external PowerShell script を呼ぶ構成になっている
- run 8 専用レポートが `README.md` / `command.md` から辿れる

---

## 8. Out of Scope

- `python/night_batch.py` や backtest 本体ロジックの仕様変更
- `summary.json` の schema 再設計
- self-hosted runner の service / autostart / bootstrap 再設計
- run 8 以外の過去 run 一覧整理
- GitHub Actions の再実行
- Git commit / push
- docs 全面再編

---

## 9. リスク

- Windows PowerShell と GitHub Actions 上の shell 解釈差分により、**script 外出し後も引数 quoting** で別種の不具合が出る可能性がある
- workflow YAML の表現を変えすぎると、summary 以外の既存挙動まで巻き込む恐れがある
- run 8 の `failed_step: startup-check` は artifact contract 上の値であり、workflow 失敗原因と混同されやすいので、**レポートでの言い分け**が必要
- docs に run 8 固有情報を書きすぎると、恒久運用ルールと単発事象が混ざる可能性がある
- 数値 coverage は既存コマンドで直接測れないため、**テスト追加の質**で担保する必要がある

---

## 10. 完了条件

- `.github/workflows/night-batch-self-hosted.yml` の summary 周辺が、**現在より再発しづらくテストしやすい external script 構成**へ移っている
- `tests/windows-run-night-batch-self-hosted.test.js` に再発防止の回帰テストが追加されている
- `docs/reports/night-batch-self-hosted-run8.md` に run 8 の結果サマリーと root cause が整理されている
- `README.md` / `command.md` から専用レポートへ辿れる
- `npm test` が通る

---

## 11. 補足メモ

- run 8 の結論は **「Actions workflow は失敗、しかしバックテスト結果 artifact は成功」** を主文にする
- レポートでは、`termination_reason: success` と workflow failure が両立する理由を明示する
- 応急修正済み main を前提に、今回はその先の **durable hardening** と **結果文書化** に集中する
