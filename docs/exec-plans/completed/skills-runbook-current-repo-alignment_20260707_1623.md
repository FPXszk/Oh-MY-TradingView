# skills-runbook-current-repo-alignment_20260707_1623

## 目的

`.agents/skills/` 配下のスキルを、現行の Oh-MY-TradingView の code / CLI / MCP tool / GitHub Actions / docs / tests を正本として整理する。別リポジトリ由来の workflow、廃止済みコマンド、存在しないファイル・テスト・artifact 前提を削除し、今後の再混入を最小限の contract test で検出できるようにする。

## 事前確認

確認済み:

- `AGENTS.md`
- `README.md`
- `.github/copilot-instructions.md`
- `docs/DOCUMENTATION_SYSTEM.md`
- `package.json`
- `src/server.js`
- `src/cli/commands/`
- `src/tools/`
- `.github/workflows/`
- `.agents/skills/`

現行正本として確認した主な事実:

- Windows native / PowerShell、repo root は `C:\00_mycode\Oh-MY-TradingView` が current default。
- 実在 workflow は `daily-screener.yml`、`daily-screener-japan.yml`、`moomoo-portfolio-diagnostics.yml`、`night-batch-self-hosted.yml`、`night-batch-smoke.yml`、`portfolio-health-check.yml`、`sbi-portfolio-capture.yml`。
- `package.json` の主検証コマンドは `npm run test:unit`、`npm run test:contract`、`npm run test:night-batch`、`npm run test:e2e`、`npm run test:all`。
- MCP の Twitter/X は `x_status`、`x_whoami`、`x_search_posts`、`x_user_profile`、`x_user_posts`、`x_tweet_detail` の read-only。
- CLI の Twitter/X は `tv x status`、`tv x whoami`、`tv x search`、`tv x user`、`tv x user-posts`、`tv x tweet` の read-only。
- Moomoo MCP tool は `moomoo_health_check`、`moomoo_accounts`、`moomoo_positions`、`moomoo_balance`、`moomoo_orders`、`moomoo_deals`、`moomoo_portfolio`、`moomoo_snapshot`、`moomoo_kline_history`、`moomoo_stock_filter_fields`、`moomoo_stock_filter`、`moomoo_plate_list`、`moomoo_plate_stocks`、`moomoo_plate_breadth`、`moomoo_ohlc_compare`、`moomoo_screening_validate`、`moomoo_fundamental_probe`。
- Moomoo CLI command は現行 `src/cli/index.js` には登録されていないため、スキルでは MCP / script / workflow 導線として扱う。
- Night Batch Self Hosted の artifact 名は `night-batch-${{ github.run_id }}-${{ github.run_attempt }}`。
- Night Batch 出力探索は `scripts/windows/github-actions/find-night-batch-outputs.ps1` が summary JSON 起点で `*-combined-ranking.json`、`*-rich-report.md`、`*-live-checkout-protection.json`、campaign manifest、campaign artifact dirs を探す。
- `tests/documentation-navigation.test.js` は README / docs から参照されているが現ワークツリーには存在しない。`tests/archive-latest-policy.test.js` は存在する。`tests/repo-layout.test.js` も存在しない。
- `japanese-post-humanizer` を参照する現行 code / workflow / prompt / test は見つからない。現行 Twitter/X は read-only で投稿機能なし。
- active plan は空。作業開始時点の `git status --short` はクリーン、branch は `main`、remote は SSH。

## 変更・削除・作成するファイル

### 修正するファイル

- `.agents/skills/github-actions-failure-debugging/SKILL.md`
- `.agents/skills/twitter-cli/SKILL.md`
- `.agents/skills/backtest-results-capture/SKILL.md`
- `.agents/skills/tradingview-research-capture/SKILL.md`
- `.agents/skills/repo-planning-discipline/SKILL.md`
- `.agents/skills/tradingview-operator-playbook/SKILL.md`
- `package.json`
- `README.md`

### 削除するファイル

- `.agents/skills/japanese-post-humanizer/SKILL.md`

### 作成するファイル

- `tests/skills-contract.test.js`
- 必要に応じて `tests/documentation-navigation.test.js`

`tests/documentation-navigation.test.js` は現行 README / `docs/DOCUMENTATION_SYSTEM.md` が参照しているのに存在しないため、今回の README / docs 導線確認の検証コマンドを成立させるために追加候補とする。実装時に既存の completed plan と現行 README の期待に合わせ、ローカル Markdown link と主要 docs 入口だけを確認する最小テストに留める。

## 各スキルの変更内容

### 1. `github-actions-failure-debugging`

- `post_buz.yml`、`auto_follow.yml`、`auto_like.yml`、`morning_post.yml`、`evening_post.yml`、`twitter_diagnostic.yml`、`ci.yml`、`python3 -m unittest discover -s tests` 前提を削除する。
- 現行 workflow 7本を対象にした調査導線へ書き換える。
- GitHub MCP の特定 tool 名に固定せず、「利用可能なGitHub connector / gh CLI / UI / artifact download のうち高シグナルなものから使う」書き方にする。
- `night-batch-self-hosted.yml` / `night-batch-smoke.yml` では Windows self-hosted runner、TradingView CDP、readiness diagnostics、workflow summary、artifact、PowerShell/CMD差異、runner状態確認を扱う。
- screener / portfolio / moomoo workflows では artifact 名、publish step、LINE通知、CDP probe、Python/moomoo-api runtime、main publish race の確認観点を現行workflowに合わせる。
- テストコマンドは `package.json` の `test:*` scripts に合わせる。

### 2. `twitter-cli`

- read-only 専用スキルへ縮小する。
- 残す対象は認証状態、whoami、検索、user profile、user posts、tweet detail、`tv x ...`、MCP `x_*` tool。
- `post`、`reply`、`quote`、`delete`、`like`、`unlike`、`retweet`、`follow`、`unfollow`、bookmark、thread、大量write操作を削除する。
- Cookie全文をチャットへ貼らせる案内を削除する。
- repo内からは直接 `twitter` binary ではなく `tv x ...` または MCP `x_*` を優先する、と明記する。
- 外部 `twitter-cli` binary は read-only adapter 内部依存として説明する。

### 3. `backtest-results-capture`

- `night-batch-results` artifact 固定前提を削除する。
- artifact 名を `night-batch-{github.run_id}-{github.run_attempt}` として記載する。
- 展開直後rootに `strategy-ranking.json` / `recovered-results.json` がある前提を削除する。
- `find-night-batch-outputs.ps1` と workflow summary を正本に、summary JSON、summary MD、rich report、`*-combined-ranking.json`、protection report、campaign manifest、campaign artifact dirs を対象runの実ファイルから探索する手順へ修正する。
- `docs/research/TEMPLATE.md` と `docs/research/manifest.json` を引き続き正本にする。
- 古いrun固有値や固定campaign構造は使わない、と明記する。

### 4. `japanese-post-humanizer`

- 現行参照がなく、X投稿機能もないため削除する。
- 削除で壊れる現行機能が実装時の追加検索で見つかった場合は削除を止め、参照元と理由を報告する。

### 5. `tradingview-research-capture`

- 存在しない `tests/repo-layout.test.js` 参照を削除する。
- 現行 docs 導線と archive 運用に合わせ、実在または今回追加する `tests/documentation-navigation.test.js` と実在 `tests/archive-latest-policy.test.js` を検証コマンドにする。
- `docs/research/manifest.json`、`docs/references/design-ref-llms.md`、archive ルールを `docs/DOCUMENTATION_SYSTEM.md` と矛盾しない表現へ修正する。
- 古い `docs/research/current/` 表現が現行構造と矛盾する場合は削除または archive 説明へ置き換える。

### 6. `repo-planning-discipline`

- `SQL todos`、Session SQLite、3ステップ以上ならSQL必須、必須sub-agent review、session plan機能前提を削除する。
- `docs/exec-plans/active/` / `docs/exec-plans/completed/`、変更ファイル、影響範囲、テスト戦略、検証コマンド、リスク、active plan競合確認、ユーザー承認、計画と実装の対応確認に集中させる。
- AGENTS.md全文の重複コピーではなく、計画作成時の実務チェックリストとして整理する。
- 例示コマンドは Node repo の現行 scripts に合わせる。

### 7. `tradingview-operator-playbook`

- 現行 `src/server.js`、`src/tools/`、`src/cli/commands/` に合わせて decision tree / 対応表を更新する。
- 追加・確認する項目:
  - `tv_launch` / `tv launch`
  - `tv_launch_browser` / `tv launch-browser`
  - `tv_stream_price` / `tv stream`
  - `tv_layout_list` / `tv workspace layout-list`
  - `tv_layout_apply` / `tv workspace layout-apply`
  - `x_status` / `tv x status`
  - `x_whoami` / `tv x whoami`
  - `reach_status` / `tv reach status`
  - screener MCP `market_minervini_screener`、`market_fundamental_screener`
  - CLI `tv screener minervini`、`tv screener fundamental`
  - current market provider 方針: `market_*` は Moomoo を quote/TA/fundamentals の主経路にし、Yahoo は legacy opt-in / drift check に限定する。
  - Moomoo OpenAPI read-only MCP tool 一覧と用途別導線。
- 存在しない Moomoo CLI command は追加しない。

### 8. `research-playbook`

- 原則変更しない。
- 実装時に明確な現行repo矛盾が見つかった場合のみ、最小限修正する。

## Contract Test 設計

`tests/skills-contract.test.js` を追加する。Markdown全文を完全解析しない、独自Markdown parserや巨大validation frameworkは作らない。

検査内容:

- `.agents/skills/*/SKILL.md` を列挙して読み取れること。
- 各 `SKILL.md` の先頭front matterに `name` と `description` があること。
- 禁止文字列が残っていないこと:
  - `post_buz.yml`
  - `auto_follow.yml`
  - `auto_like.yml`
  - `morning_post.yml`
  - `evening_post.yml`
  - `twitter_diagnostic.yml`
  - `python3 -m unittest discover -s tests`
  - `night-batch-results`
  - `SQL todos`
- 重要なrepo-local path参照が存在すること:
  - `.agents/skills/`
  - `docs/exec-plans/active/`
  - `docs/exec-plans/completed/`
  - `.github/workflows/night-batch-self-hosted.yml`
  - `scripts/windows/github-actions/find-night-batch-outputs.ps1`
  - `docs/research/manifest.json`
- 現在存在しない旧workflow名を記載していないこと。
- `twitter-cli` skill に write command 再混入がないこと。
- `backtest-results-capture` skill に `night-batch-results` 再使用がないこと。

`package.json` の `test:unit` に `tests/skills-contract.test.js` を追加する。`test:contract` へ入れるかは実装時に確認するが、最低限 `npm run test:unit` で再混入を検出できるようにする。

## README・docsへの影響

- `README.md` に `.agents/skills/` への最小導線を追加する。
- 内容は全文一覧ではなく、以下の方針だけを短く示す。
  - `.agents/skills/` はタスク別runbook。
  - code / config / tests が正本。
  - skillは補助的な判断ガイド。
  - skillとコードが矛盾する場合はコードを優先。
- README再構築方針を壊さず、既存の入口・タスク別ナビゲーションへ小さく足す。
- `docs/DOCUMENTATION_SYSTEM.md` は今回の直接修正対象にしない。ただし `tests/documentation-navigation.test.js` の追加で現行参照を検証できるようにする。

## 実装ステップ

- [ ] 対象スキルの現行矛盾を再検索し、旧workflow・旧test・write Twitter操作・Night Batch旧artifact前提の残存箇所を確認する。
- [ ] `github-actions-failure-debugging` を現行workflow / package scripts / Windows runner / CDP / artifact / summary 調査導線へ全面更新する。
- [ ] `twitter-cli` を read-only adapter runbook へ縮小する。
- [ ] `backtest-results-capture` を現行 Night Batch artifact / summary / campaign manifest 探索手順へ更新する。
- [ ] `japanese-post-humanizer` の参照がないことを再確認し、削除する。
- [ ] `tradingview-research-capture` の存在しないテスト参照と docs/research/current 表現を修正する。
- [ ] `repo-planning-discipline` から未実装ホスト前提を削除し、exec-planチェックリストへ整理する。
- [ ] `tradingview-operator-playbook` を現行 CLI / MCP tool surface、Moomoo、launch、layout、status、screener、provider方針へ更新する。
- [ ] `research-playbook` は明確な矛盾がない限り変更しない。
- [ ] `tests/skills-contract.test.js` を追加する。
- [ ] 必要に応じて `tests/documentation-navigation.test.js` を追加し、README / docs の既存参照を成立させる。
- [ ] `package.json` の `test:unit` に新規 contract test を追加する。
- [ ] `README.md` に `.agents/skills/` の最小導線を追加する。
- [ ] 差分を自己レビューし、計画外のコード変更がないことを確認する。

## 検証コマンド

最低限:

```powershell
node --test tests/skills-contract.test.js
node --test tests/documentation-navigation.test.js tests/archive-latest-policy.test.js
npm run test:unit
```

補足:

- `tests/documentation-navigation.test.js` は現時点で存在しないため、実装で追加するか、追加しない合理的理由が出た場合は実在テストへ検証コマンドを変更して報告する。
- E2E は今回の変更がスキル文書・README導線・contract test中心であり、TradingView Desktop / CDP 実機挙動を変更しないため原則実行しない。

## リスク

- `night-batch-results` は現行 `tests/night-batch.test.js` の一時ディレクトリ名として残っている。禁止対象は skill の旧artifact名再使用なので、contract test は `.agents/skills/` を中心にし、既存テストfixtureを誤検出しないようにする。
- `tests/documentation-navigation.test.js` が存在しないため、README / docs の既存参照と package script の整合を取る必要がある。
- `repo-planning-discipline` は今回の作業開始時にも使うスキルだが、その内容自体が修正対象。AGENTS.md を正本にして、古いskill記述へ合わせない。
- MoomooにはCLI commandが現状ないため、operator playbookでMCP toolとCLI commandを混同しない。
- GitHub Actions調査手順はGitHub MCPの可用性が環境ごとに違うため、特定tool名固定ではなく置換可能な導線として書く必要がある。

## 対象外

- `AGENTS.md` と `.github/copilot-instructions.md` の変更。
- 現行コードをスキルへ合わせる変更。
- Twitter/X write機能の追加、twitter-cli自体のアップグレード。
- 外部パッケージ最新版確認。
- TradingView Desktop / CDP を起動するE2E検証。
- 他リポジトリへの `japanese-post-humanizer` 移動。
- Night Batch実行やGitHub Actionsの新規手動dispatch。

## 承認条件

この計画が承認されたら、上記ステップに沿って実装し、テスト、自己レビュー、計画ファイルの `docs/exec-plans/completed/` への移動、Conventional Commits形式のコミット、SSH remote へのpushまで行う。
