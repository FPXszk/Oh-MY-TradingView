# Codex CLI 移行計画

作成日時: 2026-04-21 02:05 JST

## 目的

現在のローカル repository root `/home/fpxszk/code/Oh-MY-TradingView` を、GitHub リポジトリ `git@github.com:FPXszk/Oh-MY-TradingView.git` に接続したまま、開発セッションの主経路を Copilot CLI から Codex CLI に移行する。

旧 Copilot CLI 経路は後で戻せるように削除せず、legacy として残す。

## 調査結果

### Git / GitHub

- 現在ブランチは `main`
- `origin` は fetch / push ともに `git@github.com:FPXszk/Oh-MY-TradingView.git`
- 作業ツリーは計画作成前時点で clean

### Codex CLI

- `codex --version`: `codex-cli 0.121.0`
- `codex --help` で確認した主な移行先:
  - `codex`
  - `codex --full-auto`
  - `codex --cd <DIR>`
  - `codex --add-dir <DIR>`
  - `codex mcp add`
- `codex mcp add` の TOML 形式は次の形:

```toml
[mcp_servers.oh-my-tradingview]
command = "node"
args = ["/home/fpxszk/code/Oh-MY-TradingView/src/server.js"]

[mcp_servers.oh-my-tradingview.env]
TV_CDP_HOST = "172.31.144.1"
TV_CDP_PORT = "9223"
```

### 旧 Copilot CLI 依存がある場所

- `devinit.sh`
  - 起動メッセージが Copilot CLI
  - pane 0 title が `copilot`
  - health check が `pane_current_command == copilot`
  - pane 0 起動が `scripts/dev/run-copilot-pane.sh`
- `scripts/dev/run-copilot-pane.sh`
  - `copilot --yolo --add-github-mcp-toolset all --add-dir ...` を `script(1)` 経由で起動
  - Copilot pane 用ログ名・artifact 名を使用
- `scripts/dev/capture-copilot-pane-evidence.sh`
  - Copilot pane 異常終了時の証跡取得
- `tests/devinit.test.js`
  - Copilot pane wrapper / health check / `--yolo` を前提にしたテスト
- `README.md`
  - 冒頭が「Copilot CLI 前提」
  - architecture に `Copilot CLI / tv CLI`
  - dev session セクションが Copilot 前提
  - MCP 設定セクションが Copilot CLI JSON 前提
- `.github/copilot-instructions.md`
  - ファイル名は GitHub 側の慣習として残すが、末尾に `copilot-instructions.md` 再確認と書かれており、Codex CLI 主経路とは表現がずれる
- `.agents/skills/repo-planning-discipline/SKILL.md`
  - `.github/copilot-instructions.md` と `~/.copilot/session-state/plan.md` を前提にした説明が残っている
- `.agents/skills/japanese-post-humanizer/SKILL.md`
  - 「Copilot-generated Japanese output」と `config/copilot_summary_prompt_ja.txt` / `config/copilot_reply_prompt_ja.txt` の記述が残っている
- `.agents/skills/github-actions-failure-debugging/SKILL.md`
  - `COPILOT_GITHUB_TOKEN` secret への言及が残っている
- `docs/exec-plans/active/copilot-cli-server-exit-diagnosis_20260418_1700.md`
  - Copilot CLI の約2分終了原因調査 plan。Codex 移行後は active のままだと運用方針と衝突する

### 変更しないもの

- `src/cli/` 以下の `tv` CLI は、このプロジェクト本体の操作入口であり Copilot CLI ではないため削除・無効化しない
- MCP server `src/server.js` は Codex からも使うため維持する
- `twitter-cli` / `yt-dlp` など外部補助 CLI は今回の Codex 移行対象外

## 変更・削除・作成するファイル

### 作成

- `scripts/dev/run-codex-pane.sh`
  - Codex CLI 用 pane wrapper
  - `script -qefc` で pseudo-TTY を与える
  - `codex --full-auto --cd "/home/fpxszk/code/Oh-MY-TradingView" --add-dir "/home/fpxszk/code/Oh-MY-TradingView"` を主起動にする
  - 旧 Copilot コマンドはコメントとして残さない。旧経路は `run-copilot-pane.sh` に残す
- `scripts/dev/capture-codex-pane-evidence.sh`
  - Codex pane 用の証跡取得
  - 既存 Copilot evidence script と同等の出力を `artifacts/devinit/<run-id>/` に残す

### 変更

- `.codex/config.toml`
  - 既存の model / reasoning / GitHub plugin 設定を維持
  - `oh-my-tradingview` MCP server 設定を追加
  - `sandbox_mode = "workspace-write"` と `approval_policy = "on-request"` を追加し、`codex --full-auto` 相当の低摩擦運用に寄せる
  - `approval_policy = "never"` は、repo の PLAN 承認ルールと衝突しやすいため今回は使わない
- `devinit.sh`
  - 起動メッセージを Codex CLI に変更
  - pane 0 title を `codex` に変更
  - health check を `pane_current_command == codex` に変更
  - pane 0 起動を `scripts/dev/run-codex-pane.sh` に変更
  - 旧 Copilot 起動行はコメントとして残し、必要時に戻せるようにする
- `justfile`
  - `dev` は Codex CLI 主経路のまま維持
  - `dev-copilot-legacy` を追加し、旧 Copilot wrapper を手動起動できるようにする
- `tests/devinit.test.js`
  - Codex pane wrapper / health check / `--full-auto` / `--cd` / MCP config 連携を検証するテストへ更新
  - Copilot wrapper が残っていること、`devinit.sh` の active 経路からは外れていることを検証する
- `tests/repo-layout.test.js`
  - `.codex/config.toml` の MCP server 設定を検証する
- `README.md`
  - 「Copilot CLI 前提」を「Codex CLI 主経路」に更新
  - dev session セクションを Codex CLI 前提へ更新
  - Codex CLI の `.codex/config.toml` MCP 設定を一次手順にする
  - Copilot CLI JSON 設定は legacy 参考として残す
- `.github/copilot-instructions.md`
  - 本文のエージェント憲法は維持
  - 末尾の「copilot-instructions.md を確認」を「AGENTS.md と本ファイルを確認」に修正し、Codex CLI 主経路でも意味が通るようにする
- `docs/exec-plans/active/copilot-cli-server-exit-diagnosis_20260418_1700.md`
  - Codex 移行により active から外す
  - 内容は削除せず、superseded note を追記して `docs/exec-plans/completed/` に移動する
- `.agents/skills/repo-planning-discipline/SKILL.md`
  - `.github/copilot-instructions.md` への説明を `AGENTS.md` / repository instructions 前提へ寄せる
  - `~/.copilot/session-state/plan.md` の例を Codex 中立の session note 例に変更する
- `.agents/skills/japanese-post-humanizer/SKILL.md`
  - Copilot 固有表現を agent / LLM generated output に変更する
  - 存在しない可能性がある `config/copilot_*` prompt 名は legacy 例として残すか、中立表現に変更する
- `.agents/skills/github-actions-failure-debugging/SKILL.md`
  - `COPILOT_GITHUB_TOKEN` の記述を現状確認対象にし、存在しない workflow 固有 secret を断定しない表現へ変更する
- `docs/exec-plans/active/codex-cli-migration_20260421_0205.md`
  - 実施後に `docs/exec-plans/completed/` へ移動する

### 削除

- なし

## 実装内容と影響範囲

- `just dev` の pane 0 が Copilot CLI ではなく Codex CLI を起動するようになる
- `logs/devinit/` と `artifacts/devinit/` の保存先は維持する
- 旧 Copilot wrapper は残すため、必要なら `just dev-copilot-legacy` で手動起動できる
- アプリ本体の MCP tools / `src/cli` / TradingView 操作ロジックには触れない
- GitHub 接続は SSH のまま維持する

## 実装ステップ

- [x] RED: `tests/devinit.test.js` に Codex pane が主経路であることを期待するテストを追加し、現状の Copilot 前提で失敗することを確認する
- [x] RED: `tests/repo-layout.test.js` に `.codex/config.toml` の MCP server 設定検証を追加し、現状不足で失敗することを確認する
- [x] GREEN: `.codex/config.toml` に Codex MCP server / sandbox / approval 設定を追加する
- [x] GREEN: `scripts/dev/run-codex-pane.sh` と `scripts/dev/capture-codex-pane-evidence.sh` を追加する
- [x] GREEN: `devinit.sh` を Codex 主経路に変更し、旧 Copilot 起動行をコメントとして残す
- [x] GREEN: `justfile` に `dev-copilot-legacy` を追加する
- [x] GREEN: `tests/devinit.test.js` / `tests/repo-layout.test.js` を通す
- [x] REFACTOR: 命名、ログ名、コメント、legacy 導線が過剰でないか確認する
- [x] Docs: `README.md` と `.github/copilot-instructions.md` を Codex 主経路へ更新する
- [x] Skills: `.agents/skills/repo-planning-discipline/SKILL.md` / `.agents/skills/japanese-post-humanizer/SKILL.md` / `.agents/skills/github-actions-failure-debugging/SKILL.md` の Copilot 固有表現を Codex / agent 中立表現へ更新する
- [x] Plan 整理: Copilot CLI 原因調査 active plan に superseded note を追記し、completed へ移動する
- [x] 検証: `node --test tests/devinit.test.js`
- [x] 検証: `node --test --test-name-pattern "keeps shared Codex settings" tests/repo-layout.test.js`
- [x] 検証: `codex --version`
- [x] 検証: `codex mcp list`
- [x] 検証: `bash -n devinit.sh scripts/dev/run-codex-pane.sh scripts/dev/capture-codex-pane-evidence.sh scripts/dev/run-copilot-pane.sh scripts/dev/capture-copilot-pane-evidence.sh`
- [x] 検証: `npm test`
- [x] レビュー: ロジック破綻、設計原則違反、不要な複雑化がないか確認する
- [ ] コミット前: 本計画を `docs/exec-plans/completed/` に移動する
- [ ] コミット: Conventional Commits 形式でコミットする
- [ ] プッシュ: `main` を SSH 経由で `origin/main` にプッシュする

## 実施結果

- RED: `tests/devinit.test.js` は `run-codex-pane.sh` 不在と `devinit.sh` の Copilot 主経路により失敗した。
- RED: `tests/repo-layout.test.js` の Codex 設定テストは MCP server 設定不足で失敗した。
- GREEN: `node --test tests/devinit.test.js` は成功した。
- GREEN: `node --test --test-name-pattern "keeps shared Codex settings" tests/repo-layout.test.js` は成功した。
- `codex --version` は `codex-cli 0.121.0` を返した。
- `codex mcp list` は `oh-my-tradingview` を enabled として表示した。
- shell syntax check は成功した。
- `timeout 180 npm test` は既存の campaign / repo-layout / night-batch / windows-run-night-batch-self-hosted 系で失敗またはタイムアウトした。今回変更した `tests/devinit.test.js` は全体テスト内でも成功している。

## テスト戦略

- TDD: `tests/devinit.test.js` と `tests/repo-layout.test.js` で RED -> GREEN -> REFACTOR を実施する
- dev session wrapper は shell script なので `bash -n` で syntax を確認する
- Codex CLI 本体の起動はユーザー操作を巻き込むため、非対話の `codex --version` / `codex mcp list` までを自動検証にする
- `npm test` は実行する。ただし現時点で campaign / night-batch 系に既存失敗があるため、今回変更起因の失敗かどうかを切り分ける

## 既知の既存テスト失敗

直前の `timeout 180 npm test` では次が失敗またはタイムアウトした。

- `tests/campaign.test.js`
  - `next-long-run-us-12.json`
  - `next-long-run-jp-12.json`
  - `next-long-run-us-12x10.json`
  - `next-long-run-jp-12x10.json`
  - 上記が `config/backtest/.../current/` にない
- `tests/repo-layout.test.js`
  - campaign / universe current/archive 整合性
- `tests/windows-run-night-batch-self-hosted.test.js`
  - foreground config の default campaign が期待値と不一致
- `tests/night-batch.test.js`
  - 180秒上限で未解決 Promise

今回の Codex 移行ではこれらの campaign / night-batch 整合性は修正しない。

## リスクと注意点

- `just dev` の pane 0 が `codex` になるため、tmux health check の期待値が変わる
- Codex CLI の設定キーは `codex-cli 0.121.0` のローカル help と `codex mcp add` の実出力に基づく
- `approval_policy = "on-request"` は低摩擦だが、repo の PLAN 承認ルールは引き続き守る
- 旧 Copilot CLI 経路は完全削除しない。問題があれば legacy target から戻せる
- `.github/copilot-instructions.md` は GitHub Copilot 用ファイル名として残す

## スコープ外

- `src/cli/` の削除・無効化
- TradingView MCP tool の機能変更
- night-batch / campaign 既存失敗の修正
- Codex CLI の認証情報やトークンのコミット
- SSH 鍵の作成・登録
