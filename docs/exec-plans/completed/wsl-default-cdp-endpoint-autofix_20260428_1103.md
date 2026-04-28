# WSL 既定 CDP Endpoint 自動補正計画

作成日時: 2026-04-28 11:03 JST

## 目的

WSL から CLI を実行したときに、`TV_CDP_HOST` / `TV_CDP_PORT` を毎回明示しなくても TradingView Desktop の CDP へ接続できるよう、既定 endpoint を自動補正する。  
Windows ネイティブ実行時の既定値 `localhost:9222` は維持し、**WSL 実行時だけ**既定値を `172.31.144.1:9223` に切り替える。

## 前提・確認事項

- 接続解決の本体は `src/connection.js` の `resolveCdpEndpoint`
- 現在の既定値は `DEFAULT_CDP_HOST='localhost'`, `DEFAULT_CDP_PORT=9222`
- 実測では WSL から `localhost:9222` は不達で、`172.31.144.1:9223` は `tv status` と My Scripts 保存で成功した
- 既存テスト `tests/connection.test.js` が `resolveCdpEndpoint` の期待値を網羅している
- `tests/repo-layout.test.js` では Codex MCP の既定 host/port として `172.31.144.1` / `9223` を前提にしている
- `docs/exec-plans/active/` の既存 active plan `repo-structure-align-and-archive-rules_20260424_2015.md` とは対象が重ならない

## 変更・作成・移動するファイル

### 作成

- `docs/exec-plans/active/wsl-default-cdp-endpoint-autofix_20260428_1103.md`

### 更新

- `src/connection.js`
- `tests/connection.test.js`

### 完了時に移動

- `docs/exec-plans/active/wsl-default-cdp-endpoint-autofix_20260428_1103.md`
- 移動先: `docs/exec-plans/completed/wsl-default-cdp-endpoint-autofix_20260428_1103.md`

## 実装内容と影響範囲

- `resolveCdpEndpoint` に WSL 判定を追加する
- `TV_CDP_HOST` / `TV_CDP_PORT` が明示されていない場合のみ、WSL では既定 endpoint を `172.31.144.1:9223` にする
- session port 優先順位は維持しつつ、Windows ネイティブ実行では従来どおり `localhost:9222` を返す
- 接続ヒント文言が実態とずれないかも必要に応じて調整する

## スコープ

### 含む

- WSL 判定付きの既定 endpoint 解決
- `resolveCdpEndpoint` の unit test 更新
- `tv status` による実機確認
- review / commit / push

### 含まない

- TradingView Desktop 起動フロー全体の改修
- launch / browser-launch の別ロジック刷新
- Windows ネイティブ時の既定値変更
- environment variable を使った既存回避策の削除

## TDD / テスト戦略

- 先に `tests/connection.test.js` へ WSL 既定 endpoint の期待値を追加して RED にする
- `src/connection.js` を更新して GREEN にする
- 必要なら session port と env override の既存テストも追補し、優先順位の回帰を防ぐ

## 検証コマンド候補

- `node --test tests/connection.test.js`
- `node src/cli/index.js status`
- `git diff -- src/connection.js tests/connection.test.js`
- `git status --short`

## リスク / 注意点

- WSL 判定条件が広すぎると Linux ネイティブ環境まで `172.31.144.1:9223` を向く可能性がある
- session port 優先順位を崩すと launch 系の既存挙動に副作用が出る
- `172.31.144.1` はこの環境での verified host なので、別マシンの WSL では不一致の可能性がある
- そのため env override を最優先に維持し、既定値変更は WSL かつ env 未指定時だけに限定する

## 実装ステップ

- [ ] `resolveCdpEndpoint` の現行優先順位を整理する
- [ ] WSL 実行時の既定 host/port を検証する unit test を追加する
- [ ] `src/connection.js` に WSL 既定 endpoint 補正を実装する
- [ ] env override / session port 優先順位の既存期待値が崩れていないか確認する
- [ ] `tv status` で WSL 既定接続が通ることを確認する
- [ ] plan を `docs/exec-plans/completed/` に移動する
- [ ] Conventional Commit で commit し、`main` に push する

## 完了条件

- WSL 実行時に env 未指定でも `resolveCdpEndpoint` が `172.31.144.1:9223` を返す
- Windows ネイティブ前提の既存挙動は維持される
- unit test が通り、`tv status` で接続確認できる
- plan が completed に移動し、変更が `main` に push されている
