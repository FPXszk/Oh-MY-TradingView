# Exec Plan: add-explain-forhuman-night-batch-guide_20260414_0105

## 1) 背景 / 目的

ユーザーが直前に確認した内容、つまり以下を **非エンジニアでも追える 1 枚の説明文書** に整理し、repo 直下の `explain-forhuman.md` として追加する。

- `universe` / `campaign` / `strategy preset` の違い
- GitHub workflow 実行時に何が動くか
- 実行時にどのフォルダ / ファイルが読まれるか
- 人間向けドキュメントはどこにあるか
- 実行前に読む最短ルート

この文書は、既存の `README.md` / `command.md` / `docs/research/latest/README.md` の**代替**ではなく、  
それらの役割を短く整理して **「最初に読む入口」** を作ることを目的とする。  
最終的には docs-only 変更として commit / push まで見越す。

## 2) 変更・作成・移動するファイル一覧

### 作成
- `explain-forhuman.md`
- `docs/exec-plans/active/add-explain-forhuman-night-batch-guide_20260414_0105.md`

### 移動
- `docs/exec-plans/active/add-explain-forhuman-night-batch-guide_20260414_0105.md`
  -> `docs/exec-plans/completed/add-explain-forhuman-night-batch-guide_20260414_0105.md`

### 参照のみ
- `.github/workflows/night-batch-self-hosted.yml`
- `config/night_batch/bundle-foreground-reuse-config.json`
- `config/backtest/campaigns/next-long-run-us-finetune-100x10.json`
- `config/backtest/campaigns/next-long-run-jp-finetune-100x10.json`
- `config/backtest/universes/next-long-run-us-12.json`
- `config/backtest/universes/next-long-run-jp-12.json`
- `config/backtest/strategy-presets.json`
- `src/core/campaign.js`
- `python/night_batch.py`
- `scripts/windows/run-night-batch-self-hosted.cmd`
- `scripts/backtest/run-finetune-bundle.mjs`
- `scripts/backtest/run-long-campaign.mjs`
- `README.md`
- `command.md`
- `docs/research/latest/README.md`

## 3) 実装内容と影響範囲

### 実装内容
- `explain-forhuman.md` に以下を整理する
  1. 最初に結論
  2. 用語の違い（preset / universe / campaign）
  3. workflow 実行時の流れ
  4. 実際に読まれる主なファイル / フォルダ
  5. 既存ドキュメントとの関係
  6. 実行前に読む最短ルート
  7. 注意点

### 影響範囲
- 影響は **ドキュメント利用者の理解導線** に限定
- 実行コード・workflow・config・results 生成物には影響しない

## 4) スコープ / Out of Scope

### In Scope
- `explain-forhuman.md` の新規追加
- night batch の実行経路を人間向けに要約
- `universe` / `campaign` / `strategy preset` の違いを明文化
- 既存ドキュメントの役割分担を明記
- commit / push

### Out of Scope
- workflow 自体の修正
- `config/night_batch/` や `config/backtest/` の内容変更
- `README.md` / `command.md` / `docs/research/latest/README.md` の改稿
- 実際の workflow 実行や結果検証

## 5) active plan との衝突有無

- `document-self-hosted-runner-foreground-autostart_20260412_0006.md`
- `investigate-night-batch-self-hosted-queued_20260410_2307.md`
- `rerun-night-batch-after-run-cmd_20260410_1714.md`
- `run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md`

**判定:** ファイル衝突は低い。今回は原則 `explain-forhuman.md` の新規追加のみ。

## 6) TDD / 検証方針

### docs-only とする理由
今回の変更は説明文書の追加のみで、実行ロジックや設定を変えない。

### RED
- 必要情報が複数ファイルに分散し、1枚で追えない状態を failure とみなす

### GREEN
- `explain-forhuman.md` に必須項目をすべて記載する

### REFACTOR
- 非エンジニア向けに平文化し、正本ファイルへの導線を明確にする

## 7) 実装ステップ

- [ ] active plan と対象ファイルを確認し、docs-only に固定する
- [ ] workflow / config / source から実行経路を再確認する
- [ ] `explain-forhuman.md` の章立てを作る
- [ ] `explain-forhuman.md` を repo 直下に作成する
- [ ] 文体を非エンジニア向けに調整する
- [ ] diff / 表記 / 根拠を確認する
- [ ] plan を completed へ移動する
- [ ] Conventional Commit で commit する
- [ ] main へ push する

## 8) 検証コマンド

```bash
git --no-pager diff -- explain-forhuman.md docs/exec-plans/active docs/exec-plans/completed
git --no-pager diff --check
rg -n "universe|campaign|preset|workflow|bundle-foreground-reuse-config|night-batch-self-hosted|README.md|command.md|docs/research/latest/README.md|最短ルート" explain-forhuman.md
rg -n "us_campaign|jp_campaign|smoke_phases|production_phases" config/night_batch/bundle-foreground-reuse-config.json
rg -n "CAMPAIGNS_DIR|UNIVERSES_DIR|PRESETS_PATH|loadCampaign" src/core/campaign.js
```

## 9) リスク / 注意点

- active plan の更新で説明文が stale になる可能性
- 簡略化しすぎると `campaign` と `bundle config` の境界が曖昧になる
- workflow 既定値が今は `12x10` ではなく `finetune 100x10` である点を明確に書く必要がある

## 10) commit / push 想定

- 想定コミット: `docs: add explain-forhuman workflow guide`
- main へ push
