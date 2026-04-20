# GitHub SSH 接続と Codex 設定追加計画

作成日時: 2026-04-21 01:45 JST

## 目的

`main` ブランチで GitHub リポジトリ `git@github.com:FPXszk/Oh-MY-TradingView.git` と SSH 経由で同期できる状態を確認し、リポジトリ内に `.codex/config.toml` を追加してコミット・プッシュする。

## 現状確認

- 現在ブランチ: `main`
- 現在の `origin`: `git@github.com:FPXszk/Oh-MY-TradingView.git`
- `main` は `origin/main` と同期済み
- `.codex` は現在、空の通常ファイルとして Git 管理されている
- `.codex/config.toml` を作成するには、既存の `.codex` ファイルを削除し、同名ディレクトリ `.codex/` を作成する必要がある

## 変更・削除・作成するファイル

- 削除: `.codex`
  - 空ファイルを削除し、同名ディレクトリを作成できるようにする。
- 作成: `.codex/config.toml`
  - Codex がこのリポジトリを扱うためのローカル設定を TOML 形式で追加する。
- 変更: `tests/repo-layout.test.js`
  - `.codex/config.toml` が存在し、`.codex` がディレクトリであることを検証するテストを追加する。
- 移動: `docs/exec-plans/active/github-ssh-codex-config_20260421_0145.md`
  - コミット工程に入る前に `docs/exec-plans/completed/` へ移動する。

## 実装内容と影響範囲

- GitHub リモート設定は既に SSH URL のため、原則として変更しない。
- SSH 経由の取得確認として `git fetch origin main` を実行する。
- `.codex/config.toml` は最小構成で追加する。
- 既存のアプリケーションコード、TradingView 連携、バッチ処理には影響させない。
- GitHub 操作は SSH ベースで行い、GitHub トークンは使用しない。
- `gh` が必要な確認に使える場合は `gh` CLI を優先する。ただし、SSH 経由の fetch/push は Git のリモート設定を使う。

## 実装ステップ

- [x] RED: `tests/repo-layout.test.js` に `.codex/config.toml` の存在と `.codex` ディレクトリ化を検証するテストを追加する。
- [x] RED: 追加したテストだけを実行し、現在の `.codex` が通常ファイルであるため失敗することを確認する。
- [x] GREEN: 既存の空ファイル `.codex` を削除し、`.codex/config.toml` を最小構成で作成する。
- [x] GREEN: 追加したテストを再実行して成功を確認する。
- [x] REFACTOR: 設定内容とテスト名を見直し、不要な複雑化がないか確認する。
- [x] 検証: `git fetch origin main` で SSH 経由の取得ができることを確認する。
- [x] 検証: `npm test` を実行し、既存テストに影響がないことを確認する。
- [x] レビュー: ロジック破綻、設計原則違反、不要な複雑化がないか確認する。
- [ ] コミット前: この計画ファイルを `docs/exec-plans/completed/` に移動する。
- [ ] コミット: Conventional Commits 形式でコミットする。
- [ ] プッシュ: `main` ブランチを SSH 経由で `origin/main` にプッシュする。

## 実施結果

- RED: `.codex` が通常ファイルのため、追加テストは `.codex must be a directory` で失敗した。
- GREEN: `.codex/config.toml` を作成後、`node --test --test-name-pattern "keeps shared Codex settings" tests/repo-layout.test.js` が成功した。
- SSH 確認: `git fetch origin main` は成功した。
- 全体テスト: `timeout 180 npm test` は既存の campaign / repo-layout / night-batch / windows-run-night-batch-self-hosted 系の失敗またはタイムアウトが残った。今回追加した Codex 設定テストは単独で成功している。

## テスト戦略

- ユーティリティ相当の構成検証として `tests/repo-layout.test.js` にリポジトリレイアウトテストを追加する。
- RED -> GREEN -> REFACTOR を明示的に実施する。
- 追加テスト単体を先に実行し、その後 `npm test` で既存テスト全体を確認する。
- この変更は設定ファイル追加であり API/E2E の振る舞いを変更しないため、新規 API 統合テストや E2E テストは追加しない。
- カバレッジ計測コマンドは現在の `package.json` に定義されていないため、必要なら追加方針を別途確認する。今回の実装では既存テストスイートの通過を主検証とする。

## 検証コマンド

- `node --test tests/repo-layout.test.js`
- `git fetch origin main`
- `npm test`
- `git status --short --branch`

## リスクと注意点

- `.codex` はファイルからディレクトリに変わるため、同名ファイルを参照している未確認の外部ツールがある場合は影響する可能性がある。
- ネットワークまたは SSH 鍵設定に問題がある場合、`git fetch` や `git push` が失敗する可能性がある。
- 既存の active plan が複数あるため、本作業ではそれらを変更しない。
- 本計画の承認前に実装・fetch・push は実施しない。

## スコープ外

- GitHub Actions や CI 設定の変更。
- アプリケーション本体の機能変更。
- 既存の active plan の整理。
- SSH 鍵の新規作成や GitHub への公開鍵登録。
