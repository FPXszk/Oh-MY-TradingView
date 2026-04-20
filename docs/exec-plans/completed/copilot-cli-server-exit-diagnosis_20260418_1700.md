# Copilot CLI セッション約2分後終了の原因確定 exec-plan

## Superseded

2026-04-21 の Codex CLI 移行により、`just dev` の主経路は Codex CLI へ変更する方針になった。
この計画は旧 Copilot CLI 経路の原因調査記録として残すが、active な実装・調査計画からは外す。

## 目的

`just dev` / 手動起動の両経路で、Copilot CLI セッションが作業中におおむね約2分後に落ちる問題について、**原因を特定して確定する**。

今回のゴールは次の 4 点に限定する。

1. pane 0 / Copilot CLI / repo 側プロセスのうち、どの層が先に落ちているかを確定する
2. 直近変更 (`7ec9b5e`, `539db68`) と発症タイミングの関係を因果で説明できるか確認する
3. GitHub Actions run `24544232199` とローカル再現、VS Code 拡張機能側の挙動差を突き合わせる
4. rate limit / upstream 既知不具合 / hang 系 issue を調べ、今回症状との一致・不一致を整理する

**今回は再発防止策や恒久修正の実装までは行わない。**

## 既知事実

- `just dev` は `justfile` 経由で `./devinit.sh` を起動する
- `devinit.sh` の pane 0 は `scripts/dev/run-copilot-pane.sh` を経由して Copilot CLI を起動する
- `run-copilot-pane.sh` は `script -qefc` で pseudo-TTY を与え、終了時は `logs/devinit/` と `artifacts/devinit/` に証跡を残す
- 直近変更として、wrapper/evidence capture (`7ec9b5e`) と TTY wrapper hardening (`539db68`) が入っている
- ユーザー観測では「アイドル放置では落ちにくい」「作業を指示すると約2分で落ちる」「VS Code 拡張機能では実行できることがあるが、後日ハング気味の停止もあった」
- 既知の仮説として `[server exited]` は repo の `src/server.js` ではなく Copilot CLI UI 表示の可能性が高いが、今回あらためて根拠つきで確定する

## 調査対象ファイル / リソース

### ローカルファイル

- `justfile`
- `devinit.sh`
- `scripts/dev/run-copilot-pane.sh`
- `scripts/dev/capture-copilot-pane-evidence.sh`
- `tests/devinit.test.js`
- `package.json`
- `src/server.js`
- `README.md`（必要に応じて参照のみ）
- `docs/exec-plans/completed/copilot-cli-devinit-stability_20260417_1005.md`

### 実行時証跡

- `logs/devinit/`
- `artifacts/devinit/`
- `Oh-MY-TradingView.log`
- `tmux list-panes ...`
- `ps -eo pid,ppid,pgid,sid,stat,etimes,args`

### 外部参照

- GitHub Actions run `24544232199` / job `71756304556`
- `github/copilot-cli` 系の issue / discussion / release notes
- 必要なら Copilot CLI 公式ドキュメント

## スコープ

### 含む

- `just dev` 経由と手動起動経路の差分確認
- pane 0 の親子プロセス・終了コード・時系列観察
- `src/server.js` が直接原因か従属終了かの切り分け
- wrapper 変更前後の git 履歴確認
- Actions 時点で正常だった条件と、発症後との差分確認
- VS Code 拡張機能側との振る舞い比較
- rate limit / upstream issue の調査と今回症状との照合

### 含まない

- 恒久修正の実装
- tmux レイアウトや wrapper の設計変更
- TradingView crash / night-batch / readiness の別課題対応
- Copilot CLI 本体バイナリの改変
- 推測だけに基づく回避策の導入

## 調査方針

1. **起点の確定**
   - `just dev` と手動起動で、実際に実行される Copilot コマンドライン・親子関係・TTY 条件を確認する
   - `[server exited]` 文字列の repo 内出所有無、`src/server.js` の終了条件、pane 0 の UI 表示を突き合わせる

2. **時系列の確定**
   - pane 0 でタスク投入直後から約2分後までを観測し、どのプロセスが最初に exit / hang / disconnect するかをログと PID ベースで特定する
   - `logs/devinit/` と `artifacts/devinit/` の evidence を現物確認し、直前の終了コード・pane 内容・プロセススナップショットを読む

3. **変更起因か環境起因かの切り分け**
   - `7ec9b5e`, `539db68` 前後の差分と、ユーザー観測の「手動起動でも似た挙動だった可能性」を比較する
   - wrapper 導入が原因なら `just dev` 経路に偏るはずで、手動起動・VS Code 拡張機能との差で反証できるかを見る

4. **外部要因の切り分け**
   - rate limit、Copilot サービス側エラー、CLI 既知不具合、長時間応答待ちによる hang を issue / release note で確認する
   - 今回症状が「明示 exit」なのか「ハングして UI だけ残る」なのかを、CLI と拡張機能で比較する

## TDD / 検証方針

今回の主目的は原因調査であり、原則として本番コード変更は行わない。

### RED

- 調査に必要な診断面が既存コードで不足し、**最小の診断補強**が必要な場合のみ、先に失敗するテストを追加する
- 候補:
  - `tests/devinit.test.js`

### GREEN

- 必要最小限の診断補強だけを入れてテストを通す

### REFACTOR

- 診断のために入れた変更が不要に複雑でないか確認する

## 検証コマンド

- `copilot --version`
- `copilot --help`
- `just dev`
- `just stop`
- `node --test tests/devinit.test.js`
- 必要に応じて `npm test`
- `git --no-pager log --oneline --decorate -n 20 -- devinit.sh scripts/dev/run-copilot-pane.sh scripts/dev/capture-copilot-pane-evidence.sh tests/devinit.test.js justfile`

補助観測:

- `tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}:dead=#{pane_dead}:title=#{pane_title}:cmd=#{pane_current_command}:pid=#{pane_pid}'`
- `ps -eo pid,ppid,pgid,sid,stat,etimes,args`

## リスク / 注意点

- shared environment なので、既存 tmux セッションや他プロセスは壊さず対象 PID のみ観測する
- `logs/devinit/` / `artifacts/devinit/` は未追跡生成物の可能性があるため、勝手に削除しない
- upstream issue は症状が似ていても原因が別の可能性があるため、ローカル証跡で必ず裏取りする
- VS Code 拡張機能側は「成功」と「ハング」の両観測があるため、単純に正常系扱いしない

## 既存 active plan との関係

- `night-batch-readiness-stabilization_20260416_1706.md` と `night-batch-summary-and-storage-followup_20260420_1123.md` とは対象が異なる
- 本計画は既存の Copilot CLI 調査 plan を、**今回の依頼に合わせて原因確定専用へ再定義**したもの

## 実施ステップ

- [ ] `justfile` / `devinit.sh` / wrapper scripts / `tests/devinit.test.js` / 既存 completed plan を読み、現行起動経路と既知対策を整理する
- [ ] `src/server.js` と repo 内文字列検索で `[server exited]` と終了条件を確認し、UI 表示と repo 実装の境界を確定する
- [ ] `git log` と関連コミット差分を確認し、`7ec9b5e` / `539db68` の影響仮説を整理する
- [ ] `copilot --version` / `copilot --help` / 必要なら手動起動を確認し、timeout / rate limit / session 関連の表面仕様を整理する
- [ ] `just dev` を再現し、pane 0・Copilot CLI・repo 側プロセスを時系列で観測して最初の異常点を特定する
- [ ] `logs/devinit/` / `artifacts/devinit/` / `Oh-MY-TradingView.log` を読み、終了直前の証跡を突き合わせる
- [ ] Actions run `24544232199` とローカル挙動を比較し、正常だった時点との差分を整理する
- [ ] GitHub issue / discussion / release notes を調査し、rate limit や同症状報告の一致度を評価する
- [ ] 最終的に、最有力原因・反証した仮説・未確定事項を分けて結論化する

## 完了条件

- どの層が最初に落ちているかを、ログまたはプロセス証跡つきで説明できる
- 約2分という時間軸が、ローカル証跡または外部要因との照合で意味づけできる
- `7ec9b5e` / `539db68` が原因・非原因・増幅要因のどれかを説明できる
- `src/server.js` 直接原因説の真偽を説明できる
- rate limit / upstream 既知不具合の一致・不一致を説明できる
- 再発防止策ではなく、**原因確定の結論**として報告できる
