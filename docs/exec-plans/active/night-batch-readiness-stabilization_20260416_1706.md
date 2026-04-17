# Night Batch Self Hosted readiness stabilization / 再発防止 exec-plan

## 目的

GitHub Actions `Night Batch Self Hosted` の最新失敗 run `24523136387` における `start-night-batch` / `Run smoke gate and foreground production` 失敗を、**直接原因の解消**と**再発防止策の実装前提整理**まで含めて安定化する。  
今回の本命は、**親側 readiness gate を child 側 status preflight 契約に揃えること**、および **welcome / offer 系の transient dialog が chart API を塞ぐケースを health/status 側でも吸収または明示分類できるようにすること**。

## 背景 / 現状認識

- 最新失敗 run では workflow の `Ensure TradingView is running` は success。
- その後、親側では `python/night_batch.py` の startup/preflight が `172.31.144.1:9223` に対して `/json/list` ベースで `Preflight OK` を出している。
- しかし child 側 `scripts/backtest/run-finetune-bundle.mjs` は `tv status` を用いたより厳密な preflight を行い、`success===true && api_available===true` を満たせず、
  `Fatal: No requested worker port passed status preflight (9223)` で終了している。
- 最新 success SHA `298afd5b...` と latest failure SHA `65d3f6d...` の差分は campaign 名変更のみで、workflow / runner / `python/night_batch.py` / `scripts/windows/run-night-batch-self-hosted.cmd` には差分がない。
- `src/core/health.js` は chart API が読めないと error 扱いにする一方、`src/core/backtest.js` にある `dismissTransientDialogs()` は health/status 側で使われていない。
- README には WSL 側 `9223` 到達性に関して Firewall / portproxy の注意が既にある。
- 既存 runbook では `dialog-window ... type=welcome` が出ていないことを正常期待値としており、popup 系 UI が readiness を阻害しうる前提は既にある。

## 高確度な判断

1. **直接原因**は child 側 status preflight failure。
2. **背景要因**は以下の複合とみなすのが妥当。
   - `9223` bridge が未準備または不安定
   - welcome / offer / onboarding dialog により chart API が塞がれる
   - 親と子で readiness 判定基準がズレている
3. **再発防止の主軸**は以下。
   - `python/night_batch.py` / workflow 側 gate を child 側 `tv status` 契約へ整合
   - health/status 側でも transient dialog dismiss + retry を扱う
   - `9223` 到達性と readiness failure 理由を切り分けられる診断ログを残す

## スコープ

### 含む

- 親側 (`python/night_batch.py`) の readiness gate を child 側 preflight 契約と整合させる変更
- `src/core/health.js` で transient dialog dismiss / readiness retry を扱うための実装
- 必要に応じた shared helper 抽出による `backtest` と `health/status` の共通化
- workflow 側の診断ログ / summary 強化
- 上記を固定する regression test 追加・更新
- 実装差分に直結する README の troubleshooting 更新（必要な場合のみ）

### 含まない

- TradingView Desktop の認証フロー自動化
- Firewall / portproxy の自動設定
- campaign 定義や bundle 内容の変更
- self-hosted runner 全体構成の刷新
- 無関係な workflow / docs / test の整理

## 変更対象ファイル

### 主要変更対象

- `.github/workflows/night-batch-self-hosted.yml`
- `python/night_batch.py`
- `src/core/health.js`
- `src/core/backtest.js`

### 既存テスト更新対象

- `tests/night-batch.test.js`
- `tests/windows-run-night-batch-self-hosted.test.js`

### 追加候補ファイル

- `src/core/tradingview-readiness.js`  
  - dialog dismiss / retry / readiness classification を shared 化する場合
- `tests/tradingview-readiness.test.js`  
  - helper 単体テストを切り出す場合
- `tests/health.test.js`  
  - health/status 挙動の単体テストを独立させる場合
- `README.md`  
  - diagnosis / readiness troubleshooting を補強する場合
- `scripts/backtest/run-finetune-bundle.mjs`  
  - child 側 failure message / diagnostics を親と揃える必要がある場合のみ

## 実装方針

### 1. readiness 契約の一本化

- 親側の `/json/list` に chart target が見えるだけでは成功扱いしない。
- child 側と同じく、**`tv status` 相当の `success===true && api_available===true`** を満たした時のみ readiness 成功とする。
- これにより「親は通るが子は落ちる」という今回のズレを gate 手前で止める。

### 2. transient dialog 対応の共通化

- `src/core/backtest.js` にある `dismissTransientDialogs()` 相当を、`health/status` 側からも使える形へ寄せる。
- 対象は transient dialog に限定し、`close/閉じる/キャンセル` 系ボタンや `Escape` を使った dismiss を retry ループ内で実施する。
- health/status は **副作用を持つ status** になるため、閉じる対象の条件は厳格にする。

### 3. readiness retry と failure classification

- 単発失敗で即 fatal にせず、短い retry window 内で:
  - `9223` 到達性確認
  - dialog dismiss
  - chart API 再確認
  を行う。
- 最終失敗時は少なくとも以下に分類できるようにする。
  - bridge unreachable (`9223` connection refused / timeout)
  - chart target missing
  - chart API unavailable after retries
  - dialog suspected / detected

### 4. workflow 診断強化

- `Ensure TradingView is running` success だけでは不十分なので、`Run smoke gate and foreground production` 前後で、
  - Windows local `9222` 状態
  - WSL `9223` 到達性
  - `tv status` ベース readiness 結果
  を summary / diag log に残す。
- 失敗時 summary を見れば、**bridge 問題・popup 問題・契約不整合**を切り分けられる状態を目指す。

## TDD / 検証戦略

### RED

先に regression test を追加し、今回の失敗条件を固定する。

- `tests/night-batch.test.js`
  - `/json/list` では chart target が見えるが、`tv status` 契約では `api_available=false` になるケースを失敗として扱うテスト
  - 親側が child より甘い readiness 判定をしてしまう現行挙動を再現する failing test
- `tests/windows-run-night-batch-self-hosted.test.js`
  - workflow に readiness diagnostics / summary 強化 step が存在することを検証する failing test
- 追加 test file を作る場合
  - dialog dismiss 後 retry で `api_available=true` なら成功
  - dismiss 後も `api_available=false` なら readiness timeout / classified failure
  - `9223` connection refused は bridge failure として分類

### GREEN

- shared helper 抽出または `health.js` への最小追加で RED を解消
- `python/night_batch.py` を child 側 readiness 契約に揃える
- workflow 診断を追加し、テストを通す

### REFACTOR

- `backtest` と `health/status` の dialog 対応重複を整理
- retry / classification の責務を helper に寄せ、見通しをよくする
- エラーメッセージと summary の表現を統一する

### カバレッジ方針

- 既存 repo には coverage 専用コマンドがないため、新規 coverage ツール導入はしない。
- 代わりに、今回の重要分岐
  - bridge failure
  - chart target only
  - dialog-dismiss recovery
  - retry timeout
  を明示的にテスト化し、変更箇所の実質 80% 以上の分岐網羅を狙う。

## 検証コマンド

### 変更直後の関連テスト

```bash
node --test tests/night-batch.test.js tests/windows-run-night-batch-self-hosted.test.js
```

### helper / health 用の新規テストを追加した場合

```bash
node --test tests/night-batch.test.js tests/windows-run-night-batch-self-hosted.test.js tests/tradingview-readiness.test.js
```

または

```bash
node --test tests/night-batch.test.js tests/windows-run-night-batch-self-hosted.test.js tests/health.test.js
```

### 回帰確認

```bash
npm run test
```

### 実機確認（可能な場合）

```bash
node src/cli/index.js status
```

```bash
python3 python/night_batch.py smoke-prod --config config/night_batch/bundle-foreground-reuse-config.json --dry-run
```

必要に応じて self-hosted runner 上で foreground 実行相当を確認し、workflow summary / artifact に readiness diagnostics が残ることを確認する。

## リスク / 注意点

- `health/status` に dialog dismiss を入れることで status 呼び出しに副作用が入るため、誤 dismiss を避ける設計が必要。
- retry を長くしすぎると workflow の待ち時間増・ハング誤認につながる。
- 親側で child 契約を再現するための実装境界が曖昧だと、Node/Python 間の責務が崩れやすい。
- popup 文言は将来変動しうるため、文言一致だけでなく Escape や dialog 種別ベースの吸収も検討する。
- summary 強化は useful だが、summary 生成自体が失敗原因を隠さないよう fail-safe に保つ必要がある。

## 実装ステップ

- [ ] `tests/night-batch.test.js` に、**親 `/json/list` preflight success / child `tv status` failure** のズレを再現する failing regression test を追加する
- [ ] `tests/windows-run-night-batch-self-hosted.test.js` に、workflow が readiness diagnostics / summary を出すことを固定する failing test を追加する
- [ ] 必要なら `src/core/tradingview-readiness.js` を新設し、dialog dismiss / retry / failure classification の shared helper 設計を固める
- [ ] `src/core/backtest.js` の transient dialog dismiss ロジックを shared 化するか、`health/status` から安全に再利用できる形へ寄せる
- [ ] `src/core/health.js` に dialog-dismiss + readiness retry を追加し、`api_available===true` を readiness 成功条件として明示する
- [ ] `python/night_batch.py` の preflight / smoke gate を child 側 status preflight と整合させ、chart target only では進まないようにする
- [ ] 必要に応じて `scripts/backtest/run-finetune-bundle.mjs` の diagnostics / error 文言を親側 classification と揃える
- [ ] `.github/workflows/night-batch-self-hosted.yml` に `9222/9223` と readiness 状態を出す診断ログ or summary 強化を追加する
- [ ] 必要な場合のみ `README.md` の troubleshooting を実装差分に合わせて更新する
- [ ] `node --test ...` で関連テストを通し、最後に `npm run test` を実行して回帰確認する
- [ ] 実機確認可能なら `tv status` と `python3 python/night_batch.py smoke-prod ...` 系で readiness diagnostics の見え方を確認する

## 完了条件

- 親側 gate が child 側と同等の readiness 契約で動作し、今回のような **親 OK / child NG** のズレが解消されている
- welcome / offer 系 popup による一時的な chart API blocking を `health/status` 側で吸収または明示分類できる
- workflow summary / logs から、少なくとも **bridge / dialog / readiness timeout** の主要原因が切り分けられる
- 追加した regression test と関連既存テストが通る
- 既知 active plan `plans/exec/active/repo-information-architecture-restructure_20260416_0845.md` と競合しない状態で着手できる
