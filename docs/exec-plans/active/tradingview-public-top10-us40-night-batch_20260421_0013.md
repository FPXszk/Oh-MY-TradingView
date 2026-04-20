# TradingView public top10 + US40 night batch exec-plan

## 目的

以下を一連で実現する。

- 現在の repo 内ランキングで総合的に強い上位 3 戦略を TradingView の My Scripts へ保存し、手動確認できる状態にする
- TradingView Public Library 上位 10 戦略を repo から再現・バックテスト可能にする
- バックテスト対象を US-only の 40 銘柄へ切り替える
- 既定の night batch workflow が上記構成で動くように差し替える

## 現状整理

- `config/night_batch/bundle-foreground-reuse-config.json` は現在 `strongest-overlay-us-50x9` と `strongest-overlay-jp-50x9` を既定参照している
- `python/night_batch.py` は bundle 実行を `us_campaign` + `jp_campaign` の 2 本前提で有効化しており、latest summary writer も US/JP 2 本を前提にしている
- `scripts/backtest/run-finetune-bundle.mjs` も US/JP 2 campaign 固定で順次実行する構造になっている
- `src/core/campaign.js` / `src/core/backtest.js` は local preset/catalog と builder ベースの source 生成を前提にしており、外部公開ストラテジーをそのまま campaign へ流す入口がない
- `src/core/pine.js` の apply 導線は `Save and add to chart` を拾えるため、My Scripts 保存は既存 compile 導線の延長で実現できる可能性が高い
- 既存 active plan と直接競合はしないが、`python/night_batch.py`・workflow 周辺は近接変更になるため差分は最小に保つ

## 前提 / 仮定

- Public Library 上位 10 は **TradingView Public Library の Strategy 一覧における all-time popularity 系の並び** を採用する
- repo に取り込む対象は **Pine source を閲覧できる open-source/public script のみ** とし、protected/paid/closed-source script は除外する
- 個別株 30 銘柄は **米国株のみ** から自動選定し、直近 5 年 total return を基準に **上位 10 / 中央近辺 10 / 下位 10** の 3 バケットに分ける
- 指数・アセット 10 銘柄は、ユーザー要望に沿って **Gold / Bitcoin / S&P 500 / Nasdaq / 半導体系を含む代表 10 本** を固定構成で持つ

## 変更・作成対象ファイル

### 新規作成

- `config/backtest/universes/current/public-top10-us-40.json`
- `config/backtest/campaigns/current/public-top10-us-40x10.json`
- `config/backtest/public-library-top-strategies.json`
- `src/core/public-strategy-registry.js`
- 必要なら `tests/public-strategy-registry.test.js`

### 変更

- `src/core/backtest.js`
- `src/core/campaign.js`
- `src/core/pine.js`
- `scripts/backtest/run-long-campaign.mjs`
- `scripts/backtest/run-finetune-bundle.mjs`
- `python/night_batch.py`
- `config/night_batch/bundle-foreground-reuse-config.json`
- `scripts/windows/github-actions/write-night-batch-live-checkout-baseline.ps1`
- `tests/backtest.test.js`
- `tests/campaign.test.js`
- `tests/night-batch.test.js`
- `tests/windows-run-night-batch-self-hosted.test.js`
- 必要なら `docs/explain-forhuman.md`
- 必要なら `docs/runbooks/night-batch.md`

## スコープ

### 含む

- Public Library 上位 10 の metadata/source を repo 内 registry に固定化する
- source-backed strategy を campaign / long-run runner から実行できるようにする
- US-only 40 symbol universe と 10 strategy campaign を current config に追加する
- night batch / bundle 実行を single-market 構成でも動くように一般化する
- 上位 3 strategy を TradingView 側へ保存するための自動化を追加する
- 関連テストと必要最小限のドキュメント更新

### 含まない

- protected / paid / closed-source TradingView script の無理な取り込み
- JP 市場を残した並行 bundle の最適化や大規模再設計
- current strategy catalog 全体の棚卸しや既存 strongest family の再評価
- 無関係な workflow / artifact / doc の整理

## 実装方針

1. Public Library 上位 10 の snapshot を repo 管理の registry (`config/backtest/public-library-top-strategies.json`) に固定し、source と出典 metadata を保持する
2. local preset builder とは別に、**raw Pine source を実行できる strategy resolution layer** を追加する
3. campaign matrix は既存の `presetId` ベース出力を保ちつつ、source-backed entry も同じ集計系へ流せる形に拡張する
4. My Scripts 保存は `Save and add to chart` 導線を利用し、上位 3 strategy を保存対象として自動投入する
5. bundle/night batch は US/JP 固定前提をやめ、**1 本以上の campaign 配列** を扱えるように最小限一般化する
6. workflow 既定 config は新 US40 × public-top10 campaign を参照するように差し替える

## TDD / 検証方針

### RED

- source-backed strategy registry の解決失敗ケースを先にテスト化する
- `public-top10-us-40.json` と `public-top10-us-40x10.json` の shape / count / matrix size を先にテスト化する
- night batch / bundle が single-market 構成で通ること、既定 config が新 campaign を向くことを先にテスト化する

### GREEN

- 最小差分で registry loader / campaign/backtest runner / bundle runtime を実装する
- 既定 config と docs を新構成へ差し替える

### REFACTOR

- bundle 内の US/JP 固定ロジックと summary path 生成を共通化する
- My Scripts 保存まわりで重複する Pine UI helper があれば整理する

## 検証コマンド

- `node --test tests/backtest.test.js tests/campaign.test.js tests/night-batch.test.js tests/windows-run-night-batch-self-hosted.test.js`
- 必要なら `npm test`
- `git --no-pager status -sb`

## リスク / 注意点

- Public Library 上位でも protected script は source を取り込めず、この repo の backtest 実行対象にできない
- TradingView UI の保存導線は modal/state に左右されるため、My Scripts 保存確認のための観測点を別途追加する可能性がある
- single-market bundle 化は `python/` と `scripts/backtest/` と Windows helper の 3 面にまたがる
- ranking の並びは時点依存なので、実装時に採用順位と URL を registry に固定して再現性を残す必要がある
- reporting/summarization の一部が US/JP 2 本前提の文言を持っているため、最小限の一般化が必要になる

## 実装ステップ

- [ ] Public Library 上位 10 の採用ルールを固定し、registry 形式と保存先を実装する
- [ ] source-backed strategy を backtest / campaign runner で実行できるようにする
- [ ] US-only 40 symbol universe と 10 strategy campaign を追加し、matrix 数をテストで固定する
- [ ] 上位 3 strategy を TradingView の My Scripts へ保存できる導線を追加する
- [ ] night batch / bundle / summary を single-market 対応にし、workflow 既定 config を切り替える
- [ ] 関連 docs を更新し、plan を completed へ移して commit/push する

## 完了条件

- Public Library 上位 10 が repo 管理の strategy registry として固定されている
- 40 銘柄 × 10 strategy の campaign が current config から読み込める
- 上位 3 strategy を TradingView My Scripts へ保存する実行導線がある
- 既定の night batch workflow が新 campaign を参照し、US-only 構成で動作できる
- 関連テストが更新され、変更内容を説明できる
