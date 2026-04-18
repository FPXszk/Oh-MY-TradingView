# Copilot CLI pane TTY 保持修正 exec-plan

## 目的

`just dev` 後に pane 0 の Copilot CLI が数秒で `[copilot exited cleanly] rc=0` になって終了する問題を、**TTY を壊さない起動経路へ修正**して解消する。  
今回の主眼は `run-copilot-pane.sh` で Copilot CLI を pseudo-TTY 配下に置き、pane 全体の出力リダイレクトで interactive TTY を失わないようにすることに置く。

## 既存 active plan との扱い

- このファイルを今回の実装 plan として更新し、**新しい active plan は作らない**
- `docs/exec-plans/active/copilot-cli-server-exit-diagnosis_20260418_1700.md` は調査 plan として残し、今回の実装 plan はここに一本化する
- `tradingview-crash-auto-recovery_20260417_0739.md` と `night-batch-readiness-stabilization_20260416_1706.md` とは対象が異なる

## 背景 / 確認済み事実

- 旧 `run-copilot-pane.sh` では pane 全体の stdout / stderr を `tee` へ流しており、Copilot CLI から見る interactive TTY を壊していた
- 旧 `run-copilot-pane.sh` では Copilot CLI を raw に近い形で起動しており、pseudo-TTY 保証が不足していた
- `devinit.sh` 側の `gh auth status` は成功している
- `logs/devinit/20260418_180643-0-324260.log` では約 2 秒で clean exit している
- `script -qefc 'copilot --yolo ...'` で起動した場合は UI が継続し、clean exit の再現を避けられている
- よって修正対象は **pane 0 の起動ラッパー** であり、`script` 利用と TTY 破壊リダイレクト除去を回帰テストで固定する

## スコープ

### 含む

- `run-copilot-pane.sh` の TTY 保持修正
- `tests/devinit.test.js` への TTY 回帰テスト追加
- `just dev` による手動確認

### 含まない

- Copilot CLI 本体の改変
- `gh` 認証フローの変更
- tmux レイアウト全体の再設計
- 無制限自動再起動や常駐監視
- root / system 設定変更
- README の広範な整理

## 変更対象ファイル

### 変更する

- `docs/exec-plans/active/copilot-cli-pane-resilience_20260418_1716.md`
- `scripts/dev/run-copilot-pane.sh`
- `tests/devinit.test.js`

### 作成する

- なし

### 削除する

- なし

## 実装方針

1. **Copilot を pseudo-TTY 配下で起動する**  
   `run-copilot-pane.sh` で Copilot 本体を `script -qefc 'copilot ...' <transcript>` 経由で起動し、TTY 前提の UI が即終了しないようにする。

2. **TTY を壊すリダイレクトを外す**  
   wrapper 全体に掛かっている pane-wide な stdout / stderr リダイレクトをやめ、`script` が記録する transcript と wrapper の status log を分離する。

3. **既存の evidence / bounded restart を維持する**  
   `run-id`、`meta.env`、evidence capture、最大 1 回の respawn は維持しつつ、TTY 保証と両立させる。

4. **回帰テストで仕様を固定する**  
   `tests/devinit.test.js` に、`script` 利用必須・raw `copilot` 直実行禁止・pane-wide `tee` 禁止・既存 bounded restart 維持のテストを追加する。

5. **明示的な事前チェックを加える**  
   `script` が存在しない環境では silent exit に寄せず、wrapper で明示エラーにする。

## TDD / 検証戦略（RED / GREEN / REFACTOR）

### RED

- `tests/devinit.test.js` に失敗するテストを追加する
  - `run-copilot-pane.sh` が `script` と `--yolo` を維持すること
  - pane-wide `tee` リダイレクトに戻っていないこと
  - evidence / bounded restart の既存要件が残ること

### GREEN

- `scripts/dev/run-copilot-pane.sh` を最小変更で修正する
  - `script -qefc` による Copilot 起動
  - transcript 保存先の追加
  - transcript / status log / artifact の整合維持

### REFACTOR

- run-id、transcript path、status log path の責務を整理する
- quoting と helper 関数を見直し、shell の複雑化を抑える

## 検証コマンド

- `node --test tests/devinit.test.js`
- `npm test`
- `just dev`
- `just stop`

必要に応じて補助的に以下も使う。

- `tmux capture-pane -p -t Oh-MY-TradingView:0.0`
- `tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}:#{pane_dead}:#{pane_title}:#{pane_current_command}:#{pane_pid}'`
- `ls -lt logs/devinit`

## リスク / 注意点

- `script` 呼び出しの quoting を誤ると `--add-dir` が壊れる
- wrapper の stdout / stderr 制御を混ぜると再度 TTY を壊す
- transcript 出力先を誤ると証跡が欠ける
- rc=0 clean exit を正常終了と誤認しないよう、pane 継続確認も必要

## 実装ステップ

- [ ] `tests/devinit.test.js` に `script` 利用必須の RED テストを追加する
- [ ] `tests/devinit.test.js` に raw `copilot` 直実行禁止と pane-wide `tee` 禁止の RED テストを追加する
- [ ] `tests/devinit.test.js` に evidence / bounded restart 維持の回帰テストを確認し、必要分を追記する
- [ ] `scripts/dev/run-copilot-pane.sh` を修正し、Copilot 本体を `script -qefc` 経由で起動する
- [ ] `scripts/dev/run-copilot-pane.sh` の pane-wide な stdout / stderr リダイレクト依存を外し、TTY を壊さないログ設計に直す
- [ ] `scripts/dev/run-copilot-pane.sh` に `script` 不在時の明示エラーを追加する
- [ ] run-id / transcript / status log / artifact の保存先整合を確認する
- [ ] `node --test tests/devinit.test.js` を実行する
- [ ] `npm test` を実行する
- [ ] `just dev` で pane 0 が即 clean exit しないことを確認する
- [ ] `just stop` で後始末を行う

## 完了条件

- `just dev` 後、pane 0 の Copilot CLI が数秒で rc=0 clean exit しない
- `run-copilot-pane.sh` が TTY 保証のため `script` を使っている
- `--yolo` が維持されている
- status log / transcript / artifact が repo 配下へ保存される
- `tests/devinit.test.js` で TTY 保証が回帰防止される
