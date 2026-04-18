# Copilot CLI `[server exited]` / 約2分後終了の調査 exec-plan

## 目的

`just dev` で `devinit.sh` を起動した約2分後に Copilot CLI が終了し、tmux/WSL は生きたまま pane 0 だけが落ちる問題について、**どのプロセスが何をトリガーに終了しているかを特定する**。

今回のゴールは次の 3 点に限定する。

1. `[server exited]` の出所を特定する
2. 約120秒付近の終了条件を再現・切り分けする
3. 恒久対策候補を、根拠つきで提示する

## スコープ

### 含む

- `just dev` → `devinit.sh` → pane 0 の `copilot ...` 起動経路の確認
- `copilot --help` / `copilot --version` / 実行プロセス観察による CLI 側要因の切り分け
- `src/server.js` とその起動有無・stdio 切断条件の確認
- `Oh-MY-TradingView.log` 末尾と OS ログ (`journalctl`, `dmesg`) の確認
- 既存の `devinit` 周辺テスト・過去 plan の参照
- 必要最小限の `devinit.sh` 修正案の提示

### 含まない

- まず原因が特定できる前提の大規模修正
- Copilot CLI 本体バイナリの改変
- TradingView / night-batch / readiness 系の別課題対応
- tmux レイアウトの全面再設計

## 調査対象ファイル / リソース

### 読む

- `justfile`
- `devinit.sh`
- `src/server.js`
- `tests/devinit.test.js`
- `docs/exec-plans/completed/copilot-cli-devinit-stability_20260417_1005.md`
- `Oh-MY-TradingView.log`

### 条件付きで変更する

- `devinit.sh`
- `tests/devinit.test.js`
- `README.md`

## 優先順に沿った調査手順

1. **`[server exited]` の出所確認**
   - repo 内文字列検索で該当メッセージの有無を確認
   - repo 内に無ければ Copilot CLI 本体の表示とみなし、pane 0 の挙動と整合するか確認
   - `src/server.js` 側が同様メッセージを出す実装かどうか確認

2. **Copilot CLI のアイドルタイムアウト確認**
   - `copilot --help` / `copilot --version` を確認
   - 約120秒相当の timeout / idle / keepalive / session 関連オプションの有無を確認
   - 必要なら `strings` や起動ログではなく、まず公開オプションと実行挙動を優先して根拠化する

3. **`devinit.sh` の pane 0 起動コマンド確認**
   - `start_commands` の `copilot_cmd` を正確に抽出
   - pane 0 が落ちるときに、pane command / title / exit status がどう変わるか観察
   - `just dev` が落ちるのは `attach_or_switch` 後ではなく、pane 0 のプロセス終了が原因かを確認

4. **`src/server.js` プロセス状態確認**
   - pane 0 が生きている間に `node src/server.js` 系プロセスが別途存在するか確認
   - pane 0 終了時点で `server.js` が先に死ぬのか、親の Copilot CLI が落ちて stdio が閉じるのかを確認
   - stdio transport 切断が server.js 側の終了条件になっていないか確認

5. **直近ログ / OS ログ確認**
   - `Oh-MY-TradingView.log` 末尾を確認
   - `journalctl` と `dmesg` で OOM / SIGKILL / segfault 相当が無いか確認

## 実装が必要になった場合の方針

- 原因が `devinit.sh` 起動条件にあるなら、**最小差分**で `devinit.sh` を修正する
- 原因が keepalive 不足や CLI 実行条件なら、pane 0 向け keepalive / wrapper / 再試行条件の改善案を出す
- 原因が `src/server.js` の stdio 終了連鎖なら、切断理由が見えるよう診断ログまたは起動方法の改善を検討する

## TDD / 検証方針

### RED

- 修正が必要な場合のみ、再現条件を落とし込む `devinit` 周辺テストを先に失敗で追加する

### GREEN

- `devinit.sh` または関連箇所を最小修正し、再現条件のテストを通す

### REFACTOR

- 恒久対策として不要な複雑化が入っていないか見直す

## 検証コマンド

- `copilot --version`
- `copilot --help`
- `just dev`
- `just stop`
- `npm test`

必要に応じて補助的に以下も使う。

- `tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}:#{pane_dead}:#{pane_title}:#{pane_current_command}'`
- `ps -ef`
- `journalctl --since ...`
- `dmesg`

## リスク / 注意点

- Copilot CLI 本体由来の表示は repo 内検索だけでは断定できず、実プロセス観察が必要
- shared environment のため、既存 tmux セッションや他ユーザーのプロセスを壊さないよう対象 PID を限定して観察する
- `journalctl` は権限や保持設定で情報不足の可能性がある

## 既存 active plan との関係

- `docs/exec-plans/active/tradingview-crash-auto-recovery_20260417_0739.md` とは対象が異なる
- `docs/exec-plans/active/night-batch-readiness-stabilization_20260416_1706.md` とは対象が異なる
- 直近の completed plan `docs/exec-plans/completed/copilot-cli-devinit-stability_20260417_1005.md` は関連履歴として参照するが、今回の調査対象は「起動直後」ではなく「約2分後終了」の切り分け

## 実施ステップ

- [ ] `justfile` / `devinit.sh` / `tests/devinit.test.js` / 既存 plan を確認し、再発条件を整理する
- [ ] `src/server.js` と関連起動経路を確認し、`[server exited]` の repo 内出所有無を確定する
- [ ] `copilot --help` / `copilot --version` を確認し、timeout / idle 関連オプション有無を整理する
- [ ] `just dev` を再現し、pane 0・Copilot CLI・`src/server.js` の各プロセス状態を時系列で観察する
- [ ] `Oh-MY-TradingView.log` と OS ログを確認し、外因性の kill/OOM を除外する
- [ ] 原因仮説を比較し、最有力原因と反証材料をまとめる
- [ ] 恒久対策案を、設定変更 / keepalive 改善 / `devinit.sh` 修正案に分けて整理する

## 完了条件

- `[server exited]` がどのレイヤの表示か説明できる
- 約2分後終了の直接トリガーを、プロセス観察またはログ根拠つきで説明できる
- `src/server.js` が原因か、親プロセス終了の従属結果かを説明できる
- 具体的な恒久対策案を提示できる
