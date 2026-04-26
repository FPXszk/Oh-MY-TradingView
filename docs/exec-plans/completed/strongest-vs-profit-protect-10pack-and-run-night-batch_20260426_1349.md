# strongest vs profit-protect 10pack 作成・Night Batch 実行計画

作成日時: 2026-04-26 13:49 JST

## 目的

`docs/research/archive/main-backtest-current-summary.md` にある strongest 系と、直近の profit-protect 比較で上位に出た候補を同一の 10 本セットにまとめ、backtest 対象として登録する。差分を `main` に push したうえで `Night Batch Self Hosted` workflow を実際に起動する。

## 前提整理

- strongest 側の基準参照は `docs/research/archive/main-backtest-current-summary.md`
- 現行の profit-protect 比較 campaign は `config/backtest/campaigns/selected-us40-10pack.json`
- 現行 night batch foreground bundle は `config/night_batch/bundle-foreground-reuse-config.json` で `selected-us40-10pack` を参照している
- workflow 実行入口は `.github/workflows/night-batch-self-hosted.yml` の `workflow_dispatch`

## 変更・作成・移動するファイル

### 作成候補

- `docs/exec-plans/active/strongest-vs-profit-protect-10pack-and-run-night-batch_20260426_1349.md`
- 必要なら新 campaign 定義: `config/backtest/campaigns/<new-campaign>.json`
- 必要なら新 run 記録用メモ: `docs/research/<new-run-doc>.md` または `docs/reports/archive/<new-run-report>.md` は workflow 完了後に別タスク化する

### 更新候補

- `config/backtest/campaigns/selected-us40-10pack.json` または新 campaign を参照する bundle config
- `config/night_batch/bundle-foreground-reuse-config.json`
- `config/backtest/strategy-catalog.json` または `config/backtest/strategy-presets.json`
- `docs/strategy/current-strategy-reference.md`
- 必要なら `docs/research/manifest.json`

### 完了時に移動

- `docs/exec-plans/active/strongest-vs-profit-protect-10pack-and-run-night-batch_20260426_1349.md`
- 移動先: `docs/exec-plans/completed/strongest-vs-profit-protect-10pack-and-run-night-batch_20260426_1349.md`

## 比較セットの想定方針

- strongest の非 profit-protect 基準戦略を含める
- strongest 系 US 候補の中から、stop / entry の違いを持つ比較対象を含める
- profit-protect 系は run66 上位を優先し、下位で切る候補も少なくとも 1 本含める
- 10 本ちょうどに収め、同一 US40 universe で比較可能なセットにする

現時点の有力候補の軸:

- strongest 非 TP 基準
- strongest 上位 US 系の別 stop / entry バリアント
- profit-protect 上位: `tp25-25-tp100-50`, `tp30-33-tp100-50`, `tp30-20-tp100-50`
- profit-protect 中位: `tp30-25-tp100-67`, `tp30-25-tp100-33`, `tp30-25-tp120-50`
- 切り分け用下位: `tp30-25-tp90-50`, `tp35-25-tp100-50`

## 実装内容と影響範囲

- strongest 側と profit-protect 側から採用する 10 本を最終確定する
- 必要なら新 campaign を作り、night batch bundle がその campaign を参照するように更新する
- 戦略 ID が live catalog / preset 側で実行可能かを確認し、不足があれば最小差分で整える
- strategy reference の人間向け説明を比較セットに合わせて更新する
- 変更を review して commit / push する
- `gh` で `Night Batch Self Hosted` workflow を `workflow_dispatch` 実行する
- 実行後、run id / 起動確認までをこのタスクの完了条件に含める

## スコープ

### 含む

- 10 本比較セットの定義
- campaign / bundle / 参照ドキュメント更新
- 差分 review
- commit / push
- workflow_dispatch 実行

### 含まない

- workflow 完了待ち後の結果要約
- artifact を受けた research / reports 更新
- backtest ロジックそのものの変更
- 既存 strongest summary の再生成

## TDD / テスト戦略

- campaign / docs 更新のみで済む場合はコード修正を前提にしない
- もし strategy catalog / generator などコード修正が必要なら RED -> GREEN -> REFACTOR で進める
  - RED: 新しい比較セットが解決できないことを示す失敗テストを追加
  - GREEN: 最小限の修正で通す
  - REFACTOR: 構造整理のみ
- 検証は少なくとも repo policy テストと、必要なら campaign / artifact 関連テストを実行する

## 検証コマンド候補

- `git diff -- config/backtest/campaigns config/night_batch/bundle-foreground-reuse-config.json docs/strategy/current-strategy-reference.md`
- `node --test tests/repo-layout.test.js tests/archive-latest-policy.test.js`
- `gh workflow run "Night Batch Self Hosted" --ref main -f config_path=config/night_batch/bundle-foreground-reuse-config.json`
- `gh run list --workflow "Night Batch Self Hosted" --limit 5`

## リスク / 注意点

- strongest 側の一部は retired 扱いのものがあるため、campaign 参照時に live preset 制約へ引っかかる可能性がある
- `selected-us40-10pack` を直接上書きすると、現行比較セットの文脈が消える。新 campaign を切る方が安全な可能性がある
- night batch foreground bundle を恒久的に差し替えると次回運用にも影響するため、変更範囲を意識して最小化する必要がある
- workflow 起動は実施できても、完走確認までは別途待機が必要になる可能性がある

## 実装ステップ

- [ ] strongest 側と profit-protect 側から比較対象 10 本を最終確定する
- [ ] 既存 campaign を上書きするか、新 campaign を切るかを決める
- [ ] campaign / bundle / 必要な strategy 参照ファイルを更新する
- [ ] strategy reference など人間向け導線を更新する
- [ ] 数値参照・戦略 ID・workflow 入口の整合性を review する
- [ ] 必要テストを実行する
- [ ] plan を `docs/exec-plans/completed/` に移動する
- [ ] Conventional Commit で commit して `main` に push する
- [ ] `Night Batch Self Hosted` を `workflow_dispatch` 実行し、run id を記録する

## 完了条件

- strongest vs profit-protect の比較用 10 本セットが repo 上で定義されている
- night batch がその比較セットを参照する状態で `main` に反映されている
- workflow_dispatch 実行が完了し、起動した run id を確認できている
