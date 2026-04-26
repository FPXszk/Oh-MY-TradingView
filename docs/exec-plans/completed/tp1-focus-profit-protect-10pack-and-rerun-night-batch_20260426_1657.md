# TP1 focus profit-protect 10pack 作成・Night Batch 再実行計画

作成日時: 2026-04-26 16:57 JST

## 目的

run67 の結論を踏まえ、`TP1` 近傍を細かく刻んだ再比較セットを新たに作成する。新戦略を backtest に登録し、campaign と night batch bundle を更新して `main` に push したうえで、`Night Batch Self Hosted` workflow を再度 `workflow_dispatch` 実行する。

## 事前確認

- 現在の live strategy は 11 本で、`strongest` 非TP基準 1 本 + profit-protect 10 本
- 既存 live 群には `tp22-*`, `tp27-*`, `tp25-30-*`, `tp25-33-*` のような TP1 近傍の刻みが未実装
- 現行の比較 campaign は `config/backtest/campaigns/strongest-vs-profit-protect-us40-10pack.json`
- 現行 foreground bundle は `config/night_batch/bundle-foreground-reuse-config.json` が上記 campaign を参照している

## 比較セットの想定方針

run67 から残すべき軸と、新たに足すべき軸は次のとおり。

### 残す候補

- strongest 非TP基準
- `tp25-25-tp100-50`
- `tp30-33-tp100-50`
- `tp30-20-tp100-50`
- `tp30-25-tp100-50`

### 新規作成候補

- `tp22-25-tp100-50`
- `tp27-25-tp100-50`
- `tp25-20-tp100-50`
- `tp25-30-tp100-50`
- `tp25-33-tp100-50`

この 10 本で、`TP1 発動位置` と `TP1 比率` の両方を strongest 非TP基準に対して直接比較する。

## 変更・作成・移動するファイル

### 作成候補

- `docs/exec-plans/active/tp1-focus-profit-protect-10pack-and-rerun-night-batch_20260426_1657.md`
- `docs/references/pine/selected-us40-10pack/donchian-60-20-rsp-rsi14-regime60-tp22-25-tp100-50.pine`
- `docs/references/pine/selected-us40-10pack/donchian-60-20-rsp-rsi14-regime60-tp27-25-tp100-50.pine`
- `docs/references/pine/selected-us40-10pack/donchian-60-20-rsp-rsi14-regime60-tp25-20-tp100-50.pine`
- `docs/references/pine/selected-us40-10pack/donchian-60-20-rsp-rsi14-regime60-tp25-30-tp100-50.pine`
- `docs/references/pine/selected-us40-10pack/donchian-60-20-rsp-rsi14-regime60-tp25-33-tp100-50.pine`
- 新 campaign 定義: `config/backtest/campaigns/strongest-vs-profit-protect-tp1-focus-us40-10pack.json`

### 更新候補

- `config/backtest/strategy-presets.json`
- `config/backtest/strategy-catalog.json`
- `config/night_batch/bundle-foreground-reuse-config.json`
- `docs/strategy/current-strategy-reference.md`

### 完了時に移動

- `docs/exec-plans/active/tp1-focus-profit-protect-10pack-and-rerun-night-batch_20260426_1657.md`
- 移動先: `docs/exec-plans/completed/tp1-focus-profit-protect-10pack-and-rerun-night-batch_20260426_1657.md`

## 実装内容と影響範囲

- 既存 Pine source をベースに TP1 発動位置 / TP1 比率だけを変えた新 variant を 5 本追加する
- 新 variant を `strategy-presets.json` と `strategy-catalog.json` に登録する
- strongest 非TP基準 + 既存有力 4 本 + 新 variant 5 本で 10pack campaign を新規作成する
- foreground bundle が新 campaign を参照するように更新する
- `current-strategy-reference.md` に人間向けの比較軸説明を追加または更新する
- repo policy テストを実行する
- plan を completed に移動し、Conventional Commit で commit / push する
- `Night Batch Self Hosted` を `workflow_dispatch` 実行し、run id を確認する

## スコープ

### 含む

- 新 TP1 focus 戦略の作成
- strategy preset / catalog 登録
- 新 10pack campaign 作成
- bundle 切り替え
- review
- commit / push
- workflow_dispatch 実行

### 含まない

- workflow 完了後の結果要約
- broader strongest family の再設計
- CLI / workflow ロジックの修正

## TDD / テスト戦略

- strategy 登録や参照整合でコード修正が必要な場合は RED -> GREEN -> REFACTOR で進める
  - RED: 新 strategy id が current campaign / preset 制約を満たさない失敗条件を確認
  - GREEN: 最小限の source / preset / catalog 更新で通す
  - REFACTOR: 重複する説明や登録順だけ整理する
- Pine source 自体は既存 source の最小差分複製で進める
- 少なくとも `node --test tests/repo-layout.test.js tests/archive-latest-policy.test.js` を実行する

## 検証コマンド候補

- `rg -n "tp22|tp27|tp25-20|tp25-30|tp25-33|strongest-vs-profit-protect-tp1-focus-us40-10pack" config docs/references/pine docs/strategy`
- `node --test tests/repo-layout.test.js tests/archive-latest-policy.test.js`
- `gh workflow run "Night Batch Self Hosted" --ref main -f config_path=config/night_batch/bundle-foreground-reuse-config.json`
- `gh run list --workflow "Night Batch Self Hosted" --limit 5`

## リスク / 注意点

- live strategy 数が 11 本から増えるため、repo の live count 前提に影響しないか確認が必要
- Pine source 追加時に path 規約 (`docs/references/pine/...`) と preset / catalog の `source_path` がずれると実行不能になる
- foreground bundle を新 campaign に差し替えるため、次回 workflow もこの比較セットを向く
- 結果要約は別タスクになるため、今回の完了条件は workflow 起動まで

## 実装ステップ

- [ ] TP1 focus 10 本の最終構成を確定する
- [ ] 新 Pine variant 5 本を追加する
- [ ] `strategy-presets.json` と `strategy-catalog.json` に新 variant を登録する
- [ ] 新 campaign を作成し、bundle 参照先を切り替える
- [ ] `current-strategy-reference.md` を更新する
- [ ] 数値・ID・source path・bundle 参照の整合性を review する
- [ ] 必要テストを実行する
- [ ] plan を `docs/exec-plans/completed/` に移動する
- [ ] Conventional Commit で commit / push する
- [ ] `Night Batch Self Hosted` を `workflow_dispatch` 実行し、run id を記録する

## 完了条件

- TP1 focus 比較用 10 本セットが repo 上で定義されている
- 新戦略が live preset / catalog / source path と整合している
- night batch が新 campaign を参照する状態で `main` に反映されている
- workflow_dispatch 実行が完了し、起動した run id を確認できている
