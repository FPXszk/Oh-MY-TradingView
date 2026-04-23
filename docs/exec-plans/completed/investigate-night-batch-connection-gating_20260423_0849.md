# 最新バックテストワークフロー接続失敗調査計画

作成日時: 2026-04-23 08:49 JST

## 目的

最新のバックテスト系 GitHub Actions workflow run の失敗原因を調査し、特に「TradingView / CDP 接続が未確立でも workflow が先へ進んでしまうのか」を事実ベースで確認する。今回は原因調査と仮説整理までを対象とし、修正実装は含めない。

## 既存 active plan との関係

- 現在 `docs/exec-plans/active/` に他の active plan は存在しない
- 既存 completed plan に night-batch / workflow 修正履歴はあるが、今回は「最新 run の失敗要因確認」と「接続 gating の実態確認」に絞る

## 変更・削除・作成するファイル

- 作成: `docs/exec-plans/active/investigate-night-batch-connection-gating_20260423_0849.md`

## 確認対象ファイル・対象物

- 確認: GitHub Actions の最新失敗 backtest/night-batch workflow run
- 確認: `.github/workflows/night-batch-self-hosted.yml`
- 確認: `scripts/windows/run-night-batch-self-hosted.cmd`
- 確認: `python/night_batch.py`
- 確認: 接続状態判定に関わる config (`config/night_batch/*.json` のうち対象 run が使うもの)
- 必要に応じて確認: `src/cli/index.js`, `src/connection.js`, 関連 completed plan

## スコープ

### 実施すること

- 最新失敗 run を特定する
- 失敗 job / step と実際のログを確認する
- readiness 診断ステップの失敗が workflow を止める条件になっているかを確認する
- 接続未確立でも `run-night-batch-self-hosted.cmd` と `python/night_batch.py smoke-prod` に進む条件を確認する
- 「接続失敗そのもの」なのか「接続失敗を見逃して後段で落ちている」のかを切り分ける
- 事実・推定・追加確認点を分けて報告する

### 実施しないこと

- ユーザー承認なしで workflow / スクリプト / 本番コードを変更しない
- 根因未確定のまま周辺の別障害まで広げない
- 修正実装、テスト追加、コミット、push は行わない

## 実装内容と影響範囲

- 調査対象は night-batch 系 self-hosted workflow とその起動ラッパー
- 主な影響範囲の評価対象:
  - workflow の readiness / gating 条件
  - Windows 起動ラッパーから WSL 実行への引き渡し
  - `python/night_batch.py smoke-prod` 側の接続前提チェック
  - 対象 config の `runtime.startup_check_*`, `runtime.host`, `runtime.port`

## 現時点の予備所見

- `.github/workflows/night-batch-self-hosted.yml` の `Readiness diagnostics` は `continue-on-error: true`
- 同ステップ内でも接続失敗時に `|| echo ... UNREACHABLE` / `|| echo ... FAILED` で握りつぶしている
- そのため、少なくとも workflow 定義上は readiness の失敗だけで後続の `Run smoke gate and foreground production` を止めない構造に見える
- ただし最終的に本当に「接続未確立のまま後段へ進行した」と言えるかは、最新 run のログと `python/night_batch.py` 側の事前チェックを見て確定する必要がある

## TDD / 検証戦略

今回の依頼は調査タスクであり、修正実装は前提にしない。

### RED

- GitHub Actions の最新失敗 run を既存の失敗事実として扱う
- 必要に応じて失敗コマンド相当をローカルで再実行し、接続未確立時の落ち方を確認する

### GREEN

- 本計画の範囲外
- 修正が必要と判断した場合は、別途修正計画を作成して承認を得る

### REFACTOR

- 本計画の範囲外

### カバレッジ方針

- 調査のみのため coverage 目標の対象外
- 修正に進む場合に unit / integration / E2E の追加方針を別計画で定義する

## 想定コマンド

```bash
gh run list --limit 10
```

```bash
gh run view <run-id>
```

```bash
gh run view <run-id> --log-failed
```

```bash
sed -n '1,240p' .github/workflows/night-batch-self-hosted.yml
```

```bash
sed -n '1,240p' scripts/windows/run-night-batch-self-hosted.cmd
```

```bash
sed -n '1,260p' python/night_batch.py
```

必要に応じて:

```bash
rg -n "startup_check|host|port|smoke-prod|status|connect|readiness" python/night_batch.py src config/night_batch
```

## リスク / 注意点

- 最新失敗 run が外部環境依存の場合、ローカルだけでは再現しきれない可能性がある
- self-hosted runner 上の Windows 側状態と WSL 側状態がずれていると、表面上の port 到達性だけでは十分でない
- readiness 診断と本番実行が別の host/port を見ている場合、見かけ上「接続成功なのに失敗」または「接続失敗なのに進行」に見える可能性がある
- `gh` 取得ログだけで足りない場合、Artifacts や要約ファイルまで見る必要がある

## 実装ステップ

- [ ] `gh run list --limit 10` で最新失敗 run を特定する
- [ ] 対象 run の workflow 名、branch、event、SHA、失敗時刻を記録する
- [ ] `gh run view <run-id>` と `gh run view <run-id> --log-failed` で失敗 job / step と接続系ログを確認する
- [ ] `.github/workflows/night-batch-self-hosted.yml` の readiness 診断と後続 step の gating 条件を確認する
- [ ] `scripts/windows/run-night-batch-self-hosted.cmd` と `python/night_batch.py` を確認し、接続前提チェックの有無と失敗タイミングを整理する
- [ ] 必要なら対象 config の host/port 設定を確認し、診断先と実行先の差分を確認する
- [ ] 調査結果を「事実」「推定」「不足情報」「修正要否」に分けて報告する

## 完了条件

- 最新失敗 run が一意に特定されている
- 接続未確立時に workflow が止まるのか、後段へ進むのかが説明できる
- 失敗 job / step と根因候補が説明できる
- 修正が必要なら、どこに gating を追加または強化すべきか判断できる粒度まで整理されている
