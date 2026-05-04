# Daily Screener を self-hosted / ローカル保存専用に切り替える計画

## 目的

現在 GitHub-hosted runner (`ubuntu-latest`) で動いている日次スクリーニングを、self-hosted runner 上で実行する構成に切り替える。あわせて、GitHub への自動 commit / push を廃止し、結果は self-hosted マシン上の live checkout にだけ残す。

## 前提整理

- 現状の daily screener は `.github/workflows/daily-screener.yml` で `runs-on: ubuntu-latest`
- 現状の backtest は `.github/workflows/night-batch-self-hosted.yml` で `runs-on: [self-hosted, windows]`
- 現在の self-hosted runner が 1 台なら、backtest と screener が同時刻に重なった場合は **どちらか一方が queue 待ち** になる
- 今回の要求は「GitHub Actions 自体を完全撤去」ではなく、**self-hosted での手動実行を残しつつ、自動 schedule と自動 push を止める** という解釈で進める
- 「ローカルにだけ結果を出す」は、self-hosted runner がチェックアウトしている working tree 上の `docs/reports/screener/daily-ranking.md` を更新することを指す

## 変更・作成・削除するファイル

| ファイル | 操作 | 内容 |
|---|---|---|
| `.github/workflows/daily-screener.yml` | MODIFY | `schedule` を削除。`runs-on` を self-hosted / windows に変更。必要最小限の手動 `workflow_dispatch` のみ残す |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | Git commit / push 処理を削除し、Markdown 生成だけで終了する |
| `tests/daily-screener-report.test.js` | MODIFY | スクリプトが import 時に副作用なく読み込める前提を維持しつつ、local-only 運用でも Markdown 生成が成立することを固定する |
| `tests/repo-layout.test.js` または workflow 関連テスト | MODIFY if needed | workflow 定義の前提が既存テストにある場合のみ追随する |
| `docs/exec-plans/active/self-hosted-local-only-daily-screener_20260504_2021.md` | CREATE | 本計画 |

## 実装内容

### 1. workflow 実行基盤の変更

- `daily-screener.yml` の `runs-on` を self-hosted 側に合わせる
- 既存 night batch と同じ `self-hosted, windows` ラベル構成を基本候補にする
- `schedule` は削除し、当面は `workflow_dispatch` のみ残す

### 2. git 操作の廃止

- `scripts/screener/run-fundamental-screening.mjs` から以下を除去する
  - `git config`
  - `git add`
  - `git commit`
  - `git push`
- 成功条件を「`docs/reports/screener/daily-ranking.md` が生成されること」に絞る

### 3. self-hosted 1台運用での挙動を明確化

- 並列実行ではなく queue 実行であることを workflow 設計上の前提として残す
- backtest 実行中に screener を dispatch した場合は、backtest 完了後に screener が走る想定
- 逆も同様

### 4. ローカル手動実行の入口を明文化

- 手動実行コマンドは以下を前提にする
  - 日次レポート形式を生成: `node scripts/screener/run-fundamental-screening.mjs`
  - 生の CLI 出力確認: `node src/cli/index.js screener fundamental --limit 20 --with-yahoo`
- 実装後、最終報告でこの2つの違いを簡潔に整理する

## 実装ステップ

- [x] `.github/workflows/daily-screener.yml` を self-hosted / manual-only へ変更する
- [x] `scripts/screener/run-fundamental-screening.mjs` から git 操作を削除する
- [x] 既存テストへの影響を確認し、必要なら workflow / layout 関連テストを調整する
- [x] `tests/daily-screener-report.test.js` など関連テストを更新する
- [x] 対象テストを実行する
- [x] 必要範囲で `npm test` を実行し、今回変更に直接関係する回帰がないことを確認する
- [x] 計画を `completed/` に移し、Conventional Commit でコミットする

## テスト戦略

### RED

- 現状は workflow が GitHub-hosted で schedule 有効、かつスクリプト末尾で git push まで走る

### GREEN

- workflow は self-hosted + workflow_dispatch のみ
- スクリプトは Markdown を生成して正常終了するだけ
- 既存 Markdown 生成テストが通る

### REFACTOR

- 今回は実行経路の変更だけに留め、スコアロジックやレポート内容そのものは変えない

## 検証コマンド

```bash
node --test tests/daily-screener-report.test.js tests/fundamental-screener.test.js
node scripts/screener/run-fundamental-screening.mjs
```

必要に応じて:

```bash
npm test
```

## 影響範囲

- 影響あり
  - daily screener の GitHub Actions 実行基盤
  - self-hosted runner 上の queue 待ち挙動
  - daily screener 実行後の成果物保存先
- 影響なし
  - fundamental screener のスコア算出ロジック
  - backtest workflow 本体
  - market-intel / Yahoo / TradingView scanner の取得処理

## リスク

1. self-hosted runner のラベルが `self-hosted, windows` 以外で運用されている場合、workflow が拾われない
2. live checkout へのファイル更新は残るため、runner マシン側 working tree が dirty になる
3. `npm ci` を self-hosted runner 上で毎回実行する構成は維持されるため、依存インストール時間は残る
4. queue 待ち前提のため、backtest が長時間動いている間は screener 手動実行がすぐには始まらない

## スコープ外

- self-hosted runner の複数台構成
- screener 結果の DB 保存や別ディレクトリ保管
- Windows タスクスケジューラ / cron への移行
- backtest と screener の優先度制御

## 競合確認

- active plan は `repo-structure-align-and-archive-rules_20260424_2015.md` と `run-night-batch_20260429_2344.md`
- 今回の daily screener 実行基盤変更とは直接競合しない

## 実施メモ

- 関連テスト `tests/daily-screener-report.test.js` と `tests/fundamental-screener.test.js` は通過
- `npm test` は今回も既存の `tests/capture.test.js` / `tests/devinit.test.js` / `tests/night-batch.test.js` / `tests/strategy-live-retired-diff.test.js` で失敗または cancel が残る
- 上記 4 件は今回変更ファイルとは無関係で、今回の workflow / local-only 変更に起因する新規失敗は確認されていない
