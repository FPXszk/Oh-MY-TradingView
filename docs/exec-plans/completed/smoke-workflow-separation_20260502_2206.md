# Smoke Workflow 分離計画

**作成日時**: 2026-05-02 22:06  
**目的**: スモークテストを独立ワークフローに分離し、ナイトバッチ本番から除外する

---

## 背景・問題

現状の `night-batch-self-hosted.yml` ワークフローは、「Run smoke gate and foreground production」という1ステップでスモークテストと本番バックテストを連続実行している。  
スモークが失敗しても検出が遅れ、本番ランの時間を無駄にするケースが頻発している。

## 解決方針

1. スモークテストのみを実行する **専用ワークフロー** (`night-batch-smoke.yml`) を新設
2. ナイトバッチ本番ワークフローはスモークをスキップして**いきなり本番**に入る
3. `python/night_batch.py smoke-prod` に `--smoke-only` / `--skip-smoke` フラグを追加して既存ロジックを再利用
4. `run-night-batch-self-hosted.cmd` に `NIGHT_BATCH_SKIP_SMOKE` 環境変数サポートを追加

---

## 変更・作成ファイル一覧

| ファイル | 種別 | 内容 |
|---|---|---|
| `.github/workflows/night-batch-smoke.yml` | **新規作成** | スモークテスト専用ワークフロー |
| `python/night_batch.py` | **修正** | `--smoke-only` / `--skip-smoke` フラグ追加、`execute_smoke_prod` 対応 |
| `scripts/windows/run-night-batch-self-hosted.cmd` | **修正** | `NIGHT_BATCH_SKIP_SMOKE` env var 検出 → `--skip-smoke` 付加 |
| `.github/workflows/night-batch-self-hosted.yml` | **修正** | ステップ名変更 + `NIGHT_BATCH_SKIP_SMOKE=1` 設定 |
| `tests/windows-run-night-batch-self-hosted.test.js` | **修正** | ステップ名参照を更新 |

---

## 実装ステップ

- [ ] **1. `python/night_batch.py` — `--smoke-only` / `--skip-smoke` フラグ追加**
  - `build_parser()` の `smoke_prod` サブパーサーに2フラグ追加
  - `load_smoke_prod_settings()` の return dict に `smoke_only` / `skip_smoke` を追加  
  - `build_smoke_prod_fingerprint()` に `skip_smoke` を追加（ラウンド resume の整合性）
  - `execute_smoke_prod()` で:
    - `skip_smoke=True` → smoke step を skipped として追加、本番へ進む
    - `smoke_only=True` → smoke 成功後に即 `return (0, steps, None)` して本番スキップ
  - dry-run パスにも同様の分岐を追加

- [ ] **2. `scripts/windows/run-night-batch-self-hosted.cmd` — NIGHT_BATCH_SKIP_SMOKE サポート**
  - スクリプト冒頭に `SKIP_SMOKE_FLAG` 変数を定義
  - `if defined NIGHT_BATCH_SKIP_SMOKE set "SKIP_SMOKE_FLAG= --skip-smoke"`
  - 各 `python3 python/night_batch.py smoke-prod ...` 呼び出しに `%SKIP_SMOKE_FLAG%` を付加

- [ ] **3. `.github/workflows/night-batch-self-hosted.yml` — 本番ワークフロー修正**
  - ステップ名 `Run smoke gate and foreground production` → `Run foreground production`
  - ステップ内で `set "NIGHT_BATCH_SKIP_SMOKE=1"` を追加

- [ ] **4. `.github/workflows/night-batch-smoke.yml` — 新規スモークワークフロー作成**
  - トリガー: `workflow_dispatch` (同じ `config_path` インプット)
  - ジョブ: `smoke-test` (timeout 60分)
  - ステップ:
    1. `actions/checkout@v4` (clean: false)
    2. Install dependencies in WSL workspace
    3. Ensure TradingView is running (本番と同じ)
    4. Readiness diagnostics (non-blocking, 本番と同じ)
    5. Wait for TradingView connection (required gate, 本番と同じ)
    6. Run smoke test only (`python3 python/night_batch.py smoke-prod --config ... --smoke-only`)
  - 後処理ステップ（アーティファクトアップロード等）は持たない（スモークは検証のみ）

- [ ] **5. `tests/windows-run-night-batch-self-hosted.test.js` — テスト更新**
  - `Run smoke gate and foreground production` → `Run foreground production` に全置換（6箇所）

- [ ] **6. テスト実行で回帰確認**
  - `npm test` でフルスイート通過確認

---

## 検証基準

- `npm test` がすべてパス
- `night-batch-self-hosted.yml` は `NIGHT_BATCH_SKIP_SMOKE=1` をセットし、スモークをスキップして本番実行
- `night-batch-smoke.yml` は `--smoke-only` で動き、スモーク成功後に本番をスキップして終了
