# selected-us40-8pack 実行計画

作成日時: 2026-04-22 16:55 JST

## 目的

直前に既定化した `selected-us40-8pack` campaign を使って、`public-top10-us-40` universe に対する 8 戦略 x 40 銘柄の night batch 実行を開始し、run ID と起動状態を確認できるところまで進める。

## 現状認識

- `config/backtest/campaigns/current/selected-us40-8pack.json` は存在し、40 x 8 matrix / smoke=`SPY` / full=`40 symbols` になっている
- `config/night_batch/bundle-foreground-reuse-config.json` の `bundle.us_campaign` はすでに `selected-us40-8pack` を指している
- 直前の修正 `da10cc4` を push 済みで、新しい `CI` run `24767026498` が `queued` 状態
- 直近成功の `Night Batch Self Hosted` run は `24765313213`

## 変更・確認対象ファイル

- 作成: `docs/exec-plans/active/dispatch-selected-us40-8pack_20260422_1655.md`
- 確認: `config/backtest/campaigns/current/selected-us40-8pack.json`
- 確認: `config/night_batch/bundle-foreground-reuse-config.json`
- 確認: `.github/workflows/night-batch-self-hosted.yml`
- 必要時のみ変更候補:
  - `docs/reports/night-batch-self-hosted-run*.md`
  - workflow 実行中に露出した不具合に直結する最小差分ファイル

## スコープ

### 含む

- `selected-us40-8pack` を既定 config で dispatch する
- dispatch 後の run ID / queue / 開始状態を確認する
- 失敗した場合は失敗箇所を特定し、必要なら次の修正計画へつなぐ

### 含まない

- 実行中 campaign の最終完走待ち
- 無関係な strategy / universe 変更
- 事前に不要な再設計や追加実装

## 実装方針

1. workflow と既定 config が `selected-us40-8pack` を向いていることを最終確認する
2. `gh workflow run` で `Night Batch Self Hosted` を dispatch する
3. 生成された run を `gh run list` / `gh run view` で追い、少なくとも queue 脱出と初期 step の健全性を確認する
4. もし起動直後に失敗した場合は、その場で root cause を切り分けて別修正計画へ移る

## TDD / 検証戦略

今回の主作業は運用実行であり、コード変更前提ではない。

### RED

- workflow dispatch 失敗
- queue から進まない
- smoke gate / startup check の即時失敗

### GREEN

- `Night Batch Self Hosted` が `selected-us40-8pack` を使って起動する
- run ID と初期状態を確認できる

### REFACTOR

- 実行結果に応じて必要最小限の follow-up plan を切る

## 検証コマンド

```bash
gh workflow run night-batch-self-hosted.yml
```

```bash
gh run list --limit 5 --json databaseId,name,status,conclusion,headSha,event,createdAt,url
```

```bash
gh run view <run_id>
```

## リスク / 注意点

- self-hosted runner 側の TradingView 状態や 9222/9223 bridge 状態に依存する
- 直前 push の `CI` がまだ `queued` なので、runner 混雑や workflow 競合の有無を見ながら進める必要がある
- 実行開始後の詳細な進捗監視は時間を要するため、今回は「起動確認」までを主目的に置く

## 実装ステップ

- [ ] `selected-us40-8pack` と既定 night batch config の整合を最終確認する
- [ ] `gh workflow run night-batch-self-hosted.yml` で workflow を dispatch する
- [ ] 新しい run ID を取得し、queue / in_progress への遷移を確認する
- [ ] 初期 step が失敗した場合は失敗箇所を記録し、必要なら別の修正計画へ切り出す
- [ ] 状態確認結果をユーザーへ報告する

## 完了条件

- `selected-us40-8pack` を対象とする `Night Batch Self Hosted` run が新規に作成される
- run ID と初期状態を説明できる
- 即時失敗した場合も、次に何を直すべきかを特定できる
