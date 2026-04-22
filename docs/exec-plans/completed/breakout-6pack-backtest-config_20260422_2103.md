# Breakout 6-Pack Backtest Config 計画

作成日時: 2026-04-22 21:03 JST

## 目的

追加した 2 戦略

- `breakout-finder`
- `breakout-trend-follower`

をそれぞれ 3 variant ずつ、合計 6 戦略へ拡張し、repo の current campaign と night batch 既定設定からすぐ回せる backtest 構成にする。完了後に commit / push する。

## 前提 / 仮定

- 6 戦略は「元 2 戦略の軽いパラメータ調整版」とし、ロジック自体の別物化はしない
- universe は既存運用に合わせて `public-top10-us-40` を使う
- smoke は `SPY` 1 銘柄、full は 40 symbols の既存パターンを踏襲する
- 今回は `selected-us40-8pack` を置き換える形で、night batch 既定 bundle を 6-pack へ向ける

## 変更・作成・確認対象ファイル

### 作成

- `docs/exec-plans/active/breakout-6pack-backtest-config_20260422_2103.md`
- 必要なら `config/backtest/campaigns/current/breakout-6pack-us40.json`

### 変更

- `config/backtest/public-library-sources/breakout-finder-strategy.pine`
- `config/backtest/public-library-sources/breakout-trend-follower-strategy.pine`
- `docs/research/strategy/retired/retired-strategy-presets.json`
- `config/night_batch/bundle-foreground-reuse-config.json`
- `tests/preset-validation.test.js`
- `tests/backtest.test.js`
- `tests/campaign.test.js`
- `tests/night-batch.test.js`
- `tests/windows-run-night-batch-self-hosted.test.js`

### 確認のみ

- `config/backtest/campaigns/current/selected-us40-8pack.json`
- `config/backtest/universes/current/public-top10-us-40.json`
- `docs/reports/breakout-finder-vs-current-breakout.md`

## 実装内容と影響範囲

- `breakout-finder` 系 3 本の variant を追加する
  - 例: breakout 検出の `Period` / `Minimum Number of Tests` / `Threshold Rate %` を軽くずらす
- `breakout-trend-follower` 系 3 本の variant を追加する
  - 例: MA length / pivot width / entry-stop buffer を軽くずらす
- 各 variant 用に raw_source preset を追加する
- 6 本をまとめた current campaign を追加する
- `bundle-foreground-reuse-config.json` の `bundle.us_campaign` を新 6-pack に向ける
- 関連テストを RED -> GREEN で更新し、6 本の matrix と既定 bundle 変更を固定する

## variant 方針

### Breakout Finder 系

- `breakout-finder-tight`
- `breakout-finder-balanced`
- `breakout-finder-wide`

調整候補:

- `prd`
- `thresholdRate`
- `minTests`
- `stopPct`

### Breakout Trend Follower 系

- `breakout-trend-follower-fast`
- `breakout-trend-follower-balanced`
- `breakout-trend-follower-slow`

調整候補:

- `maLength`
- `pivotLeft` / `pivotRight`
- `entryBufferPct`
- `stopBufferPct`

## スコープ

### 含む

- 6 variant 追加
- preset 化
- current campaign 追加
- night batch 既定 bundle 差し替え
- テスト更新
- commit / push

### 含まない

- 新 universe 作成
- 既存 strongest Donchian 群の修正
- 実機 TradingView での本番 backtest 実行

## TDD / テスト戦略

### RED

- `tests/campaign.test.js` に 40 x 6 matrix と smoke phase 期待を追加
- `tests/night-batch.test.js` / `tests/windows-run-night-batch-self-hosted.test.js` に既定 bundle の新 campaign 期待を追加
- 必要なら preset 数・ID 期待を `tests/backtest.test.js` / `tests/preset-validation.test.js` に追加

### GREEN

- 6 variant の Pine / preset / campaign / bundle を最小差分で追加して通す

### REFACTOR

- variant 命名と notes を整え、後から見て差分意図が分かるようにする

## 検証コマンド候補

- `node --test tests/preset-validation.test.js tests/backtest.test.js`
- `node --test tests/campaign.test.js`
- `node --test tests/night-batch.test.js tests/windows-run-night-batch-self-hosted.test.js`
- `git status --short`

## リスク / 注意点

- 既存 `selected-us40-8pack` を直接上書きすると前回比較軸が崩れるので、campaign は別名追加が安全
- raw_source preset を retired 側で増やすため、retired 件数テストがあれば更新が必要
- Pine の variant 化でパラメータ差を広げすぎると「少しいじる」範囲を超える
- night batch の既定 bundle 差し替えは他 active plan と近接するため、対象差分を限定する

## 実装ステップ

- [ ] 6 variant の命名とパラメータ差分を確定する
- [ ] RED: campaign / bundle / preset 期待テストを追加して失敗を確認する
- [ ] GREEN: 2 本の strategy Pine を variant 対応へ拡張し、6 preset を retired preset 群へ追加する
- [ ] GREEN: `breakout-6pack-us40` campaign を追加し、既定 bundle を差し替える
- [ ] テストを通す
- [ ] REVIEW: 6 本の差分が小さく、意図が説明可能かを確認する
- [ ] plan を `completed` へ移し、Conventional Commit で commit / push する

## 完了条件

- 6 variant が preset として定義されている
- `public-top10-us-40` 上で 6-pack campaign が current campaign として存在する
- night batch 既定 bundle がその 6-pack を向く
- 関連テストが通る
- 変更が push 済みである
