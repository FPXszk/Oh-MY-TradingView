# TradingView My Scripts 登録と作業ツリー整理計画

作成日時: 2026-04-21 10:18 JST

## 目的

- TradingView Desktop を WSL から再接続し、Public Library 上位 3 戦略を実際に My Scripts へ登録する
- 現在残っている未コミット差分の内容を確認し、push して問題ない変更だけを commit / push して作業ツリーをクリーンにする

## 現状整理

- Public top10 / US40 / night batch 切り替え自体は `main` に commit/push 済み
- ただし TradingView Desktop への実登録は、前回セッションでは CDP 未接続のため未完了
- ユーザー説明では `C:\\TradingView\\` 配下のショートカットが debug port 付きで起動する運用だった
- 現在の作業ツリーには `devinit.sh` / `scripts/dev/run-codex-pane.sh` / `tests/devinit.test.js` / `.codex/config.toml` と、別 active plan `codex-pane-startup-command-refresh_20260421_0928.md` が残っている
- この残差分は今回の TradingView 登録タスクとは別件なので、内容をレビューして「安全に push 可」かを明示的に判定する必要がある

## 変更・削除・作成するファイル

### 変更候補

- `src/connection.js`
  - 必要なら WSL から Windows 側 TradingView Desktop へ接続する host/port 解決を最小修正する
- `src/core/pine.js`
  - 必要なら My Scripts 保存確認用の観測点を追加する
- `scripts/backtest/save-public-top3-to-my-scripts.mjs`
  - 実運用で必要な引数や保存確認を最小追加する
- `devinit.sh`
- `scripts/dev/run-codex-pane.sh`
- `tests/devinit.test.js`
- `.codex/config.toml`
  - 上記 4 ファイルは、差分内容を確認して push 可否を判定し、必要なら別 commit にまとめる

### 作成候補

- `docs/exec-plans/completed/tradingview-my-scripts-registration-and-cleanup_20260421_1018.md`

### 削除

- なし

## 実装内容と影響範囲

- TradingView Desktop との接続先が Windows shortcut 起動前提へ寄る可能性がある
- Pine の保存導線に追加の確認処理を入れる場合、通常 compile/smart-compile フローにも影響する
- devinit 系差分を push する場合、ローカル開発起動フローが変わるため、内容レビューと最低限のテストが必要

## テスト戦略

- RED
  - TradingView 保存確認に不足があれば pure helper / unit test を追加して失敗させる
  - devinit 系の差分が未テストなら `tests/devinit.test.js` を先に失敗させる
- GREEN
  - TradingView 接続・保存確認に必要な最小修正を実装する
  - devinit 系は既存 plan の想定どおりテストを通す
- REFACTOR
  - 接続先解決や保存確認の重複だけを整理する

## 検証コマンド

- `node --test tests/pine.smart-compile.test.js tests/devinit.test.js`
- `npm test`
- `node scripts/backtest/save-public-top3-to-my-scripts.mjs`
- `git --no-pager diff -- devinit.sh scripts/dev/run-codex-pane.sh tests/devinit.test.js .codex/config.toml`
- `git --no-pager status -sb`

## リスクと注意点

- Windows 側 TradingView の shortcut 起動は WSL から直接再現できない場合があり、そのときは既存の Windows 運用前提を壊さない最小修正に留める
- My Scripts 保存は UI 文言やモーダル状態に依存するため、保存済みの確認点を増やし過ぎると brittle になりやすい
- devinit 系差分は別件のため、中身を読んで unsafe と判断したら commit/push せずユーザーへ返す
- `.codex/config.toml` は repo 方針や個人環境差分を含み得るので、内容確認なしで push しない

## スコープ外

- Public top10 の再選定や別戦略の追加
- night batch 本体の再設計
- 無関係なローカル設定の棚卸し

## 実装ステップ

- [ ] 未コミット差分と active plan の内容を確認し、push 可否の判定材料を揃える
- [ ] TradingView Desktop の接続先を復旧し、上位 3 戦略の My Scripts 保存を実行する
- [ ] 保存確認に不足があれば RED -> GREEN で最小修正を入れる
- [ ] devinit 系差分をレビューし、push してよい変更だけを commit 対象に絞る
- [ ] 必要なテストと実機確認を実行する
- [ ] 計画を `docs/exec-plans/completed/` へ移し、必要な commit / push を行う
