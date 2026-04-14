# 実行計画: checkpoint再開 + sequential/visible default backtest への移行 (20260410_1052)

- ステータス: PLAN
- 前提ブランチ: `main`
- 種別: backtest orchestration / config policy / docs update
- 旧active planとの関係: `docs/exec-plans/completed/rich-results-finetune-parallel-backtest_20260409_1525.md` を本計画で置換する

## 背景と方針

現行の fine-tune 再開導線は、`smoke -> pilot -> full` と dual-worker / parallel-first を前提にしている。
今回の承認済みスコープでは、以下を新しい標準ルールとして揃える必要がある。

1. 中断された backtest を最後の checkpoint から再開できること
2. **sequential execution を default** にすること
3. **Session1 visible (`9225`) を default** にし、ユーザーが Desktop の動きを監視できること
4. minimum flow を **`smoke -> full`** に変更し、`pilot` を標準フローから外すこと
5. 優先順位を **「session1可視化を最優先（9225単独を基本、必要時のみ9223へ退避）」** に統一すること

本計画では、parallel capability や `pilot` 実装を即時に完全削除するのではなく、**非既定・明示 opt-in に格下げ**する方針を取る。これにより、履歴互換性は残しつつ、日常運用の既定値・ドキュメント・再開手順を新ルールへ統一する。

## 既存active planとの重複と扱い

重複対象:

- `docs/exec-plans/completed/rich-results-finetune-parallel-backtest_20260409_1525.md`

重複内容:

- fine-tune backtest の再開
- bundle runner / long campaign runner の運用整理
- worker port と phase 運用の定義
- command / runbook 更新

本計画で上書きする判断:

- **parallel-first** をやめ、**sequential-default** に切り替える
- **smoke -> pilot -> full** をやめ、**smoke -> full** に切り替える
- **9223 first / dual-worker fallback** をやめ、**9225 visible first / 9223 fallback** に切り替える

運用上の扱い:

1. 旧 plan は履歴保持のため `completed/` に移動し、active から外す
2. 実装は本計画のみを正本として進める
3. 旧 plan に紐づく `pilot` checkpoint や parallel runbook は historical artifact として参照だけ残す

## 変更・作成・削除対象ファイル

### 変更対象

- `scripts/backtest/run-finetune-bundle.mjs`
- `scripts/backtest/run-long-campaign.mjs`
- `config/backtest/campaigns/next-long-run-us-finetune-100x10.json`
- `config/backtest/campaigns/next-long-run-jp-finetune-100x10.json`
- `tests/campaign.test.js`
- `docs/command.md`
- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`

### 作成対象

- `docs/exec-plans/active/checkpoint-resume-sequential-visible-backtest_20260410_1052.md`
- 必要なら runner の既定値と resume 条件を固定する追加テスト
  - `tests/run-finetune-bundle.test.js`
  - `tests/run-long-campaign.test.js`

### 削除または非推奨化対象

- `pilot` を標準フローとして案内する command example / runbook 記述
- parallel-first を標準運用として案内する command example / runbook 記述
- `9223,9225` 同時指定を既定値として扱う記述

## 実装スコープ

1. **checkpoint 再開方針の整理**
   - 同一 phase の checkpoint から安全に resume できる既定フローを明確化する
   - `run-finetune-bundle` からも sequential-default 前提で resume しやすい導線へ寄せる
   - phase 跨ぎ resume を誤って許さないガードを整理する

2. **sequential-default 化**
   - bundle / campaign の default 実行を単一 worker 前提へ変える
   - parallel は完全削除せず、**明示的な opt-in 指定時のみ**使える形に留める

3. **Session1 visible default 化**
   - 既定ポートを `9225` に変更する
   - preflight / status / command examples / runbook を `9225` 第一選択で統一する
   - `9225` 不調時のみ `9223` fallback を使うルールを明文化する

4. **pilot の標準フロー除去**
   - bundle default phases を `smoke,full` に変更する
   - fine-tune campaign config の標準 phase 定義も `smoke` / `full` 中心に整理する
   - `pilot` は互換目的で残すとしても、default / docs / examples から外す

5. **ドキュメントと運用ルール更新**
   - `docs/command.md` を visible sequential standard に更新する
   - dual-worker parallel runbook を「利用可能だが非既定」の位置づけへ落とし、新標準を `9225 visible / sequential / smoke->full` に書き換える

## Out of scope

- TradingView Desktop 自体の恒久安定化
- 9223/9225 の同時運用品質をさらに高める改善
- 4 worker 以上への拡張
- ranking / rich report 生成ロジックの全面見直し
- unrelated refactor
- 旧 `pilot` 成果物を `full` 用 checkpoint へ変換する移行ツール作成

## pilot checkpoint の扱い

方針: **historical artifact として保持し、full 再開には流用しない**。

対象:

- `docs/research/results/campaigns/next-long-run-us-finetune-100x10/pilot/checkpoint-50.json`

判断理由:

- phase が異なるため、`pilot -> full` の resume は checkpoint fingerprint / matrix の意味でも安全ではない
- 新ルールでは `pilot` 自体を最低限フローから外すため、旧 pilot checkpoint を正規再開導線に含めない方が安全

実装時の扱い:

1. 旧 `pilot` checkpoint は削除せず履歴として残す
2. 新ルールの resume 対象は **同一 phase (`smoke` または `full`) の checkpoint** に限定する
3. 今回の再開は、必要なら `smoke` の妥当性確認後に **`full` を新規開始**する計画とする

## 想定する将来の再開運用（実装後の標準）

最も安全な再開方針は次の通りとする。

1. `TV_CDP_PORT=9225` で `status` / preflight を確認する
2. 問題なければ **Session1 visible の 9225 単独で smoke** を実行する
3. smoke 成果物が十分で再実行不要と判断できる場合は、その確認だけで full に進む
4. smoke の信頼性が曖昧なら、`9225` で smoke を再実行する
5. その後 **9225 単独の sequential full** を開始する
6. 中断時は **full phase の最新 checkpoint から resume** する
7. `9225` が使えない場合のみ `9223` へ退避する
8. parallel 実行は、明確な必要性がある場合だけ opt-in で使う

## 設計判断

### 1. parallel capability の扱い

- **完全削除はしない**
- **default は sequential**
- **parallel は明示 opt-in** にする

理由: 既存コード資産を壊さず、標準運用だけを安全側へ倒せるため。

### 2. Session1 visible default をどの層で表現するか

以下の複数層で揃える。

- `scripts/backtest/run-finetune-bundle.mjs` の default
- `scripts/backtest/run-long-campaign.mjs` の default worker selection / resume guidance
- fine-tune campaign config の `execution.worker_ports` など既定設定
- `docs/command.md` の手順とコマンド例
- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md` の運用ルール

### 3. pilot の除去レベル

- **minimum flow からは除去**する
- ただし即削除ではなく、**非既定・互換モード**として残す案を優先する

### 4. 既存 pilot checkpoint の扱い

- **full へ流用しない**
- 履歴保持のみ
- 新標準では `smoke` 確認後に `full` を新規開始、以後は `full` checkpoint で resume する

## テスト戦略（RED -> GREEN -> REFACTOR）

### RED

先に失敗テストを追加して、新ルールとの差分を固定する。

- default port が `9225` でない場合に落ちるテスト
- default phases に `pilot` が残っている場合に落ちるテスト
- 明示していないのに multi-port / parallel 実行になる場合に落ちるテスト
- 同一 phase checkpoint のみ許可されることを確認する resume テスト
- `pilot` checkpoint を `full` に誤流用できないことを確認するテスト

### GREEN

- runner / campaign config / docs の既定値を新ルールに揃える最小変更を入れる
- sequential default, visible default, smoke->full default, same-phase resume guard を通す

### REFACTOR

- default 解決ロジックや phase/resume 判定の重複だけを最小限整理する
- 互換コードが複雑化する場合のみ helper 抽出を行う

## 検証コマンド

既存の repo / script コマンドのみを使う。

### Focused validation

- `node --test tests/campaign.test.js`
- `node scripts/backtest/run-finetune-bundle.mjs --dry-run`
- `node scripts/backtest/run-long-campaign.mjs next-long-run-us-finetune-100x10 --phase smoke --dry-run`
- `node scripts/backtest/run-long-campaign.mjs next-long-run-jp-finetune-100x10 --phase smoke --dry-run`

### Repo validation

- `npm test`
- `npm run test:e2e`
- `npm run test:all`

### Operational validation

- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status`
- 必要時のみ `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status`

## リスク

1. **resume 境界の誤解**
   - phase 跨ぎ resume を許すと誤再開の危険がある
2. **docs と実装の乖離**
   - default を変えても command / runbook が旧ルールのままだと運用事故になる
3. **9225 visible default の環境依存**
   - Session1 の可視性が崩れる環境では fallback 条件の明確化が必要
4. **pilot 非標準化の互換性**
   - 既存スクリプトや手順が `pilot` 前提なら影響調査が必要
5. **parallel opt-in の残存複雑性**
   - capability を残す分、default path と opt-in path の分岐テストが必要になる

## 実装チェックリスト

- [ ] 旧 active plan を superseded 扱いにし、本計画を唯一の active plan とする
- [ ] `run-finetune-bundle` の default ports / phases / execution policy を固定する失敗テストを追加する
- [ ] `run-long-campaign` の sequential default / same-phase resume guard を固定する失敗テストを追加する
- [ ] default を `9225` 単独・sequential に変更する
- [ ] parallel 実行を明示 opt-in に変更する
- [ ] minimum flow を `smoke -> full` に変更し、`pilot` を default / docs / examples から外す
- [ ] fine-tune campaign config の `worker_ports` / phase 定義を新ルールに合わせて更新する
- [ ] 旧 `pilot` checkpoint を historical artifact として扱う文言とガードを入れる
- [ ] `docs/command.md` を `9225 default / 9223 fallback / smoke->full` に更新する
- [ ] dual-worker parallel runbook を sequential visible default 前提に更新する
- [ ] dry-run と既存 test コマンドで新ルールの既定値を検証する
- [ ] 実装後の最終 resume 手順を docs に明記する

## 承認時確認事項

1. 新標準運用は **`9225` 単独・sequential・`smoke -> full`** とする
2. parallel と `pilot` は **完全削除ではなく非既定化** を優先する
3. 既存 `pilot` checkpoint は **履歴保持のみ** とし、`full` へは流用しない
4. 今回の再開は、原則として **Session1 visible の 9225 を最優先**し、必要時のみ `9223` に退避する
