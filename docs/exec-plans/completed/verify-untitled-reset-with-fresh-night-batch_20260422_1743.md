# 無題 Pine 切替修正の実機確認計画

作成日時: 2026-04-22 17:43 JST

## 目的

直前に `main` へ反映した `f68c237 fix: reset pine editor to untitled before backtests` が、実機の `Night Batch Self Hosted` 実行で効いていることを確認する。

確認したい主点は以下。

- workflow 開始時に保存済み Pine Script ではなく `名前なしのスクリプト` へ切り替わること
- `保存しますか？` モーダルが再発しないこと
- `Night Batch Self Hosted` が clean state から起動すること

## 現状認識

- 修正 commit `f68c237` は `origin/main` まで push 済み
- 直近 `Night Batch Self Hosted` run `24768236797` はまだ `in_progress`
- repo には未追跡の観測 artifact
  - `artifacts/observability/`
  - `artifacts/screenshots/`
  が残っているため、勝手に削除しない

## 変更・確認対象ファイル

### 作成

- `docs/exec-plans/active/verify-untitled-reset-with-fresh-night-batch_20260422_1743.md`

### 確認

- `src/core/backtest.js`
- `docs/exec-plans/completed/untitled-pine-reset-before-night-batch_20260422_1736.md`
- `.github/workflows/night-batch-self-hosted.yml`
- `config/night_batch/bundle-foreground-reuse-config.json`

### 変更の可能性あり

- 原則なし
- 実機確認で不具合を再発した場合のみ、その原因に直結する最小差分へ切り出す

## スコープ

### 含む

- 現在進行中 run `24768236797` の扱いを決める
- 必要なら run を停止する
- `Night Batch Self Hosted` を修正版で fresh dispatch する
- 実機画面を CDP 経由で取得し、`名前なしのスクリプト` / モーダル非表示を確認する
- run ID と初期状態を報告する

### 含まない

- 完走までの長時間監視
- 無関係な workflow / strategy / universe の変更
- artifact の整理や削除

## 実装方針

1. 現在進行中 run `24768236797` が残っているので、fresh 実機確認の前提を揃えるため停止する
2. 修正版 `main` で `Night Batch Self Hosted` を新規 dispatch する
3. 実行直後に CDP 経由の screenshot / snapshot を取得する
4. 画面上で
   - `名前なしのスクリプト`
   - `保存しますか？` モーダル非表示
   - 保存済み script を直接編集中でないこと
   を確認する
5. 必要なら初期段階の run 状態も `gh run view` で併せて確認する

## TDD / 検証戦略

今回は運用確認タスクであり、新規コード変更前提ではない。

### RED

- `保存しますか？` モーダル再発
- `名前なしのスクリプト` に切り替わらない
- 進行中 run の混在で挙動が判別できない

### GREEN

- fresh run 上で `名前なしのスクリプト` を確認できる
- 保存確認モーダルが出ていない
- workflow が初期 step を進行する

### REFACTOR

- 問題が再発した場合のみ、別修正 plan に切り出す

## 検証コマンド

```bash
gh run cancel 24768236797
```

```bash
gh workflow run night-batch-self-hosted.yml
```

```bash
gh run list --workflow night-batch-self-hosted.yml --limit 5 --json databaseId,status,conclusion,createdAt,headSha,url
```

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js observe snapshot
```

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js capture --output verify-untitled-reset.png
```

## リスク / 注意点

- self-hosted runner の停止反映には時間差がある可能性がある
- 実行直後の画面取得タイミング次第で、まだ切替前の瞬間を見てしまう可能性がある
- その場合でも、snapshot を複数回ではなく最小限で取り、観測と run 状態をセットで判断する

## 実装ステップ

- [ ] 進行中 run `24768236797` を停止し、fresh 実行の前提を揃える
- [ ] `Night Batch Self Hosted` を新規 dispatch する
- [ ] 新しい run ID を取得する
- [ ] CDP 経由で screenshot / snapshot を取得する
- [ ] 画面上で `名前なしのスクリプト` とモーダル非表示を確認する
- [ ] 結果をユーザーへ報告する

## 完了条件

- 旧 run の影響を受けない fresh run が開始される
- 実機画面で `名前なしのスクリプト` が確認できる
- `保存しますか？` モーダルが出ていない
- 新しい run ID と初期状態を説明できる
