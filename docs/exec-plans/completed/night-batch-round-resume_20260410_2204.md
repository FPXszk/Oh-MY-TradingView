# Exec Plan: night-batch-round-resume_20260410_2204

## 目的

`results/night-batch/` を `round1/`, `round2/` のようなラウンド単位で整理し、**同一戦略セットの再実行は current round を明示的に resume**、**次の改善イテレーションに進むときだけ next round を自動採番**する運用へ揃える。  
あわせて、途中中断時の checkpoint / 完了結果の再利用、WSL 向け手動コマンド整備、fine-tune smoke の 1 strategy × 1 symbol 化までを同一変更で完了させる。

---

## 設計方針

### 1. round の進め方は「自動採番」だが、起動モードは明示にする

ユーザー要件どおり **round 番号そのものは `results/night-batch` の既存 round を見て自動決定**する。  
ただし、`resume-current-round` と `advance-next-round` を曖昧に自動判定すると再実行時に round が勝手に進むため、**コマンド側で round mode を明示指定する**。

想定 CLI:

- `--round-mode resume-current-round`
- `--round-mode advance-next-round`

この方針により、

- 通常の rerun / recovery は `resume-current-round`
- 新しい改善ラウンド開始時だけ `advance-next-round`

という運用を固定できる。

### 2. round 配下に manifest を置いて current round の正当性を判定する

`results/night-batch/roundN/round-manifest.json` を追加し、少なくとも以下を保持する。

- `round`
- `strategy_set_fingerprint`
- `us_campaign`
- `jp_campaign`
- `phases`
- `created_at`
- `updated_at`
- `mode`

`resume-current-round` では **最新 round の manifest と今回の fingerprint が一致する場合だけ再利用**する。  
不一致ならエラーにして、ユーザーへ `advance-next-round` を使うよう促す。

### 3. 再開は round metadata と campaign checkpoint の両方で行う

checkpoint 自体は既存 `scripts/backtest/run-long-campaign.mjs --resume` を活用する。  
`python/night_batch.py` は round ごとに US/JP の最新 checkpoint を見つけ、`scripts/backtest/run-finetune-bundle.mjs` へ渡す。  
これにより、すでに完了済みの run は campaign 側既存ロジックで skip / collapse され、途中中断からのやり直しでも最初から回し直さない。

### 4. round 配下へ寄せるのは night-batch 成果物のみ

今回 round 配下へ移すのは以下に限定する。

- `python/night_batch.py` の log
- summary JSON / Markdown
- detached state
- round manifest

`results/campaigns/...` の保存構造は既存のまま使い、round からは参照するだけに留める。  
これにより変更範囲を夜間 orchestration と docs / tests に限定する。

---

## 変更対象ファイル

### 変更

- `python/night_batch.py`
  - round mode 引数追加
  - round 解決 helper 追加
  - round manifest 読み書き追加
  - log / summary / detached state の出力先を round 配下対応
  - bundle / smoke-prod の resume / advance 制御追加
- `scripts/backtest/run-finetune-bundle.mjs`
  - US/JP 別 resume checkpoint 引数を受け取れるようにする
  - `runCampaignPhase()` の既存 `resume` 引数を CLI から利用可能にする
- `tests/night-batch.test.js`
  - round mode / round path / resume plumbing / smoke 縮小の RED/GREEN テスト追加
- `config/backtest/campaigns/next-long-run-us-finetune-100x10.json`
  - `phases.smoke.symbol_count: 10 -> 1`
- `config/backtest/campaigns/next-long-run-jp-finetune-100x10.json`
  - `phases.smoke.symbol_count: 10 -> 1`
- `command.md`
  - WSL 向け `advance-next-round` / `resume-current-round` / dry-run / manual recovery 手順追記

### 新規作成

- `docs/working-memory/session-logs/night-batch-round-resume_20260410_2204.md`
  - 実装・検証・push 内容の session log

### 作成しないもの

- 新しい config 駆動 round 選択ファイルは作らない  
  round の進行は「既存 round を見て次番号を採番」、起動意図は CLI `--round-mode` で表現する。

---

## In Scope

- `results/night-batch/roundN/` 構造の導入
- latest round からの next round 自動採番
- `resume-current-round` / `advance-next-round` の明示モード導入
- interrupted rerun での checkpoint 再利用
- `run-finetune-bundle.mjs` への resume 引数配線
- fine-tune US/JP smoke を各 1 symbol に縮小
- `command.md` の WSL 手動コマンド整備
- 実装後の docs 更新、session log 追加、push

## Out of Scope

- `results/campaigns/` 全体の保存レイアウト変更
- `run-long-campaign.mjs` の checkpoint 仕様変更
- detached production モデルの全面再設計
- round をまたいだ集計・ランキング仕様の新設
- unrelated dirty files / 既存 results の整理や巻き戻し
- README の全面更新  
  今回の doc 変更はまず `command.md` と session log に限定する

---

## 実装方針（ファイル別）

### `python/night_batch.py`

- `RESULTS_DIR` 直下書き込み前提をやめ、`round_dir` を解決してその配下へ書く
- `--round-mode` を `bundle` / `nightly` / `smoke-prod` で受け付ける
- helper を追加する
  - latest round 走査
  - next round 採番
  - current round 解決
  - manifest 読み書き
  - fingerprint 生成
- `resume-current-round` のとき:
  - 最新 round を見つける
  - manifest fingerprint が一致するか確認
  - 一致時のみその round を使う
  - US/JP campaign 各 phase の latest checkpoint を bundle 実行に渡す
- `advance-next-round` のとき:
  - 既存 round の最大値 + 1 を採番
  - 新 round manifest を作る
  - resume 引数は渡さない
- detached state file 既定値も round 配下へ寄せる
- summary に `round` / `round_mode` / `round_dir` を含める

### `scripts/backtest/run-finetune-bundle.mjs`

- 新しい CLI 例:
  - `--us-resume <checkpoint>`
  - `--jp-resume <checkpoint>`
- 各 campaign 実行時に対応する resume を `runCampaignPhase()` に渡す
- dry-run 出力にも resume 有無が分かるようにする

### campaign config 2件

- `smoke.symbol_count` を `1` に変更
- 結果として smoke は
  - US: 10 strategies × 1 symbol = 10 runs
  - JP: 10 strategies × 1 symbol = 10 runs
  - 合計 20 runs

### `command.md`

- 既存 Python night batch 節を更新
- WSL からの実行例を追加
  - 次ラウンド開始
  - 同ラウンド再開
  - dry-run
  - smoke-prod config 利用時の再開
- 「rerun は `resume-current-round`、新しい改善に進む時だけ `advance-next-round`」を明記

---

## TDD 計画

### RED

先に `tests/night-batch.test.js` を失敗させる。

追加 / 変更する想定テスト:

- `bundle dry-run chooses the next round directory in advance-next-round mode`
- `bundle dry-run reuses the latest round directory in resume-current-round mode`
- `resume-current-round fails when the latest round fingerprint does not match`
- `resume-current-round forwards us/jp latest checkpoints to the finetune bundle runner`
- `smoke-prod dry-run keeps detached state and summaries under the selected round`
- `next fine-tune smoke configs use one symbol per strategy`

必要に応じて既存 matcher も修正する。

- `readSummaryFromResult()` の summary path 抽出を round 配下対応に変える
- `results/night-batch/<run-id>-summary.*` 前提の assertion を round 配下へ更新する

### GREEN

- round 解決の最小 helper 実装
- round-aware summary / log 出力
- bundle resume 引数配線
- smoke `symbol_count = 1`

### REFACTOR

- round 判定と fingerprint 判定を小関数へ分離
- `night_batch.py` の path 組み立てを集約
- test helper で round path の重複 assertion を整理

---

## 検証コマンド

既存 repo コマンドだけを使う。

```bash
node --test tests/night-batch.test.js
npm test
python3 python/night_batch.py bundle --host 127.0.0.1 --port 9223 --round-mode advance-next-round --dry-run
python3 python/night_batch.py bundle --host 127.0.0.1 --port 9223 --round-mode resume-current-round --dry-run
python3 python/night_batch.py smoke-prod --config config/night_batch/bundle-detached-reuse-config.json --round-mode resume-current-round --dry-run
```

手動確認の観点:

- `advance-next-round` で `round(N+1)` が選ばれる
- 同条件 rerun で `resume-current-round` が最新 round を再利用する
- manifest mismatch 時に next round を暗黙作成せずエラーになる
- smoke run 数が US 10 + JP 10 の計 20 になる

---

## リスク / Open Points

- **同一 strategy set の fingerprint 粒度**
  - `us_campaign + jp_campaign + phases` だけで十分か
  - campaign config 内容変更も fingerprint に含めるか
- **resume-current-round で latest round が存在しない場合**
  - 自動で round1 を作らず、エラーにして `advance-next-round` を促す方が安全
- **US/JP 片方だけ checkpoint がある場合**
  - ある方だけ resume、ない方は fresh start を許可するか
  - 片系欠損は warning に留めるか error にするかを実装時に決める必要がある
- **既存 summary path テストとの後方互換**
  - path matcher を round-aware に更新する必要がある
- **detached state の round 配下移動**
  - 既存 state file 参照との整合を崩さないよう既定値変更の影響確認が必要

本件では安全側として、

- `resume-current-round` は latest round が無い / fingerprint 不一致なら **明示エラー**
- `advance-next-round` だけが新 round を作る

を採用する。

---

## 完了条件

- `results/night-batch/roundN/` に nightly 成果物が整理される
- round の next 番号は既存 folder を見て自動採番される
- rerun は `resume-current-round` で current round を再利用できる
- 途中中断後の再実行で completed work が再実行されない
- smoke が US 10 runs + JP 10 runs の合計 20 runs になる
- `command.md` が WSL 手動運用に合わせて更新される
- session log が追加される
- テストと dry-run 検証が通る
- 変更が push される

---

## 実装ステップ

- [ ] `tests/night-batch.test.js` に round mode / round path / resume plumbing / smoke 縮小の RED テストを追加する
- [ ] `python/night_batch.py` に `--round-mode` を追加し、`resume-current-round` / `advance-next-round` を受け付ける
- [ ] `python/night_batch.py` に latest round 走査・next round 採番・manifest 読み書き・fingerprint helper を追加する
- [ ] `python/night_batch.py` の log / summary / detached state 出力を round 配下へ変更する
- [ ] `python/night_batch.py` の bundle / smoke-prod フローで current round resume と next round advance を分岐させる
- [ ] `scripts/backtest/run-finetune-bundle.mjs` に `--us-resume` / `--jp-resume` を追加し、各 campaign 実行へ渡す
- [ ] `config/backtest/campaigns/next-long-run-us-finetune-100x10.json` の `phases.smoke.symbol_count` を `1` に変更する
- [ ] `config/backtest/campaigns/next-long-run-jp-finetune-100x10.json` の `phases.smoke.symbol_count` を `1` に変更する
- [ ] `tests/night-batch.test.js` の path matcher / helper を round-aware に整える
- [ ] `command.md` に WSL 向け `advance-next-round` / `resume-current-round` / dry-run / manual recovery コマンドを追記する
- [ ] `node --test tests/night-batch.test.js` を実行して通す
- [ ] `npm test` を実行して既存回帰がないことを確認する
- [ ] `python3 python/night_batch.py ... --dry-run` で round mode の挙動を確認する
- [ ] `docs/working-memory/session-logs/night-batch-round-resume_20260410_2204.md` を追加する
- [ ] exec plan を `docs/exec-plans/completed/` へ移動する
- [ ] Conventional Commit でコミットし、SSH 経由で push する
