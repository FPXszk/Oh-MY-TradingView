# Night Batch selected US40 8-pack 計画

作成日時: 2026-04-22 15:55 JST

## 目的

- 直近で確定した US40 銘柄 universe を使って、指定の 8 戦略を night batch でそのまま回せる状態にする
- GitHub Actions の `night-batch-self-hosted` workflow を既定起動したとき、そのまま今回の 8 戦略 bundle が始まるようにする
- 期間はユーザー指定どおり、現行 long-run 系で使っている `2015-01-01` 開始の設定にそろえる

## 前提 / 仮定

- 「直近で決めた US40 銘柄」は `config/backtest/universes/current/public-top10-us-40.json` を指すものとして扱う
- 指定された 8 戦略 ID はすべて repo 内に既存定義があり、新規 strategy preset 追加は不要
- 既存の `public-top10-us-40x10` は public library 上位 10 本のスナップショット用途として残し、今回の 8 本は別 campaign として切り出す

## 変更・作成・確認対象ファイル

### 作成

- `docs/exec-plans/active/night-batch-selected-us40-8pack_20260422_1555.md`
- `config/backtest/campaigns/current/selected-us40-8pack.json`（仮名）

### 変更

- `config/night_batch/bundle-foreground-reuse-config.json`
- `tests/campaign.test.js`
- `tests/night-batch.test.js`
- `tests/windows-run-night-batch-self-hosted.test.js`

### 確認のみ

- `config/backtest/universes/current/public-top10-us-40.json`
- `config/backtest/campaigns/current/public-top10-us-40x10.json`
- 必要なら `tests/public-us40-bundle-timeout.test.js`

## 実装内容と影響範囲

- 新しい current campaign を追加する
  - universe は `public-top10-us-40`
  - strategy_ids はユーザー指定の 8 本に限定する
  - date_override は `from=2015-01-01` を明示し、終端は現行運用と整合する値にそろえる
  - smoke/full の phase shape は既存 night batch 運用を踏襲し、full は 40 symbols を対象にする
- night batch の既定 bundle config を新 campaign に差し替える
  - `workflow_dispatch` の既定 `config_path` はそのまま
  - `bundle-foreground-reuse-config.json` の `bundle.us_campaign` だけを新 campaign に向ける
- 既存テストを更新または追加する
  - 新 campaign の matrix size が 40 x 8 であること
  - smoke phase が最小構成であること
  - night batch 既定設定が新 campaign を参照すること

## 対象戦略

1. `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`
2. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow`
3. `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early`
4. `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
5. `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late`
6. `tv-public-kdj-l2`
7. `tv-public-agni-momentum`
8. `tv-public-gold-hft-hybrid`

## 実装ステップ

- [ ] campaign 名と配置を確定し、既存 `public-top10-us-40x10` を残したまま 8 戦略版を追加する方針で差分を固定する
- [ ] RED: `tests/campaign.test.js` に 40 x 8 matrix と smoke phase の期待を追加し、未実装で失敗する状態を作る
- [ ] GREEN: `config/backtest/campaigns/current/selected-us40-8pack.json` を追加し、US40 universe・8 戦略・2015 開始期間を定義する
- [ ] RED/GREEN: `tests/night-batch.test.js` と `tests/windows-run-night-batch-self-hosted.test.js` を更新し、既定 bundle config が新 campaign を向くことを固定する
- [ ] GREEN: `config/night_batch/bundle-foreground-reuse-config.json` の `bundle.us_campaign` を新 campaign へ差し替える
- [ ] REFACTOR: campaign 名・description・phase shape を見直し、既存 current campaign 群との命名整合を取る
- [ ] REVIEW: 既定 workflow 実行時に追加指定なしで今回の 8 戦略 bundle が起動する構成になっているかを確認する
- [ ] 検証: 関連テストを実行する
- [ ] COMMIT/PUSH: 承認後、plan を `docs/exec-plans/completed/` へ移して Conventional Commit で commit / push する

## テスト戦略

- TDD を設定変更に適用する
  - RED: 新 campaign 未追加・既定 bundle 未変更の状態で期待テストを先に追加する
  - GREEN: campaign と既定 config を最小差分で更新して通す
  - REFACTOR: 命名や説明を整えつつテストが維持されることを確認する
- 実行候補
  - `node --test tests/campaign.test.js`
  - `node --test tests/night-batch.test.js`
  - `node --test tests/windows-run-night-batch-self-hosted.test.js`

## リスクと注意点

- 新 campaign 名を既存命名規則から外すと、あとで current campaign 一覧を見たとき意図が分かりにくくなる
- `date_override.to` の扱いは既存 current campaign ごとに揺れがあるため、今回どこへそろえるかを実装前に再確認する
- `public-top10-us-40x10` を直接上書きすると別用途の再現性を壊すため、基本方針は別 campaign 追加とする
- 今回の計画は既定起動設定の更新までを対象とし、実際の night batch dispatch 実行自体は承認後の実装フェーズで扱う
