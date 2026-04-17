# night-batch-smoke-cli-recovery_20260417_1042

## 目的

- 最新の `Night Batch Self Hosted` 失敗 run（`24543032591` / attempt `2`）における smoke 失敗の直接原因を解消し、同系統の再発を防ぎつつ、**実ワークフロー実行で smoke step が通るまで検証を継続**する。

## 背景/現状

- 失敗箇所は workflow `Night Batch Self Hosted` の `Run smoke gate and foreground production`。
- job log では `/json/list` ベースの preflight は繰り返し成功している一方、`python/night_batch.py` の `readiness_check()` が `node src/cli/index.js status` 実行結果を JSON として解釈できず、`api_available=None, error=unknown` で落ちている。
- 現行 `main` でも以下が再現する。  
  `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status`
- 実際の失敗は CDP 未到達ではなく、CLI 起動時に  
  `SyntaxError: The requested module '../../core/market-intel.js' does not provide an export named 'getTradingViewFinancialsBatch'`
  で command dispatch 前に異常終了している。
- `src/cli/commands/market-intel.js`、`src/tools/market-intel.js`、`src/core/index.js` は `getTradingViewFinancialsBatch`（および関連 export 契約）に依存しているが、`src/core/market-intel.js` 側に実体がない。
- workflow の `Readiness diagnostics` でも `TV_CDP_HOST=$(python3 -c ...) TV_CDP_PORT=$(python3 -c ...) node ...` の quoting が壊れており、診断ログ自体が誤誘導になっている。
- 既存 active plan `plans/exec/active/repo-information-architecture-restructure_20260416_0845.md` は repo 情報設計の整理が主題であり、本件の smoke root cause 修正とは直接競合しない。今回の対応は **CLI status 起動破綻 / diagnostics quoting / readiness error surfacing** に狭く限定する。

## スコープ

### 含む

- `src/core/market-intel.js` とその利用箇所の **CLI import/export 破綻修正**
- `python/night_batch.py` の `readiness_check()` における **非 JSON 失敗時の原因可視化強化**
- `.github/workflows/night-batch-self-hosted.yml` の **Readiness diagnostics quoting 修正**
- 上記を固定する **回帰テスト追加/更新**
- **ローカル再現 → 既存テスト → 実 workflow 実行** の順で検証し、smoke step 実通過まで反復すること

### 含まない

- popup/welcome/offer 対応の広域化
- `src/core/health.js` / `src/core/backtest.js` の大きな readiness 再設計
- self-hosted runner 全体構成、Firewall、portproxy の変更
- campaign や bundle 定義の変更
- 無関係な market-intel 機能拡張や大規模整理

## 変更対象ファイル

- `src/core/market-intel.js`
- `src/core/index.js`
- `src/cli/commands/market-intel.js`
- `src/tools/market-intel.js`
- `python/night_batch.py`
- `.github/workflows/night-batch-self-hosted.yml`
- `tests/market-intel.test.js`
- `tests/night-batch.test.js`
- `tests/windows-run-night-batch-self-hosted.test.js`

## 実装方針

### 1. CLI import/export 破綻を最小差分で修正する

- `status` が market-intel command 読み込み時点で落ちないよう、`src/core/market-intel.js` に **不足している export 契約を復旧**する。
- 方針は **広い作り直しではなく、既存 CLI/MCP surface が要求する named export を最小限で満たす**ことを優先する。
- `src/core/index.js` / `src/cli/commands/market-intel.js` / `src/tools/market-intel.js` との整合も同時に確認し、**module graph 全体で import 時に落ちない状態**を作る。

### 2. readiness_check の失敗理由を `unknown` のまま捨てない

- `python/night_batch.py` の `readiness_check()` は、`tv status` の stdout/stderr が JSON でない場合でも、**exit code・stderr/stdout 抜粋・CLI bootstrap failure** を分かる形で報告する。
- これにより、今後同様の CLI 起動失敗が起きても `api_available=None, error=unknown` ではなく、ログだけで根因に到達できるようにする。

### 3. workflow diagnostics の quoting を修正し、診断を信用できる状態に戻す

- `cmd` → `wsl bash -lc` → `python3 -c` の多重 quoting を安全な形に組み替える。
- `TV_CDP_HOST` / `TV_CDP_PORT` の解決と `node src/cli/index.js status` 実行を分離し、**command substitution 崩れが起きない構造**にする。
- diagnostics は smoke 前の補助情報に徹し、失敗時に「CDP未到達」なのか「CLI bootstrap failure」なのかを切り分けられる出力にする。

### 4. 実ワークフローで smoke が通るまで閉じない

- ローカルで `node src/cli/index.js status` の復旧を確認しただけでは完了にしない。
- 既存テスト通過後、`gh` で対象 workflow を再実行/dispatch し、**実際の `Run smoke gate and foreground production` が成功するまで観測・修正・再検証を継続**する。

## TDD/検証戦略 (RED/GREEN/REFACTOR)

### RED

- `tests/market-intel.test.js`
  - `getTradingViewFinancialsBatch` の export 契約が満たされることを検証する failing test
  - import 時点で module graph が壊れないことを検証する回帰テスト
- `tests/night-batch.test.js`
  - `tv status` が **非 JSON の SyntaxError** を返したとき、`readiness_check()` が `error=unknown` ではなく、stderr/stdout 抜粋や exit code を含む failing test
- `tests/windows-run-night-batch-self-hosted.test.js`
  - `Readiness diagnostics` が安全な quoting で host/port を解決し、`tv status` を呼ぶことを固定する failing test
  - 既存の壊れた `$(python3 -c ...)` 直書き構造に戻らないことを検証する

### GREEN

- export 契約を復旧して `node src/cli/index.js status` の bootstrap failure を解消する
- `readiness_check()` のエラー報告を改善する
- workflow diagnostics の quoting を修正する
- 追加した回帰テストを通す

### REFACTOR

- 今回の修正範囲内でのみ、重複した失敗整形や market-intel wrapper を軽く整理する
- popup/readiness 共通化のような広い refactor には踏み込まない

## 検証コマンド

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
```

```bash
node --test tests/market-intel.test.js tests/night-batch.test.js tests/windows-run-night-batch-self-hosted.test.js
```

```bash
npm run test
```

```bash
gh workflow run ".github/workflows/night-batch-self-hosted.yml" -f config_path=config/night_batch/bundle-foreground-reuse-config.json
```

```bash
gh run list --workflow "Night Batch Self Hosted" --limit 5
```

```bash
gh run watch <run-id>
```

## リスク/注意点

- 既存 active plan とはテーマが異なるが、変更が readiness 周辺に触れるため、**今回の対応は import/export 破綻・diagnostics quoting・error surfacing に限定**し、広域安定化へ拡張しない。
- `src/core/market-intel.js` の export 復旧は、既存 CLI/MCP surface を壊さない形で行う必要がある。
- `readiness_check()` のログ強化は有用だが、stderr/stdout 全量垂れ流しではなく、要点を保った整形にする。
- workflow の quoting 修正は Windows `cmd` / WSL `bash` の境界が壊れやすいため、文字列埋め込みを最小化する。

## 実装ステップ

- [ ] `tests/market-intel.test.js` に不足 export 契約 / import 時 bootstrap failure 回帰の failing test を追加する
- [ ] `tests/night-batch.test.js` に `tv status` 非 JSON 失敗時の error surfacing 回帰 test を追加する
- [ ] `tests/windows-run-night-batch-self-hosted.test.js` に diagnostics quoting 回帰防止 test を追加する
- [ ] `src/core/market-intel.js` に必要な export を最小差分で復旧し、`src/core/index.js`・`src/cli/commands/market-intel.js`・`src/tools/market-intel.js` との契約を揃える
- [ ] `python/night_batch.py` の `readiness_check()` を修正し、非 JSON / SyntaxError / exit code を読み取れる failure message に改善する
- [ ] `.github/workflows/night-batch-self-hosted.yml` の `Readiness diagnostics` を安全な quoting に修正する
- [ ] `node --test tests/market-intel.test.js tests/night-batch.test.js tests/windows-run-night-batch-self-hosted.test.js` を通す
- [ ] `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status` を再実行し、CLI が SyntaxError で落ちないことを確認する
- [ ] `npm run test` を実行して全体回帰を確認する
- [ ] `gh workflow run ...` で `Night Batch Self Hosted` を実行し、`gh run watch` / `gh run view --log-failed` で smoke step を観測する
- [ ] 実 run が失敗した場合は、今回スコープ内で解決可能な差分のみ追加修正し、**smoke pass まで再実行を継続**する

## 完了条件

- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status` が **SyntaxError で落ちず**、正常に status 応答できる
- `python/night_batch.py` の `readiness_check()` が非 JSON 失敗時にも **`error=unknown` ではなく具体的原因**を出力できる
- `.github/workflows/night-batch-self-hosted.yml` の `Readiness diagnostics` が quoting 崩れなしで動作する
- `tests/market-intel.test.js` / `tests/night-batch.test.js` / `tests/windows-run-night-batch-self-hosted.test.js` と `npm run test` が通る
- **実 GitHub Actions 実行で `Run smoke gate and foreground production` が成功**する
