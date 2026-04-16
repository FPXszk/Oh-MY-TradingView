# 実装計画: 接続前提ドキュメント同期 (20260404_1014)

## 目的
前回実機で成功していた接続前提を、現在の有効な実環境事実に合わせてドキュメントへ反映する。あわせて、主要ドキュメント間の記述不整合を解消し、最後にドキュメント更新のみを安全に commit / push する。

## 背景整理

- 参照元として `docs/exec-plans/completed/nvda-strategy-attach-recovery_20260404_1705.md` に前回実機成功記録がある
- 実機成功コマンドは以下
  - `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status`
  - `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest nvda-ma`
- 直近でも `http://172.31.144.1:9223/json/list` は応答あり
- `localhost:9222` / `localhost:9223` は接続拒否
- `README.md` は 9222 前提の説明が中心で、現時点で有効だった endpoint の具体例が弱い
- `docs/research/mag7-strategy-shortlist_2015_2025.md` の「現時点では CDP 未接続」は現状と不整合
- リポジトリ直下の `Oh-MY-TradingView.log` は空であり、更新対象に含めない

## 更新対象ファイル一覧

### 新規作成

- `docs/exec-plans/active/docs-sync-cdp-assumptions_20260404_1014.md`

### 更新予定

- `README.md`
- `docs/research/mag7-strategy-shortlist_2015_2025.md`

### 参照のみ

- `docs/exec-plans/completed/nvda-strategy-attach-recovery_20260404_1705.md`

### 原則更新しない

- `Oh-MY-TradingView.log`
- コード本体 (`src/`, `tests/`, `config/` など)

## ドキュメント修正方針

### 1. `README.md`

**合わせる事実**

- 実環境で到達確認できた CDP endpoint は `172.31.144.1:9223`
- `localhost:9222` / `localhost:9223` は直近確認では使えない
- `status` / `backtest nvda-ma` の成功コマンド実績がある

**修正内容**

- 9222 前提の説明をそのまま残す場合でも、「環境依存のデフォルト例」であることを明確化する
- 実機で有効だった接続例として `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223` を明示する
- `status` と `backtest nvda-ma` の実行例を copy-paste 可能な形で追記する
- 「まず `/json/list` で疎通確認する」流れを補強する
- localhost 前提を一般解のように読める箇所は、環境差分に注意を促す表現へ修正する

### 2. `docs/research/mag7-strategy-shortlist_2015_2025.md`

**合わせる事実**

- 「現時点では CDP 未接続」は現在の確認結果と不整合
- `172.31.144.1:9223` では応答がある

**修正内容**

- 当該記述を、現状に合う表現へ更新する
- 必要に応じて「直近確認時点では `172.31.144.1:9223` が有効」と時点付きで記述する
- 研究メモ本文の主題を壊さないよう、接続状態の注記だけを最小差分で直す

## 影響範囲

- 影響はドキュメントのみ
- CLI 実装・接続ロジック・テストコードは変更しない
- 利用者向けの接続手順、研究メモ上の現況記述、運用認識が主な影響対象

## ドキュメントレビュー観点

- 事実整合性
  - 実機成功記録と README / research doc の記述が一致しているか
- 時点表現の適切さ
  - 一時的に有効だった endpoint を普遍的な固定仕様として書いていないか
- 誤誘導防止
  - `localhost:9222` が常に使えるように読める説明が残っていないか
- 再現性
  - 記載コマンドがそのまま実行しやすいか
- スコープ遵守
  - 接続前提の同期に限定され、不要な機能説明や新規手順追加に広がっていないか
- ドキュメント間整合
  - README と research doc で現況が矛盾していないか
- 差分の純度
  - 文言調整のついでに無関係な編集を混ぜていないか

## テスト / 検証コマンド

### 接続事実の確認

- `curl --fail http://172.31.144.1:9223/json/list`
- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status`
- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest nvda-ma`

### 差分確認

- `git --no-pager diff -- README.md docs/research/mag7-strategy-shortlist_2015_2025.md docs/exec-plans/active/docs-sync-cdp-assumptions_20260404_1014.md`
- `git --no-pager status --short`

### 任意の補助確認

- `rg -n "9222|9223|CDP 未接続|172.31.144.1" README.md docs/`

## commit / push までの流れ

1. 作業前に worktree 状態を確認し、既存の未コミット差分を把握する
2. 計画書を `docs/exec-plans/active/` に保存する
3. `README.md` と research doc を最小差分で更新する
4. 接続事実確認コマンドを実行し、ドキュメント記載内容と整合することを確認する
5. 差分をレビューし、更新対象が docs のみに限定されていることを確認する
6. 対象ファイルのみを stage する
7. Conventional Commits に従って commit する
8. リモート push を実施する
9. 必要に応じて `gh` で反映確認する

## dirty worktree への配慮

- 作業開始前に既存差分を確認し、今回タスクと無関係な変更を巻き込まない
- `git add .` は使わず、対象ファイルを明示して stage する
- 空の `Oh-MY-TradingView.log` は対象外のまま維持する
- 既存の docs 差分があった場合は、今回変更と衝突しないかを先に確認する
- commit 前に `git --no-pager diff --cached` で staged 内容を再確認する

## 実装ステップ

- [ ] `docs/exec-plans/active/` に本計画書を保存する
- [ ] 作業前の worktree 状態を確認し、無関係な差分の有無を把握する
- [ ] `docs/exec-plans/completed/nvda-strategy-attach-recovery_20260404_1705.md` を参照し、記載する成功コマンドと事実を固定する
- [ ] `README.md` の CDP 接続説明を確認し、9222 前提で誤解を招く箇所を特定する
- [ ] `README.md` に `172.31.144.1:9223` の実機有効例、`status` / `backtest nvda-ma` 実行例、`/json/list` 疎通確認手順を反映する
- [ ] `docs/research/mag7-strategy-shortlist_2015_2025.md` の「CDP 未接続」記述を現況に合う表現へ更新する
- [ ] `rg` と `git diff` で関連記述の取りこぼし・不整合がないか確認する
- [ ] `curl` と CLI コマンドで、ドキュメントに記載した接続前提が再確認できることを検証する
- [ ] 変更差分をレビューし、時点依存の事実を過度に一般化していないことを確認する
- [ ] 対象ファイルのみを stage する
- [ ] `docs:` で commit する
- [ ] push 後に反映状況を確認する

## 完了条件

- `README.md` に、現在有効と確認できた接続前提と実行例が反映されている
- `docs/research/mag7-strategy-shortlist_2015_2025.md` の接続状態記述が現況と矛盾しない
- 無関係なファイル変更が commit に含まれていない
- 接続確認コマンドと CLI 実行例で、記載内容の妥当性を確認できている
- commit / push まで完了できる状態になっている
