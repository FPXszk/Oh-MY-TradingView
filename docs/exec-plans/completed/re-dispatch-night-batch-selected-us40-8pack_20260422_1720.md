# selected-us40-8pack 再 dispatch 計画

作成日時: 2026-04-22 17:20 JST

## 目的

`Night Batch Self Hosted` を clean state から再度最初から実行する。

ユーザー依頼は「いまのやつを止めて新たに始める」だが、確認時点で直近 run `24767182612` はすでに `completed/success` のため、実際の作業は **停止不要で新規 dispatch** になる。

## 現状認識

- 直近 `Night Batch Self Hosted` run `24767182612` は `success`
- その前の run `24765313213` も `success`
- 画面上で詰まり要因だった未保存 Pine モーダルは解消済み
- 既定 config `config/night_batch/bundle-foreground-reuse-config.json` は `selected-us40-8pack` を向いている

## 変更・確認対象ファイル

- 作成: `docs/exec-plans/active/re-dispatch-night-batch-selected-us40-8pack_20260422_1720.md`
- 確認: `config/night_batch/bundle-foreground-reuse-config.json`
- 確認: `config/backtest/campaigns/current/selected-us40-8pack.json`
- 確認: `.github/workflows/night-batch-self-hosted.yml`
- 変更の可能性あり:
  - `docs/exec-plans/active/dispatch-selected-us40-8pack_20260422_1655.md`
  - 必要なら実行後の報告用 docs

## スコープ

### 含む

- 再 dispatch 前の clean state 確認
- `Night Batch Self Hosted` の新規 dispatch
- 新しい run ID の取得
- queue / in_progress までの初期状態確認

### 含まない

- 完走までの長時間監視
- 無関係な workflow や campaign 実装変更
- 新しい strategy / universe の変更

## 実装方針

1. 既定 config と画面 state が再 dispatch 可能であることを確認する
2. `gh workflow run night-batch-self-hosted.yml` で新規 run を作る
3. 新しい run ID を取得し、少なくとも queue 脱出まで確認する
4. 即時失敗した場合のみ、その場で原因特定に切り替える

## TDD / 検証戦略

今回は運用実行であり、コード変更前提ではない。

### RED

- dispatch できない
- workflow が queue から進まない
- 初期 step で即失敗する

### GREEN

- 新しい `Night Batch Self Hosted` run が生成される
- `selected-us40-8pack` 前提の clean state で開始される
- run ID と初期状態を説明できる

### REFACTOR

- 実行結果に応じて必要最小限の follow-up のみ整理する

## 検証コマンド

```bash
gh workflow run night-batch-self-hosted.yml
```

```bash
gh run list --workflow night-batch-self-hosted.yml --limit 5 --json databaseId,status,conclusion,createdAt,headSha,url
```

```bash
gh run view <run_id>
```

## リスク / 注意点

- self-hosted runner / TradingView Desktop / 9223 bridge 状態に依存する
- repo に未追跡 artifact (`artifacts/observability/`, `artifacts/screenshots/`) があるため、不要に触らない
- 既存 active plan `dispatch-selected-us40-8pack_20260422_1655.md` と目的が近いので、差分は「再 dispatch 実行」に限定する

## 実装ステップ

- [ ] 直近 run 状態と clean state を再確認する
- [ ] `gh workflow run night-batch-self-hosted.yml` で新規 dispatch する
- [ ] 新しい run ID を取得する
- [ ] queue / in_progress への遷移を確認する
- [ ] 状態をユーザーへ報告する

## 完了条件

- 新しい `Night Batch Self Hosted` run が作成される
- 停止不要だった理由を説明できる
- 新しい run ID と初期状態を説明できる
