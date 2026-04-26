# ウォッチリスト導線 README 反映とセッションログ・push 実装計画

## 概要

前タスクで実装・実運用した電力関連ウォッチリスト登録導線を、README に再現可能な runbook として残す。あわせて、今回の watchlist 修正と電力ウォッチリスト構築の内容を session log に記録し、未コミット変更をレビューして main へ commit / push する。

## 変更・作成・移動ファイル

| ファイル | 種別 | 内容 |
|---|---|---|
| `docs/exec-plans/active/watchlist-readme-session-log-push_20260426_2200.md` | 作成 | 本タスクの実装計画 |
| `README.md` | 変更 | watchlist 初回登録導線を再現可能な手順として追記 |
| `docs/sessions/session_20260426_2200.md` | 作成 | 今回の watchlist 修正・電力ウォッチリスト構築・README 反映の session log |
| `docs/exec-plans/active/power-watchlist-onramp-and-twitter-sourcing_20260426_2046.md` | 移動 | commit 時に `docs/exec-plans/completed/` へ移動 |
| `docs/exec-plans/active/watchlist-readme-session-log-push_20260426_2200.md` | 移動 | commit 時に `docs/exec-plans/completed/` へ移動 |
| `docs/references/design-ref-llms.md` | 既存変更を含めて commit | 前タスクで追加した外部参照ログを今回の commit に含める |
| `src/core/workspace.js` | 既存変更を含めて commit | watchlist DOM 導線修正を今回の commit に含める |
| `tests/workspace.test.js` | 既存変更を含めて commit | watchlist DOM 導線修正のテストを今回の commit に含める |

## 実装内容と影響範囲

- README: WSL + TradingView Desktop 前提で、CDP 接続確認、X データ取得、候補抽出、market cap 順の並び決定、watchlist 投入までを CLI ベースで辿れるようにする
- Session log: 何を直したか、どの watchlist を作成したか、どの銘柄順で投入したか、どの検証が通ったかを後追いできる状態にする
- Git: 既存の未コミット変更を今回の documentation task と一緒に整理し、関連 exec-plan を completed へ移して main に push する

## スコープ外

- 新しい watchlist 機能追加
- 電力以外のテーマ向け runbook 追加
- `artifacts/observability/` の内容整理や commit
- 既存 `npm test` ハング要因の切り分け・修正

## 実装ステップ

- [ ] README の既存 workspace / setup / CLI 節を確認し、watchlist 再現手順の追記位置を決める
- [ ] README に、今回の電力関連 watchlist 導線を再現可能な順序で追記する
- [ ] session log を新規作成し、watchlist 修正・銘柄選定・README 追記・検証結果を記録する
- [ ] 既存の watchlist 関連変更を含めて差分をレビューし、不要ファイルを commit 対象から除外する
- [ ] 関連テスト / 検証コマンドを実行する
- [ ] active exec-plan を completed へ移し、Conventional Commit で commit / push する

## テスト戦略

- README / session log 自体には新規テストを追加しない
- 既存の watchlist 実装変更を含めて commit するため、`tests/workspace.test.js` は最低限再実行する
- repository layout への影響確認として `tests/repo-layout.test.js` も再実行する
- 追加コードが必要になった場合のみ RED -> GREEN -> REFACTOR でテストを先に更新する

## 検証コマンド

- `node --test tests/workspace.test.js tests/repo-layout.test.js`
- `git --no-pager diff -- README.md docs/sessions/session_20260426_2200.md docs/references/design-ref-llms.md src/core/workspace.js tests/workspace.test.js`
- `git --no-pager status --short`

## リスクと注意点

- 現在 `main` に未コミット変更が複数あるため、README だけでなく前タスクの watchlist 修正も一緒に整理して commit する必要がある
- `docs/exec-plans/active/` には完了済みだが未移動の plan が残っているため、commit 時に completed へ正しく移す必要がある
- `artifacts/observability/` は今回依頼範囲に含まれないため、誤って commit しないように注意する

## 競合確認

- `docs/exec-plans/active/repo-structure-align-and-archive-rules_20260424_2015.md` は repo 構造と archive ルール整備の計画であり、本件の README / session log / watchlist 修正 commit とは競合しない
- `docs/exec-plans/active/power-watchlist-onramp-and-twitter-sourcing_20260426_2046.md` は本件と直接連続する前タスクの完了済み plan であり、今回の commit で completed へ移す対象として扱う
