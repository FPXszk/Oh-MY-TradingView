# 実行計画: 既存 campaign 再利用による bundle detached config 化 (20260410_1055)

## 背景と目的

前回中断した fine-tune backtest を、**checkpoint resume ではなく smoke から再始動**したい。  
ただし新しい night batch 用 JSON に 10 本の strategy ID を複製するのではなく、既存の campaign 定義:

- `config/backtest/campaigns/next-long-run-us-finetune-100x10.json`
- `config/backtest/campaigns/next-long-run-jp-finetune-100x10.json`

をそのまま参照して再利用したい。

今回の実装では、現在の self-hosted detached night batch を **single backtest だけでなく bundle smoke/full にも使える形**へ拡張し、次を満たす。

1. smoke を同期実行してゲートにする
2. smoke success 時のみ full を detached で継続する
3. 100銘柄 x 10戦略の US/JP campaign を JSON から参照する
4. strategy ID は new JSON に重複記述しない
5. docs / session log を更新し、可能なら実 run を開始する

---

## 現在すでにあるもの

- `python/night_batch.py`
  - `bundle / campaign / recover / report / nightly / smoke-prod`
  - JSON config 対応の `smoke-prod`
  - smoke success 後の detached production child
- `.github/workflows/night-batch-self-hosted.yml`
- `scripts/windows/run-night-batch-self-hosted.cmd`
- `config/night_batch/nightly.default.json`
- 既存 fine-tune campaign 定義
  - `next-long-run-us-finetune-100x10`
  - `next-long-run-jp-finetune-100x10`

---

## 実装方針

### 1. 新 runner は作らない

既存 `python/night_batch.py` を後方互換を保ったまま拡張する。  
新しい夜間バッチ実装を別ファイルで重複させず、既存 `bundle` 実行資産を再利用する。

### 2. JSON schema を bundle 指向にも広げる

現在の `strategies.smoke.cli` / `strategies.production.cli` 方式に加えて、**existing campaign 参照ベース**の設定を受けられるようにする。

想定は次のどちらかの最小差分方式。

1. JSON に bundle セクションを追加し、内部で既存 `bundle` コマンド相当を組み立てる
2. JSON に `us_campaign` / `jp_campaign` / `smoke_phase` / `production_phase` を持たせ、そこから既存 `run-finetune-bundle.mjs` 呼び出しを導出する

優先順位:

- strategy ID を複製しない
- 既存 `run-finetune-bundle.mjs` / campaign JSON を変更しない
- 既存 `nightly.default.json` 互換を壊さない

### 3. 今回の実行ポリシー

- **resume は使わない**
- **smoke -> full** の 2 段だけを対象にする
- smoke 完了までは親が待つ
- smoke success 後に full を detached child で継続する

### 4. workflow / wrapper は必要最小限だけ更新

既存 self-hosted workflow と Windows CMD wrapper の骨格は維持し、新しい config path や説明だけを必要最小限で差し替える。

---

## 変更対象ファイル

### 新規作成

- `config/night_batch/bundle-detached-reuse-config.json`
- `docs/working-memory/session-logs/bundle-detached-reuse-config_20260410_1055.md`

### 変更

- `python/night_batch.py`
- `tests/night-batch.test.js`
- `.github/workflows/night-batch-self-hosted.yml`（必要な場合のみ）
- `scripts/windows/run-night-batch-self-hosted.cmd`（必要な場合のみ）
- `README.md`
- `docs/command.md`

### 原則として変更しない

- `config/backtest/campaigns/next-long-run-us-finetune-100x10.json`
- `config/backtest/campaigns/next-long-run-jp-finetune-100x10.json`

これらは**参照のみ**に留める。

### 条件付き

- `package.json`
  - 新規 test file を作る場合のみ explicit test list を更新する
  - 原則は `tests/night-batch.test.js` の拡張で完結させる

---

## スコープ

### In Scope

- bundle 指向 JSON schema の追加
- smoke gate + detached full continuation
- existing campaign 再利用 config の追加
- 必要最小限の workflow / wrapper 更新
- README / `docs/command.md` 更新
- session log 作成
- feasible な範囲で実 run 開始確認

### Out of Scope

- existing campaign 内の strategy lineup 変更
- backtest ロジック本体のアルゴリズム改善
- recover / checkpoint 仕様の拡張
- 新しい daemon / scheduler / queue 導入
- unrelated refactor

---

## TDD 方針

### RED

`tests/night-batch.test.js` に以下を追加する。

- bundle-oriented JSON から smoke 用 command を生成できる
- bundle-oriented JSON から full 用 command を生成できる
- smoke success 時のみ detached full が始まる
- smoke failure 時は detached full に進まない
- existing campaign ID 参照を使い、strategy ID 羅列なしで動く
- 既存 CLI-string config (`nightly.default.json`) 互換が維持される

### GREEN

- bundle 指向 config 解決の最小実装
- detached full の最小実装
- new config 作成
- 必要なら wrapper / workflow の最小更新

### REFACTOR

- config 解決処理の重複を整理
- `load_smoke_prod_settings` 周辺の責務を helper 化
- docs と実装の呼び名を揃える

---

## Validation commands

```bash
node --test tests/night-batch.test.js
python3 python/night_batch.py smoke-prod --config config/night_batch/bundle-detached-reuse-config.json --dry-run
npm test
```

実環境確認:

```bash
python3 python/night_batch.py smoke-prod --config config/night_batch/bundle-detached-reuse-config.json
```

Windows wrapper 確認:

```cmd
scripts\windows\run-night-batch-self-hosted.cmd config\night_batch\bundle-detached-reuse-config.json
```

---

## リスク

- config schema を広げすぎると `smoke-prod` の責務が曖昧になる
- existing `nightly.default.json` 互換を壊すと直近追加した self-hosted flow に影響する
- detached full と wrapper/workflow の path 解決差で挙動差が出る可能性
- 実 run は TradingView / Windows / WSL の状態に依存する
- recover 文脈が docs に残るため、今回は **smoke から再始動** を明記しないと運用ミスが起こりうる

---

## 実装ステップ

- [ ] `python/night_batch.py` の config 解決経路を整理し、bundle-oriented JSON の導入点を決める
- [ ] `tests/night-batch.test.js` に RED テストを追加する
- [ ] `python/night_batch.py` に bundle 指向 config 解決を実装する
- [ ] `config/night_batch/bundle-detached-reuse-config.json` を作成する
- [ ] 必要なら workflow / wrapper の既定 config path や説明を更新する
- [ ] `README.md` と `docs/command.md` に new config、smoke gate、detached full、resume 不使用を追記する
- [ ] `docs/working-memory/session-logs/bundle-detached-reuse-config_20260410_1055.md` を作成する
- [ ] focused validation を実施する
- [ ] feasible なら実 run を開始し、結果または制約を session log に残す

---

## 完了条件

- new JSON config が existing campaign を参照し、10 strategy ID を重複記述していない
- smoke 同期ゲート -> success 時のみ full detached の流れが動く
- `tests/night-batch.test.js` の追加ケースが通る
- `nightly.default.json` 互換が維持される
- docs / session log が更新される
- feasible な範囲で実 run の開始確認までできる
