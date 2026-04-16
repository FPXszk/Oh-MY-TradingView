# night-batch-and-manual-config-guide_20260416_1418

## 背景 / 目的

ユーザーから以下の説明追加依頼がある。

- night batch は専用 config を持っているのか
- 手動で strategy / campaign を差し替えた場合、その内容が夜間実行にも乗るのか
- `config/backtest` 系は手動実行用なのか、night batch とは別物なのか
- strategy / campaign を差し替えて手動実行する具体的な手順・コマンドを知りたい

現状の `docs/explain-forhuman.md` には preset / universe / campaign の概念や GitHub workflow の流れはあるが、**night batch 専用設定**と**手動 backtest 用の設定・コマンド**の責務分離、および**差し替え時に夜間実行へ影響する条件**が明確ではない。  
そのため、既存コード・設定を根拠に、誤解が起きない説明を `docs/explain-forhuman.md` へ追記する。

## 変更・参照ファイル一覧

### 変更予定
- `docs/explain-forhuman.md`

### 参照のみ
- `.github/workflows/night-batch-self-hosted.yml`
- `config/night_batch/bundle-foreground-reuse-config.json`
- `python/night_batch.py`
- `scripts/windows/run-night-batch-self-hosted.cmd`
- `src/core/campaign.js`
- `scripts/backtest/run-long-campaign.mjs`
- `scripts/backtest/run-finetune-bundle.mjs`
- `src/cli/commands/backtest.js`

## 実装内容と影響範囲

`docs/explain-forhuman.md` に、既存説明を壊さず追記で以下を明文化する。

1. **night batch の設定起点**
   - GitHub Actions / self-hosted 実行の既定 config は `config/night_batch/bundle-foreground-reuse-config.json`
   - workflow と `python/night_batch.py smoke-prod --config <config>` の接続関係
   - 現在の既定 campaign ID が `next-long-run-us-12x10` / `next-long-run-jp-12x10` であること

2. **manual 実行と night batch の分離**
   - `scripts/backtest/run-long-campaign.mjs` は単一 campaign の手動実行
   - `scripts/backtest/run-finetune-bundle.mjs` は US/JP bundle の手動実行
   - `tv backtest preset <preset-id>` は preset 単位の手動 backtest
   - これらの**手動コマンドを実行しただけでは** night batch は自動で変わらないこと

3. **夜間実行へ影響する条件**
   - night batch が参照する config の campaign ID を変えた場合
   - もしくは、night batch が参照している既存 campaign 定義そのものを編集した場合
   - 逆に、別 campaign / 別 preset を手動で実行するだけなら night batch には乗らないこと

4. **`config/backtest` 系の位置づけ整理**
   - 手動 backtest / 個別検証向けの設定群として説明
   - night batch 専用 config とは別であり、**workflow から明示的に参照されない限り** night batch には使われないことを明記

5. **手動差し替え・実行手順**
   - 「今の night batch の対象確認」
   - 「単一 campaign を手動で走らせる」
   - 「bundle を手動で走らせる」
   - 「preset を手動で走らせる」
   - 「night batch 相当を明示 config で手動起動する」
   - 必要に応じて「元に戻す確認」まで含める

### 影響範囲
- 影響はドキュメントのみ
- 実行ロジック、workflow、config、campaign 定義、CLI 挙動には変更なし

## スコープ / Out of Scope

### スコープ
- `docs/explain-forhuman.md` への説明追記
- 既存実装を根拠にした、night batch と manual 実行の責務整理
- 実在コマンドに基づく手順の明文化

### Out of Scope
- workflow / Python / Node スクリプトの挙動変更
- `config/night_batch/*` や `config/backtest/*` の中身変更
- campaign / preset / strategy 定義の追加・削除・改名
- 新規ドキュメントファイル作成
- 例示のためのサンプル campaign 新設

## active plan との衝突有無

- 現時点の運用上の計画格納先は `plans/exec/active` / `plans/exec/completed`
- この docs 更新テーマと重複する active plan は実質なし
- そのため、本計画は単独で進行可能

## TDD / 検証方針

本件は docs-only 変更のため、通常の RED -> GREEN -> REFACTOR をコードに対して適用する対象はない。  
その代わり、以下の**根拠確認型検証**で品質を担保する。

- RED 相当: 現行ドキュメントで説明不足な論点を洗い出す
- GREEN 相当: 既存コード・設定に一致する説明文を追加する
- REFACTOR 相当: 誤読しやすい箇所を整理し、質問ごとに見出し化する

補足:
- カバレッジ 80% 要件は docs-only 変更のため非適用
- すべてのコマンド例・パス・既定値はソースファイルと照合する
- 実行可能なコマンドは `--help` またはソース確認で整合性を取る

## 実装ステップ

- [ ] `docs/explain-forhuman.md` の既存構成を確認し、追記位置を決める
- [ ] `.github/workflows/night-batch-self-hosted.yml` と `scripts/windows/run-night-batch-self-hosted.cmd` と `python/night_batch.py` を突き合わせ、night batch の実行入口と既定 config の流れを再確認する
- [ ] `config/night_batch/bundle-foreground-reuse-config.json` と `python/night_batch.py` から、既定の US/JP campaign ID を再確認する
- [ ] `src/core/campaign.js` を根拠に、campaign が preset / universe / strategy 実体へどう解決されるかを説明文へ反映する
- [ ] `scripts/backtest/run-long-campaign.mjs` / `scripts/backtest/run-finetune-bundle.mjs` / `src/cli/commands/backtest.js` を根拠に、手動実行コマンドの役割分担を整理する
- [ ] `docs/explain-forhuman.md` に以下の小節を追記する
  - [ ] 「night batch はどの config を見るか」
  - [ ] 「手動差し替えが夜間実行に影響する条件」
  - [ ] 「`config/backtest` 系は何のためか」
  - [ ] 「手動で差し替えて走らせる手順」
- [ ] 手順パートには、少なくとも以下の系統のコマンド例を入れる
  - [ ] night batch 対象確認
  - [ ] 単一 campaign 手動実行
  - [ ] bundle 手動実行
  - [ ] preset 手動実行
  - [ ] night batch 相当の手動起動（`smoke-prod --config`）
- [ ] 「手動で別 campaign を走らせるだけでは夜間実行は変わらない」「共有 campaign 定義を編集すると影響しうる」を明確に書き分ける
- [ ] 文面レビューを行い、既存説明との重複・矛盾・曖昧表現を解消する
- [ ] 差分確認と根拠コマンド確認を実施し、承認可能な状態に整える

## 検証コマンド

```bash
rg -n "bundle-foreground-reuse-config|smoke-prod|next-long-run-us-12x10|next-long-run-jp-12x10" \
  .github/workflows/night-batch-self-hosted.yml \
  config/night_batch/bundle-foreground-reuse-config.json \
  python/night_batch.py \
  scripts/windows/run-night-batch-self-hosted.cmd

rg -n "loadCampaign|strategy-presets|strategy-catalog|universe" src/core/campaign.js

node scripts/backtest/run-long-campaign.mjs --help

node scripts/backtest/run-finetune-bundle.mjs --help

rg -n "backtest preset|preset <preset-id>|date-from|date-to" src/cli/commands/backtest.js

git diff -- docs/explain-forhuman.md
```

## リスク / 注意点

- **最重要**: 「手動実行しただけで夜間にも流れる」と読める表現は避ける  
  → 実際には、night batch が参照する config / campaign 定義を変えた場合に限って影響しうる、という条件を明示する
- `config/backtest` の説明は、**night batch とは別系統**であることをベースにしつつ、将来の参照変更可能性まで断定しすぎない
- `campaign` と `preset` と `strategy` の用語が混線しやすいため、コマンド単位で「何を差し替える操作なのか」を明記する
- Windows 用バッチ起動と Node/Python の直接実行を混同しないよう、OS/用途別に整理する
- 既定 campaign ID は現時点の実装依存のため、説明では「現時点では」と添えて記述し、固定仕様のように見せない
