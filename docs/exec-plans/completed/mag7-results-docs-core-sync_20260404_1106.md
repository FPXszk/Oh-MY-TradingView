# Mag7 バックテスト結果 docs 整備と core strategy 明文化

## 目的

Mag7 向け 10 戦略 × 7 銘柄のバックテスト結果を、session artifact 依存ではなく repo 内の durable docs として残す。あわせて、今回の実測で特に強かった上位 3 戦略を今後の改善対象である **core strategies** として明文化し、将来この repo を読む CLI / AI が参照しやすい docs 導線を整える。

## 既存 plan との切り分け

- `docs/exec-plans/active/mag7-strategy-study_20260404_0934.md` は research / preset / generic runner 実装まで含む広い計画。
- 今回は **結果の durable 化 / docs 入口整理 / session log 永続化 / commit & push** に限定する。
- Pine 戦略実装や CLI / MCP の一般化は今回のスコープに含めない。

## 対象ファイル

### 新規作成

- `docs/references/backtests/mag7-backtest-results_20260404.json`
- `docs/research/mag7-backtest-results_2015_2025.md`
- `docs/working-memory/session-logs/mag7-backtest-session-summary_20260404_1106.md`

### 更新

- `docs/DOCUMENTATION_SYSTEM.md`
- `docs/research/mag7-strategy-shortlist_2015_2025.md`
- `README.md` （必要な場合のみ、docs 導線に明らかな不足があるとき）

### 計画ファイル移動

- 完了時に本ファイルを `docs/exec-plans/completed/` へ移動する

### session artifact / 補助メモ

- `~/.copilot/session-state/fa0aeefc-5de4-4e4e-aa8e-7b42d43ff69b/plan.md`
- `~/.copilot/session-state/fa0aeefc-5de4-4e4e-aa8e-7b42d43ff69b/files/mag7-backtest-results.json`

## 実装内容

### 1. raw results の durable 化

- session artifact の `mag7-backtest-results.json` を `docs/references/backtests/` に保存する
- raw snapshot として扱い、数値の正本を明確化する
- 70 run すべてが含まれていることを保存前後で確認する

### 2. 人間 / CLI / AI 向けの結果サマリ doc 追加

- `docs/research/mag7-backtest-results_2015_2025.md` を作成する
- 含める内容:
  - 実行条件
  - 対象戦略と対象銘柄
  - 戦略別の結果一覧
  - 銘柄別の傾向
  - 上位 / 下位コンボ
  - 解釈上の注意点
- 上位 3 戦略を **core strategies** として明記する

### 3. 既存 shortlist doc の接続更新

- `docs/research/mag7-strategy-shortlist_2015_2025.md` に以下を追記する
  - 70/70 実行済みであること
  - 結果 summary doc / raw JSON へのリンク
  - top3 core strategies

### 4. docs 入口の更新

- `docs/DOCUMENTATION_SYSTEM.md` に docs の役割分担を明記する
  - `research/`: 解釈・推奨・意思決定
  - `references/backtests/`: raw durable artifacts
  - `working-memory/session-logs/`: セッション要約と判断経緯
- 入口から今回追加 doc へ辿れるようリンクする

### 5. セッションログの永続化

- `docs/working-memory/session-logs/` に今回までの会話要約を残す
- 含める内容:
  - 依頼背景
  - 調査した 10 戦略
  - 実機 CDP 接続前提
  - docs 同期の実施
  - 70/70 バックテスト完走
  - core strategy の選定理由
  - 次の改善候補

### 6. git 状態の整理と push

- remote / local の差分を確認し、必要なら fast-forward / rebase を判断する
- docs 変更のみを選択的に stage する
- commit 後に push し、worktree を clean に近い状態へ整える
- unrelated な既存変更は巻き込まない

## 影響範囲

- docs 構造の参照導線
- research / references / working-memory の役割分担
- 今後の戦略改善の優先順位付け
- repo 内でのバックテスト結果の durable 再参照性

## スコープ外

- generic backtest runner の repo 本実装
- CLI / MCP からの汎用 backtest 実行機能
- 戦略ロジックや Pine source の改善
- 70 件結果の再実行
- top3 以外の戦略改善ロードマップ詳細化

## TDD / 検証方針

### RED

- 現状 docs に 70 run の durable raw snapshot が存在しないことを確認する
- 現状 docs に top3 core strategies の明示的な集約先が無いことを確認する
- `DOCUMENTATION_SYSTEM.md` から今回の成果物へ直接辿れないことを確認する

### GREEN

- raw JSON を保存する
- summary doc を作成する
- shortlist / documentation system / session log を更新する

### REFACTOR

- 重複説明を減らし、raw / summary / session log の責務を分ける
- strategy id, 表示名, core strategy 表記を統一する

## 検証コマンド

- `git --no-pager diff -- docs README.md`
- `git --no-pager status --short`
- `rg "sma-200-trend-filter|donchian-breakout|supertrend-atr" docs`
- `rg "mag7-backtest-results_2015_2025|mag7-backtest-results_20260404|session-logs" docs`
- `node -e "const fs=require('fs');const p='docs/references/backtests/mag7-backtest-results_20260404.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));if((j.runs||[]).length!==70) process.exit(1);console.log('runs',j.runs.length)"`
- `npm test`
- `npm run test:e2e`

## リスク

- raw JSON と summary doc の数値不整合
- core strategy の id / 表示名の表記揺れ
- docs を増やしても入口から辿れず、CLI / AI が使いにくいままになること
- remote / local の履歴差分により push 前調整が必要になること
- 既存の未追跡変更を誤って commit に含めること

## 実装ステップ

- [ ] session artifact の 70 run 結果を確認し、保存対象を確定する
- [ ] `docs/references/backtests/mag7-backtest-results_20260404.json` を作成する
- [ ] `docs/research/mag7-backtest-results_2015_2025.md` を作成する
- [ ] 上位 3 戦略を core strategies として summary doc に明記する
- [ ] `docs/research/mag7-strategy-shortlist_2015_2025.md` に結果導線と core strategies を追記する
- [ ] `docs/DOCUMENTATION_SYSTEM.md` に役割分担と導線を追記する
- [ ] `docs/working-memory/session-logs/` に会話要約ログを追加する
- [ ] docs のリンク・strategy id・70 run 件数を検証する
- [ ] `npm test` と `npm run test:e2e` を実行して既存コマンドで確認する
- [ ] 本 plan を `completed/` に移動し、docs だけを commit / push する
