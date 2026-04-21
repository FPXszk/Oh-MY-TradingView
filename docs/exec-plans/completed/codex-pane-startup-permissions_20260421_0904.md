# Codex pane 起動権限付与計画

作成日時: 2026-04-21 09:04 JST

## 目的

`scripts/dev/run-codex-pane.sh` の Codex 起動時に、ユーザー指定の権限系フラグを付与できるようにする。

あわせて、現状より危険度が高い起動オプションなので、既定値をそのまま強化するか、環境変数で切り替え可能にするかを整理したうえで、最小変更で実装する。

## 変更・作成・削除するファイル

- 変更: `scripts/dev/run-codex-pane.sh`
  - `codex` 起動引数に権限系フラグを追加、または切り替え可能にする
- 変更: `tests/devinit.test.js`
  - `run-codex-pane.sh` が期待する権限系フラグを含むことを検証する
- 作成: `docs/exec-plans/completed/codex-pane-startup-permissions_20260421_0904.md`
  - 本計画
- 削除: なし

## 実装内容と影響範囲

- `devinit.sh` から起動される Codex pane の権限動作が変わる
- 変更対象は `scripts/dev/run-codex-pane.sh` の起動コマンドと、その期待値を持つテストのみ
- tmux 構成、evidence 取得、再起動制御、他の開発スクリプトには触れない

## 方針

- ユーザー指定の以下の起動形:
  - `--sandbox danger-full-access`
  - `--bypass-approvals`
  - `--trusted-workspace`
- ただしこの組み合わせは権限がかなり強いため、実装は次のどちらかで限定する
  - 既定でそのまま付与する
  - 既定は現状寄りに保ち、環境変数で明示時のみ付与する
- 実装前にコード側の既存パターンを優先し、追加ロジックは最小に留める

## テスト戦略

- RED: `tests/devinit.test.js` に、`run-codex-pane.sh` の Codex 起動が権限系フラグを含む期待を追加する
- GREEN: `scripts/dev/run-codex-pane.sh` を最小変更で更新する
- REFACTOR: 引数組み立てを読みやすく整える
- 検証コマンド:
  - `node --test tests/devinit.test.js`
  - `bash -n scripts/dev/run-codex-pane.sh`

## リスク

- `danger-full-access` と `bypass-approvals` を既定化すると、誤操作時の影響範囲が大きい
- Codex CLI の引数検証が将来変わると、起動失敗の原因になりうる
- テスト文字列が厳密すぎると、将来の軽微なコマンド整形で壊れやすい

## 既存 active plan との重複確認

- `docs/exec-plans/active/` 配下の既存 plan を確認し、本件と直接競合する Codex pane 起動フラグ変更 plan は見当たらない

## 実装ステップ

- [x] RED: `tests/devinit.test.js` に権限系フラグの期待を追加する
- [x] GREEN: `scripts/dev/run-codex-pane.sh` の Codex 起動引数を更新する
- [x] REFACTOR: 既存のログ・再起動・証跡処理を崩していないか確認する
- [x] 検証: `node --test tests/devinit.test.js`
- [x] 検証: `bash -n scripts/dev/run-codex-pane.sh`
- [x] レビュー: ロジック破綻、不要な複雑化、既存運用への影響を確認する
- [x] コミット前: 本計画を `docs/exec-plans/completed/` に移動する
- [ ] コミット: Conventional Commits 形式でコミットする
- [ ] プッシュ: `main` を SSH 経由で `origin/main` にプッシュする

## 実施結果

- RED: `tests/devinit.test.js` は追加した権限系フラグ期待により失敗した
- GREEN: `scripts/dev/run-codex-pane.sh` に `--sandbox danger-full-access --bypass-approvals --trusted-workspace` を追加した
- `node --test tests/devinit.test.js` は成功した
- `bash -n scripts/dev/run-codex-pane.sh` は成功した
- 変更は Codex pane の起動文字列と、その期待値を持つテストに限定した
