# Copilot pane resilience / evidence-first auto-recovery exec-plan

## 目的

`just dev` で起動する Copilot pane が異常終了しても、**証跡を必ず残し、tmux セッションを維持し、必要時のみ 1 回だけ安全に再起動**できるようにする。  
Copilot CLI 本体は変更せず、repo が制御できる `devinit.sh` / wrapper / ログ導線だけで恒久対策する。

## 背景

調査の結果、今回の `[server exited]` は repo の `src/server.js` ではなく **Copilot CLI 側の内部 server / UI レイヤ由来**と判断した。

- `devinit.sh` pane 0 は `copilot --yolo --add-github-mcp-toolset all --add-dir ...` を直接起動している
- `src/server.js` は現行 `just dev` 経路では未接続で、原因箇所ではない
- `copilot --help` には約120秒の公開 idle timeout 設定は見当たらない
- 単純な idle 放置だけでは 130 秒超でも再現しなかった
- OOM / SIGKILL / segfault などの外因性 kill も確認できなかった

よって、根因未確定のままでも repo 側で打てる恒久対策は、**diagnostics を強化した起動 wrapper と bounded respawn** が中心になる。

## スコープ

### 含む

- pane 0 の Copilot 起動を wrapper script 経由に変更
- run-id、開始/終了時刻、PID、終了コード、pane 出力の永続記録
- 異常終了時の `tmux capture-pane` / pane metadata / process snapshot の保存
- Copilot pane 異常終了時の **1 回だけ** の自動再起動
- `just logs` / `just session-logs` など観測導線の改善
- `devinit.sh` / helper script 向け回帰テストの追加
- 必要最小限の README 更新

### 含まない

- Copilot CLI 本体バイナリや配布物の改変
- `src/server.js` の変更
- tmux レイアウト全体の再設計
- 無制限の自動復旧や常駐監視デーモンの導入
- OS / WSL / journalctl の設定変更

## 変更対象ファイル

### 変更する

- `devinit.sh`
- `justfile`
- `tests/devinit.test.js`
- `README.md`

### 新規作成する

- `scripts/dev/run-copilot-pane.sh`
- `scripts/dev/capture-copilot-pane-evidence.sh`

### 実行時に生成される出力

- `logs/devinit/`
- `artifacts/devinit/<run-id>/`

## 実装方針

1. **pane 0 を wrapper 管理に変える**  
   `devinit.sh` から直接 `copilot ...` を送らず、`scripts/dev/run-copilot-pane.sh` を起動する。  
   wrapper が run-id を払い出し、開始時刻、PID、終了コード、stdout/stderr を記録する。

2. **異常終了時の証跡を repo 側で確保する**  
   `scripts/dev/capture-copilot-pane-evidence.sh` で以下を保存する。
   - `tmux capture-pane`
   - `tmux list-panes` / pane metadata
   - `ps` snapshot
   - wrapper が観測した終了コードと時刻

3. **自動再起動は 1 回だけに制限する**  
   連続再起動で根因を隠したりログを汚さないよう、最大 1 回だけ再起動する。  
   1 回目の異常終了では evidence を保存して再起動、2 回目も異常終了したら pane を落とさず bash へ退避し、失敗状態を可視化する。

4. **`just dev` の成功体験を壊さず、失敗時の観測性を上げる**  
   既存の tmux レイアウトと attach 導線は保ちつつ、ログ確認コマンドから新しい evidence に辿れるようにする。

5. **テストで wrapper 化と診断導線を固定する**  
   shell script 変更は壊れやすいので、`tests/devinit.test.js` に wrapper 起動・evidence 導線・bounded respawn の期待を追加して回帰を防ぐ。

## TDD / 検証戦略（RED / GREEN / REFACTOR）

### RED

- `tests/devinit.test.js` に失敗するテストを追加する
  - pane 0 が生の `copilot` 直起動ではなく wrapper 経由であること
  - run-id / evidence path が起動導線に含まれること
  - bounded respawn が 1 回で打ち止めになること
  - 異常終了後に pane を完全終了させず、診断可能な状態を残すこと

### GREEN

- `scripts/dev/run-copilot-pane.sh` と `scripts/dev/capture-copilot-pane-evidence.sh` を最小実装する
- `devinit.sh` から wrapper を起動するように変更する
- `justfile` と README の観測導線を接続する
- 追加テストを通し、既存の `devinit` 回帰を壊さない

### REFACTOR

- run-id 生成、ログパス解決、evidence 採取呼び出しの責務を整理する
- shell 変数名と helper 関数を整え、追加の複雑化を抑える
- ログ出力量を見直し、必要最小限に保つ

## 検証コマンド

既存の repo コマンドを優先して使う。

- `node --test tests/devinit.test.js`
- `npm test`
- `just dev`
- `just logs`
- `just session-logs`
- `just stop`

必要に応じて補助的に以下も使う。

- `tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}:#{pane_dead}:#{pane_title}:#{pane_current_command}:#{pane_pid}'`
- `tmux capture-pane -p -t Oh-MY-TradingView:0.0`
- `ps -ef`

## リスク / 注意点

- 自動再起動は根因を隠し得るため、**evidence 保存を先に行う** 実装順が必須
- pane 出力の常時記録でログ量が増える
- shell wrapper が肥大化すると保守しづらいので、helper script へ責務分離する
- `just dev` の意味は「tmux セッション起動」と「Copilot 長期安定稼働」で完全一致しないため、README で観測手順を補う必要がある

## 既存 active plan との関係

- `docs/exec-plans/active/copilot-cli-server-exit-diagnosis_20260418_1700.md` の**後続実装 plan**。競合というより発展系
- `docs/exec-plans/active/tradingview-crash-auto-recovery_20260417_0739.md` とは対象が異なる
- `docs/exec-plans/active/night-batch-readiness-stabilization_20260416_1706.md` とは対象が異なる

## 実装ステップ

- [ ] `tests/devinit.test.js` に wrapper 起動必須の RED テストを追加する
- [ ] `tests/devinit.test.js` に run-id / evidence path / bounded respawn の RED テストを追加する
- [ ] `scripts/dev/run-copilot-pane.sh` を追加し、Copilot 起動・run-id・開始/終了ログ・終了コード記録を実装する
- [ ] `scripts/dev/capture-copilot-pane-evidence.sh` を追加し、pane output / pane metadata / process snapshot を保存する
- [ ] `devinit.sh` の pane 0 起動を wrapper 経由へ変更する
- [ ] `devinit.sh` に 1 回だけの自動再起動と、再失敗時に bash へ退避する挙動を追加する
- [ ] `justfile` にログ確認導線の最小改善を入れる
- [ ] `README.md` に障害時の確認先と新しいログ配置を追記する
- [ ] `node --test tests/devinit.test.js` と `npm test` を通す
- [ ] `just dev` / `just logs` / `just session-logs` / `just stop` で手動確認する

## 完了条件

- Copilot pane 異常終了時に run-id / PID / exit code / pane output が保存される
- 異常終了時に evidence が repo 内の決めた場所へ残る
- 異常終了時に 1 回だけ自動再起動し、再失敗時は診断可能な状態を残す
- 既存 `devinit` レイアウトと再利用判定を壊していない
- テストと既存コマンドで回帰確認できる
