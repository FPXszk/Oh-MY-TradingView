# 実行計画: Mag7 戦略調査 round2 と 20 戦略バックテスト再実行 (20260404_1207)

- ステータス: COMPLETED
- 方針: **前回の 10 戦略 / 70 run を起点に、20 戦略規模へ拡張して再調査・再実行し、結果を repo に保存して push する**
- 既存 active plan との扱い: **同一テーマ継続のため、この plan を round2 向けに更新して継続利用した**
- 完了メモ: **20 戦略 / 140 run を完走し、round2 の raw / summary / session log / config 更新を repo に保存した**

## 前回セッションの要約

- 前回は `Mag7 / 10 strategies / 70 runs` を完走した
- 条件は `2015-01-01` 〜 `2025-12-31`、初期資金 `10000 USD`、日足 (`D`)、long-only / 手数料 0 / slippage 0
- summary は `docs/research/mag7-backtest-results_2015_2025.md`
- shortlist は `docs/research/mag7-strategy-shortlist_2015_2025.md`
- session log は `docs/working-memory/session-logs/mag7-backtest-session-summary_20260404_1106.md`
- raw results は `docs/references/backtests/mag7-backtest-results_20260404.json`
- 実測上位 3 戦略は `sma-200-trend-filter`, `donchian-breakout`, `supertrend-atr`
- repo 本体の generic runner 実装は未着手で、前回は session artifact runner で実行した

## 今回の目的

1. 前回の research と実測結果を踏まえて、候補戦略を **約 20 件** に拡張する
2. 追加候補を deep research し、採用理由 / 非採用理由 / レジーム適性を整理する
3. 実行可能な候補を Mag7 に対して順次バックテストし、raw / summary / session log を repo に保存する
4. 結果を round1 と比較できる形でまとめ、`main` に push する

## 推奨アプローチ

### 本線

- **session artifact runner 再利用 + research / results / docs 更新に集中**
- 理由:
  - 前回 70 run 完走の実績がある
  - 今回の主眼は durable な research/result 資産の拡充であり、generic runner 本実装は別テーマとして切り出しやすい
  - 20 戦略 × 7 銘柄 = 約 140 run 規模でも、前回方式の延長で現実的

### 比較案

#### A. generic runner 実装込み

- 長所: repo 本体に durable な backtest 基盤が残る
- 短所: スコープが大きく、今回の research / execution の完了が遅れやすい

#### B. session artifact runner 再利用（推奨）

- 長所: 最短で今回依頼の成果に到達できる
- 短所: 実行基盤の durable 化は弱い

## スコープ

### スコープ内

1. 前回 session log / research doc / raw results の再確認
2. 既存 10 戦略の再評価
3. 新規候補を追加して **約 20 戦略** を longlist / shortlist 化
4. 実行 input の整備
5. Mag7 各銘柄への順次バックテスト実行
6. raw JSON / research summary / session log の保存
7. 結果比較の要約作成
8. commit / push

### スコープ外

- generic backtest runner / CLI / MCP の本格実装
- ポートフォリオ最適化
- 全戦略の自動パラメータ最適化
- TradingView 外データソースの導入
- fee / slippage / tax の精緻モデリング

## 変更・作成・参照するファイル

### 参照

- `docs/working-memory/session-logs/mag7-backtest-session-summary_20260404_1106.md`
- `docs/research/mag7-strategy-shortlist_2015_2025.md`
- `docs/research/mag7-backtest-results_2015_2025.md`
- `docs/references/backtests/mag7-backtest-results_20260404.json`
- `config/backtest/strategy-presets.json`
- `config/backtest/universes/mag7.json`
- `tests/backtest.test.js`
- `tests/e2e.backtest.test.js`

### 更新候補

- `docs/exec-plans/active/mag7-strategy-study_20260404_0934.md`
- `config/backtest/strategy-presets.json`
- `config/backtest/universes/mag7.json`
- `README.md`（実行方法や durable assets の導線更新が必要な場合のみ）
- `tests/backtest.test.js`（repo 本体コードや config schema に影響がある場合）
- `tests/e2e.backtest.test.js`（repo 本体の実行経路を触る場合）

### 新規作成候補

- `docs/research/mag7-strategy-shortlist-round2_2015_2025.md`
- `docs/research/mag7-backtest-results-round2_2015_2025.md`
- `docs/references/backtests/mag7-backtest-results_round2_20260404.json`
- `docs/working-memory/session-logs/mag7-backtest-session-summary_20260404_1207.md`
- `scripts/dev/mag7-round2-batch.mjs`（session artifact で足りない場合のみ）

### 削除

- なし

## 実装内容と影響範囲

### 1. round1 の棚卸し

- 前回の 10 戦略と上位 3 戦略の特徴を再整理する
- warning や偏り（特に `NVDA` 依存）を次回比較の観点として固定する

**影響範囲**

- round2 で重視する改善軸が明確になる

### 2. deep research による 20 戦略案の作成

- 既存 10 戦略を baseline とし、新規候補を追加して約 20 戦略に拡張する
- 各戦略について、ロジック要約 / Pine 実装可否 / Mag7 との相性 / 採用可否 / 不採用理由を残す

**影響範囲**

- 研究成果物が拡充される
- 実行対象戦略の選定理由が durable に残る

### 3. 実行 input の整備

- 必要に応じて `strategy-presets.json` を 20 戦略対応へ更新する
- symbol alias や実行条件に差分があれば `universes` 側も補正する

**影響範囲**

- batch 実行時の整合性が上がる
- docs と config の同期管理が必要になる

### 4. Mag7 バックテスト再実行

- 前回成功した実行方式を使って、20 戦略規模の run を完走させる
- 途中失敗が出た場合は、失敗理由を summary に残しつつ再開可能な形を優先する

**影響範囲**

- `docs/references/backtests/` に新しい raw snapshot が増える
- round1 と round2 の比較が可能になる

### 5. 結果要約と push

- summary doc / session log に round2 の要約、上位戦略、改善候補を残す
- 必要なら README から研究成果に辿れるようにする

**影響範囲**

- 次回セッションでも判断の文脈を再利用しやすくなる

## ユーザー確認が必要な論点

1. **進め方**
   - A: generic runner 実装込み
   - B: session artifact runner 再利用で research + execution 優先（推奨）
2. **20 戦略の意味**
   - 既存 10 + 新規 10 で合計 20
   - 全 20 を完全に再選定
3. **成果物の持ち方**
   - 既存 `docs/research/*.md` を上書き更新
   - round2 用に別 doc を新設
4. **push 先**
   - `main` 前提でよいか

## テスト戦略（RED → GREEN → REFACTOR）

### RED

- repo 本体コードや config schema を変更する場合のみ、先に failing test を追加する
- 候補:
  - `tests/backtest.test.js`
  - `tests/e2e.backtest.test.js`
- 変更が docs / raw results / session log のみで完結する場合、RED は不要

### GREEN

- research 20 件を整理する
- 必要最小限の config / script 調整で batch 実行を通す
- raw JSON / research summary / session log を生成する

### REFACTOR

- round1 と round2 の比較表を整理する
- core strategies / improvement candidates / rejected ideas を見やすく再編する
- 実行補助スクリプトを追加した場合は薄い責務に留める

### カバレッジ方針

- repo 本体コードを触る場合のみ、新規変更箇所 80% 以上を目標にする
- docs 中心の変更では既存 test command の正常性確認を優先する

## 検証コマンド

- `npm test`
- `npm run test:e2e`
- `npm run test:all`
- `node src/cli/index.js status`
- 必要に応じて前回成功前提の CDP 接続環境で backtest 実行コマンドまたは補助 runner を使う

## リスク

1. CDP endpoint が session 依存で、前回と同じ接続条件が使えない可能性
2. 20 戦略化で preset / docs / raw results の整合が崩れやすい
3. 約 140 run 規模では途中失敗や長時間実行の再開戦略が必要
4. `NVDA` 依存がさらに強く出ると、戦略の一般性評価を誤りやすい
5. generic runner 実装まで同時に抱えると、今回の依頼の完了が遅れる

## チェックボックス形式の実装ステップ

### Phase 0: 計画確定

- [ ] 前回 session log / research / raw results を再読して round2 の評価軸を固定する
- [ ] 進め方 A/B と 20 戦略の定義をユーザー確認する
- [ ] round2 の成果物ファイル名方針を確定する

### Phase 1: 研究

- [ ] 既存 10 戦略の強み / 弱み / warning / bias を整理する
- [ ] 追加候補を deep research して約 20 戦略へ拡張する
- [ ] 採用理由 / 非採用理由 / 想定レジーム / Pine 実装粒度を整理する
- [ ] shortlist doc を更新または新設する

### Phase 2: RED

- [ ] repo 本体コードや config schema を触る場合のみ failing test を追加する

### Phase 3: GREEN

- [ ] 必要に応じて `config/backtest/strategy-presets.json` を更新する
- [ ] 必要に応じて `config/backtest/universes/mag7.json` を更新する
- [ ] 実行補助 runner を再利用または最小追加して batch 実行を通す
- [ ] raw results を `docs/references/backtests/` に保存する

### Phase 4: REFACTOR

- [ ] round1 と round2 の比較表を整える
- [ ] top strategies / rejected strategies / next experiments を見やすく整理する

### Phase 5: 検証と記録

- [ ] `npm test` を実行する
- [ ] `npm run test:e2e` を実行する
- [ ] `npm run test:all` を実行する
- [ ] summary doc と session log を更新する
- [ ] push 前の差分を確認する

## 完了条件

- 約 20 戦略の research が repo に durable に残っている
- round2 の raw results が `docs/references/backtests/` に保存されている
- round2 の summary doc と session log が作成されている
- round1 からの改善 / 変化点が読める
- 必要な config 変更が repo に反映されている
- 既存検証コマンドの結果が把握できている
- 変更が commit / push されている
