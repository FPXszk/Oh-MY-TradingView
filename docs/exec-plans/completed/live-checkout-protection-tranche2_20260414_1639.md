# Exec Plan: live-checkout-protection-tranche2_20260414_1639

## 1. tranche の目的

前 tranche で整備した manifest / pointer machine-check / ranking artifact / summary 導線を前提に、今回の第2トランシェでは **live checkout 保護強化** に限定して以下を実現する。

- `night-batch-self-hosted` 開始時点の protected file baseline を workflow 側で記録する
- `python/night_batch.py` が **smoke 成功後〜production 開始前** に baseline と現在状態を比較する
- 差分を **block すべき変更** と **warning として残す変更** に分ける
- 結果を **summary JSON / summary MD / GITHUB_STEP_SUMMARY / artifact** から追跡できるようにする

既存ドキュメント（`README.md` / `docs/command.md`）には「live checkout を mid-run で変更しない」運用ルールがあるため、この tranche は **運用ルールの追加ではなく、workflow/runtime の機械的ガード追加** に絞る。

---

## 2. in-scope / out-of-scope

### In Scope

- `.github/workflows/night-batch-self-hosted.yml` で protected file hash baseline を作成
- `python/night_batch.py` の `smoke-prod` フローに production 前 guard を追加
- `config/night_batch/bundle-foreground-reuse-config.json` の差分を production 前に検知
- `config/backtest/strategy-presets.json` と、bundle config が参照する latest campaign JSON の差分を warning として可視化
- protection 結果を round artifact / workflow summary に露出
- `tests/night-batch.test.js` / `tests/windows-run-night-batch-self-hosted.test.js` を中心に既存テストを拡張

### Out of Scope

- retired metadata 改善
- results bloat mitigation
- `config/backtest/` 全体への保護対象拡張
- production 開始後の継続監視や自動停止
- 運用ドキュメントの大幅改稿
- runner 構成や self-hosted 運用方式の変更

---

## 3. 変更対象ファイル

### 作成

- `scripts/windows/github-actions/write-night-batch-live-checkout-baseline.ps1`
- `docs/exec-plans/active/live-checkout-protection-tranche2_20260414_1639.md`

### 更新

- `.github/workflows/night-batch-self-hosted.yml`
- `python/night_batch.py`
- `scripts/windows/github-actions/find-night-batch-outputs.ps1`
- `scripts/windows/github-actions/append-night-batch-workflow-summary.ps1`
- `tests/night-batch.test.js`
- `tests/windows-run-night-batch-self-hosted.test.js`

### 参照のみ

- `config/night_batch/bundle-foreground-reuse-config.json`
- `config/backtest/strategy-presets.json`
- `config/backtest/campaigns/latest/next-long-run-us-12x10.json`
- `config/backtest/campaigns/latest/next-long-run-jp-12x10.json`
- `tests/repo-layout.test.js`
- `README.md`
- `docs/command.md`

---

## 4. 実装アプローチ

### A. workflow-side protected file hash recording

`night-batch-self-hosted.yml` に、`Install dependencies in WSL workspace` の後・`Run smoke gate and foreground production` の前で baseline 作成 step を追加する。

新規 `write-night-batch-live-checkout-baseline.ps1` の役割:

- `config/night_batch/bundle-foreground-reuse-config.json` を読む
- `bundle.us_campaign` / `bundle.jp_campaign` を解決し、対応する
  - `config/backtest/campaigns/latest/next-long-run-us-12x10.json`
  - `config/backtest/campaigns/latest/next-long-run-jp-12x10.json`
  を特定する
- 以下を SHA-256 で記録する
  - `config/night_batch/bundle-foreground-reuse-config.json`
  - `config/backtest/strategy-presets.json`
  - 上記 2 件の resolved latest campaign JSON
- baseline JSON を  
  `docs/research/results/night-batch/_workflow/gha_<run_id>_<attempt>-live-checkout-baseline.json`
  に出力する
- `NIGHT_BATCH_LIVE_CHECKOUT_BASELINE_PATH` を `GITHUB_ENV` に書き、以降の runtime に渡す

baseline JSON には少なくとも以下を含める。

- `run_id`, `run_attempt`
- `algorithm: "sha256"`
- `bundle_config_path`
- `resolved_campaigns`（campaign id と file path）
- `files[]`（path, role, sha256）
- `aggregate_fingerprint`

### B. runtime 側の diff 検知位置

`python/night_batch.py` の `execute_smoke_prod(...)` に、`smoke` 成功後・`production` / `detach-production` 実行前で `live-checkout-guard` step を追加する。

`night_batch.py` 内で追加する小関数候補:

- `resolve_live_checkout_protection_targets(settings)`
- `hash_live_checkout_targets(targets)`
- `load_live_checkout_baseline(path)`
- `evaluate_live_checkout_protection(baseline, current_hashes)`
- `write_live_checkout_protection_report(output_dir, run_id, report)`

方針:

- workflow が書いた baseline JSON を runtime が読む
- runtime は同じ対象ファイルを再ハッシュする
- 比較結果を  
  `docs/research/results/night-batch/roundN/<run_id>-live-checkout-protection.json`
  に書く
- baseline JSON も round dir に  
  `<run_id>-live-checkout-baseline.json`
  としてコピーし、artifact から baseline と評価結果の両方を辿れるようにする

### C. warn / fail の扱い

#### block（production に進めない）

- `config/night_batch/bundle-foreground-reuse-config.json` の hash 差分
- baseline JSON が見つからない / 壊れている / 必須項目不足

この場合は `live-checkout-guard` を失敗 step とし、production 開始前に non-zero で終了させる。  
既存の termination_reason 導線に合わせ、最終的には `failed_step=live-checkout-guard` を中心に surfacing する。

#### warning（run は継続）

- `config/backtest/strategy-presets.json` の hash 差分
- bundle config が参照している latest campaign JSON の hash 差分
  - `next-long-run-us-12x10.json`
  - `next-long-run-jp-12x10.json`

warning は step 自体は成功扱いにしつつ、summary/report に `warnings` として残す。  
この tranche では **campaign latest 全件監視には広げず、現在の bundle foreground config が参照する 2 件のみ** を対象とする。

### D. workflow summary / artifact への露出

`python/night_batch.py` の summary JSON / MD には、既存項目に加えて `live_checkout_protection` オブジェクトを持たせる。

想定項目:

- `status` (`passed` / `warning` / `blocked`)
- `baseline_path`
- `report_path`
- `aggregate_fingerprint_before`
- `aggregate_fingerprint_current`
- `blocked_files`
- `warning_files`

`find-night-batch-outputs.ps1` は既存の summary/rich/ranking に加え、`protection_report` を出力する。

`append-night-batch-workflow-summary.ps1` は `ProtectionReportPath` 引数を受け取り、`## Live checkout protection` セクションを追加する。

表示内容:

- status
- blocked files
- warning files
- baseline path
- protection report path

artifact は既存の round dir upload をそのまま利用し、baseline / protection report を同梱する。

---

## 5. RED→GREEN→REFACTOR を含むテスト戦略

### RED

`tests/night-batch.test.js`

- baseline あり + bundle config hash 不一致で `smoke-prod` が production 前に失敗するテストを追加
- baseline あり + `strategy-presets.json` 差分で run は成功し、warning が summary に残るテストを追加
- baseline あり + latest campaign JSON 差分で run は成功し、warning が summary / protection report に残るテストを追加
- baseline 欠落 / 破損で `live-checkout-guard` が失敗するテストを追加

`tests/windows-run-night-batch-self-hosted.test.js`

- workflow に baseline writer step が追加されていること
- baseline step が run step より前にあること
- workflow が `NIGHT_BATCH_LIVE_CHECKOUT_BASELINE_PATH` を runtime に渡すこと
- `find-night-batch-outputs.ps1` が `protection_report` を出力すること
- `append-night-batch-workflow-summary.ps1` が `ProtectionReportPath` を受け取り、protection セクションを出すこと

### GREEN

- baseline writer script を追加
- workflow から env 経由で baseline path を渡す
- `night_batch.py` に `live-checkout-guard` と report/surface の最小実装を追加
- PowerShell helper 2 本を protection report 対応に拡張

### REFACTOR

- hash 計算・baseline 読み込み・差分分類を `night_batch.py` 内の小関数へ分離
- summary JSON と workflow summary のフィールド名を揃える
- warning/block 判定を 1 箇所に集約し、対象追加時の変更点を減らす

---

## 6. 検証コマンド

```bash
git --no-pager diff --check
node --test tests/night-batch.test.js tests/windows-run-night-batch-self-hosted.test.js
node --test tests/repo-layout.test.js
npm test
```

---

## 7. リスク

- PowerShell と Python で hash 対象バイト列の扱いを揃えないと誤検知する
- Windows 側 path と WSL/Python 側 path の正規化差分で baseline 読み込みに失敗する可能性がある
- baseline を `_workflow/` に置き、round dir へ複製する責務分割を曖昧にすると artifact 追跡性が落ちる
- warning 対象を広げすぎると nightly 運用でノイズ化する
- `python/night_batch.py` への追記が肥大化しやすいため、REFACTOR 前提で関数分割が必要

---

## 8. チェックボックス形式の実装ステップ

- [ ] `write-night-batch-live-checkout-baseline.ps1` を追加し、bundle foreground config から protected target を解決できるようにする
- [ ] baseline JSON schema（run metadata / files / resolved campaigns / aggregate fingerprint）を確定する
- [ ] `.github/workflows/night-batch-self-hosted.yml` に baseline writer step を追加する
- [ ] workflow から `NIGHT_BATCH_LIVE_CHECKOUT_BASELINE_PATH` を runtime に渡す
- [ ] `python/night_batch.py` に baseline 読み込み・再ハッシュ・差分評価用の小関数を追加する
- [ ] `execute_smoke_prod(...)` の smoke 後〜production 前に `live-checkout-guard` step を挿入する
- [ ] bundle config 差分を block、strategy-presets / resolved latest campaign 差分を warning として分類する
- [ ] round dir に `<run_id>-live-checkout-baseline.json` と `<run_id>-live-checkout-protection.json` を出力する
- [ ] summary JSON / summary MD に `live_checkout_protection` 情報を追加する
- [ ] `find-night-batch-outputs.ps1` に `protection_report` 出力を追加する
- [ ] `append-night-batch-workflow-summary.ps1` に `ProtectionReportPath` 引数と `## Live checkout protection` セクションを追加する
- [ ] `tests/night-batch.test.js` の RED ケースを先に追加する
- [ ] `tests/windows-run-night-batch-self-hosted.test.js` の RED ケースを先に追加する
- [ ] 指定の検証コマンドを実行し、既存挙動を壊していないことを確認する
