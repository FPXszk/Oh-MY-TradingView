# Codex pane 起動コマンド更新・起動確認計画

作成日時: 2026-04-21 09:28 JST

## 目的

`scripts/dev/run-codex-pane.sh` の Codex 起動コマンドを、ユーザー指定の `workspace-write` / `--ask-for-approval never` 構成へ更新し、実際に起動できるところまで確認する。

## 現状整理

- 現在の `scripts/dev/run-codex-pane.sh` は `script -qefc 'codex --full-auto --sandbox danger-full-access --bypass-approvals --trusted-workspace --cd ... --add-dir ...'` を使っている
- `devinit.sh` の pane 0 は `scripts/dev/run-codex-pane.sh` を呼び出しているため、主な変更点は wrapper script だが、起動確認の結果によっては `devinit.sh` 側の微修正もあり得る
- `docs/exec-plans/active/` の既存 active plan は night-batch 系のみで、今回の Codex pane 起動修正と競合しない

## 変更・削除・作成するファイル

### 変更

- `scripts/dev/run-codex-pane.sh`
  - `script -qefc` 内の Codex 起動コマンドを、指定された `--sandbox workspace-write --ask-for-approval never --cd ... --add-dir ...` 構成へ更新する
  - 既存の transcript / log / respawn / evidence capture の流れは維持する
- `tests/devinit.test.js`
  - Codex wrapper が新しいフラグ構成を使うこと、古い `danger-full-access` / `--bypass-approvals` / `--trusted-workspace` を使わないことを RED -> GREEN で固定する
- `devinit.sh`
  - 実起動確認で wrapper 連携に問題が出た場合のみ、pane 0 起動経路に必要最小限の修正を入れる

### 削除

- なし

## 実装内容と影響範囲

- `just dev` / `bash devinit.sh` で起動される Codex pane の権限・承認ポリシーが変わる
- pane の pseudo-TTY 付与、ログ保存先、異常終了時の evidence capture は維持する
- legacy の Copilot wrapper や TradingView 本体ロジックには触れない

## テスト戦略

- RED: `tests/devinit.test.js` に新しい Codex 起動フラグを期待するアサーションを追加し、現状の wrapper で失敗させる
- GREEN: `scripts/dev/run-codex-pane.sh` を更新し、必要なら `devinit.sh` の起動経路を最小修正してテストを通す
- REFACTOR: 既存の quoting / log / respawn の読みやすさを崩さない範囲で整理する
- 検証コマンド
  - `node --test tests/devinit.test.js`
  - `bash -n devinit.sh scripts/dev/run-codex-pane.sh scripts/dev/capture-codex-pane-evidence.sh`
  - 実起動確認 1: `timeout 45 bash scripts/dev/run-codex-pane.sh`
  - 実起動確認 2: `timeout 45 bash devinit.sh`

## リスクと注意点

- `codex --full-auto` と `--ask-for-approval never` の組み合わせで、CLI 側のオプション互換性差分があると起動失敗する可能性がある
- `script -qefc` 配下の quoting を壊すと `--cd` / `--add-dir` のパス解決が失敗する
- 実起動確認では tmux セッションや transcript が残るため、確認後に不要な一時状態を片付ける

## スコープ外

- `scripts/dev/run-copilot-pane.sh` など legacy Copilot 経路の仕様変更
- README / docs の文言更新
- night-batch 系 active plan の内容変更

## 承認ゲート

- この計画の要約を共有したうえで、ユーザー承認があるまで実装・起動確認・コミットは開始しない

## 実装ステップ

- [ ] RED: `tests/devinit.test.js` に Codex wrapper の新フラグ期待値と旧フラグ禁止を追加する
- [ ] GREEN: `scripts/dev/run-codex-pane.sh` の Codex 起動コマンドを指定内容へ更新する
- [ ] GREEN: 実起動確認で必要になった場合のみ `devinit.sh` を最小修正する
- [ ] REFACTOR: 既存の wrapper ログ・respawn・evidence の流れを崩していないか整理する
- [ ] 検証: `node --test tests/devinit.test.js`
- [ ] 検証: `bash -n devinit.sh scripts/dev/run-codex-pane.sh scripts/dev/capture-codex-pane-evidence.sh`
- [ ] 検証: `timeout 45 bash scripts/dev/run-codex-pane.sh` で wrapper 単体の起動確認を行う
- [ ] 検証: `timeout 45 bash devinit.sh` で tmux 経由の起動確認を行う
- [ ] レビュー: ロジック破綻、設計原則違反、不要な複雑化がないか確認する
- [ ] コミット前: 本計画を `docs/exec-plans/completed/` へ移動する
- [ ] コミット: Conventional Commits 形式でコミットする
- [ ] プッシュ: `main` を SSH 経由で `origin/main` にプッシュする
