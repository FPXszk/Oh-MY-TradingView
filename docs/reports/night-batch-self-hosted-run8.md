# Night Batch Self Hosted — Run 8 結果レポート

## 概要

| 項目 | 値 |
|---|---|
| workflow | Night Batch Self Hosted |
| run_number | 8 |
| run_id | 24282322391 |
| workflow 結果 | **failure** |
| backtest 結果 | **success** (artifact 上で確認済み) |

**結論: workflow は failure だが、バックテスト結果 artifact は成功。**

---

## artifact ベースの結果サマリー

`summary.json` から取得した主要フィールド:

| フィールド | 値 | 説明 |
|---|---|---|
| `success` | `true` | バックテスト本体は正常完了 |
| `termination_reason` | `success` | Python night_batch.py が正常終了で完走 |
| `failed_step` | `startup-check` | artifact contract 上の値。workflow failure の原因ではない |
| `last_checkpoint` | `docs/research/results/campaigns/next-long-run-jp-finetune-100x10/full/checkpoint-1006.json` | 最終チェックポイント |

### `failed_step` と `termination_reason` の読み方

- `termination_reason: success` は Python スクリプトが正常終了したことを示す
- `failed_step: startup-check` は artifact contract 上の最初に問題が検出されたステップ名であり、**workflow level の failure 原因とは別の概念**
- workflow の success/failure は GitHub Actions step の exit code で決まるため、backtest 本体が成功していても後続 step のエラーで workflow 全体が failure になり得る

### `last_checkpoint` と今後の参照価値

`checkpoint-1006.json` は `next-long-run-jp-finetune-100x10` campaign の full backtest 最終チェックポイント。このファイルが存在する場合、campaign は最後まで到達しており、結果は有効。

---

## Failure Root Cause

### 直接原因

`.github/workflows/night-batch-self-hosted.yml` の **Append night batch workflow summary** step にある inline PowerShell で **構文エラー** が発生。

具体的には、`Add-Content` の引数リスト内で `$(if (...) { ... } else { ... })` パターンを使用した際、Windows PowerShell のパーサーがハイフン付き文字列連結との組み合わせで構文を正しく解釈できなかった。

### 影響範囲

- バックテスト本体（Python night_batch.py）には影響なし
- artifact upload step は `always()` 条件で実行されるため、成果物は正常にアップロードされた
- GitHub Actions の GITHUB_STEP_SUMMARY への要約書き出しのみ失敗

---

## 再発防止策

本 run の調査を踏まえ、以下の対策を実施:

1. **inline PowerShell の外部スクリプト化**: `Locate night batch outputs` と `Append night batch workflow summary` の PowerShell ロジックを、それぞれ `scripts/windows/github-actions/find-night-batch-outputs.ps1` と `scripts/windows/github-actions/append-night-batch-workflow-summary.ps1` に分離
2. **nullable field の事前変数化**: `failed_step` / `last_checkpoint` を `if` 文で事前に変数へ代入してから `Add-Content` に渡すようにし、`$(if ...)` の inline 使用を排除
3. **テスト追加**: workflow が外部スクリプトを呼び出す構成になっていること、inline PowerShell が肥大化していないことを回帰テストで検証

---

## 関連リンク

- workflow: `.github/workflows/night-batch-self-hosted.yml`
- 外部スクリプト: `scripts/windows/github-actions/find-night-batch-outputs.ps1`, `scripts/windows/github-actions/append-night-batch-workflow-summary.ps1`
- テスト: `tests/windows-run-night-batch-self-hosted.test.js`
