# Exec Plan: switch-night-batch-default-to-12x10_20260414_1016

## 1) 背景 / 目的

GitHub Actions の `Night Batch Self Hosted` と手動 wrapper が既定で参照する `config/night_batch/bundle-foreground-reuse-config.json` の bundle 既定 campaign を、現状の fine-tune 100x10 から **12x10** へ常設で切り替える。  
あわせて、**既定値の説明を書いているファイルだけ**を過不足なく更新し、最終的に `main` へ commit / push できる状態まで持っていく。

## 2) 変更・作成・移動するファイル一覧

### 作成
- `docs/exec-plans/active/switch-night-batch-default-to-12x10_20260414_1016.md`

### 更新
- `config/night_batch/bundle-foreground-reuse-config.json`
- `README.md`
- `command.md`
- `explain-forhuman.md`
- `tests/windows-run-night-batch-self-hosted.test.js`

### 参照のみ
- `.github/workflows/night-batch-self-hosted.yml`
- `docs/research/latest/README.md`
- 必要に応じて `tests/night-batch.test.js`

### 移動（完了時）
- `docs/exec-plans/active/switch-night-batch-default-to-12x10_20260414_1016.md`
  -> `docs/exec-plans/completed/switch-night-batch-default-to-12x10_20260414_1016.md`

> `docs/research/latest/README.md` は **12x10 世代の説明** ではあるが、workflow / config の**既定値説明そのもの**は持っていないため、今回の更新対象には含めない。  
> `.github/workflows/night-batch-self-hosted.yml` は既定 **path** の正本確認用であり、今回 path 自体を変えない限り原則未変更。

## 3) 実装内容と影響範囲

### 実装内容
- `bundle-foreground-reuse-config.json` の
  - `bundle.us_campaign`
  - `bundle.jp_campaign`
  を `next-long-run-us-12x10` / `next-long-run-jp-12x10` へ切り替える
- README / runbook / human doc にある
  - 「この config は何を既定で回すか」
  - 「workflow 既定値で何が走るか」
  の説明を 12x10 基準へ更新する
- 既定 contract を固定するため、対象 config / workflow default path を読む既存テストを追加・更新する
- 実装完了後に plan を completed へ移し、Conventional Commit で commit、`main` へ push する

### 影響範囲
- GitHub Actions の `workflow_dispatch` 既定実行
- schedule 実行時に既定 path 経由で読まれる foreground bundle
- Windows wrapper / Python night batch の foreground 既定運用
- README / `command.md` / `explain-forhuman.md` の運用説明
- 既定 config 契約を確認するテスト

## 4) スコープ / Out of Scope

### In Scope
- `bundle-foreground-reuse-config.json` の既定 campaign 切替
- 既定値説明を持つ docs の更新
- 既定 contract を守るテストの追加/更新
- plan 移動、commit、push

### Out of Scope
- `.github/workflows/night-batch-self-hosted.yml` の `config_path` 既定 path 自体の変更
- `bundle-detached-reuse-config.json` や `nightly.default.json` の変更
- 12x10 campaign 定義ファイルそのものの変更
- `docs/research/latest/README.md` など、既定値説明を直接持たない research docs の更新
- self-hosted runner / TradingView / WSL 運用そのものの再設計

## 5) active plan との衝突有無

### 判定
**部分衝突あり。**

### 衝突候補
- `docs/exec-plans/active/document-self-hosted-runner-foreground-autostart_20260412_0006.md`
  - `README.md` / `command.md` を触る点が重なる
- `docs/exec-plans/active/run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md`
- `docs/exec-plans/active/investigate-night-batch-self-hosted-queued_20260410_2307.md`
  - 同じ workflow / night batch foreground config を参照する

### 整理方針
- 今回は **「既定 campaign の恒久切替」** に限定し、runner 調査や dispatch 実行とは混ぜない
- 実装前に最新 `main` と active plans の差分を確認し、`README.md` / `command.md` の競合を先に解消する
- live checkout を self-hosted runner が使用中なら、その run 完了後に着手する

## 6) TDD / 検証方針

### 方針
今回の本体は **config + docs 契約変更** だが、既定値を恒久運用へ切り替えるため、**テストなしの書き換えにはしない**。  
既存 repo には night-batch / workflow 周辺テストがあるため、**config の既定 campaign 契約を読むテストを RED で先に作る**。

### RED
- `tests/windows-run-night-batch-self-hosted.test.js` に、`config/night_batch/bundle-foreground-reuse-config.json` の既定 campaign が `12x10` であることを確認するテストを追加/更新する
- 必要なら README の既定説明が 12x10 を指すことも assertion 化する
- 現状では config が `finetune-100x10` を指しているため失敗する状態を作る

### GREEN
- config を 12x10 に切り替える
- docs を 12x10 既定へ更新する
- 対象テストを通す

### REFACTOR
- docs 上での「既定値」と「履歴説明」を分離し、100x10 への言及は履歴・比較文脈だけに残す
- path は変えず、**同じ config ファイルの中身だけ既定 12x10 に変わる**ことが一読で分かる表現へ揃える

## 7) 実装ステップ

- [ ] active plans と live checkout 使用状況を確認し、競合なく着手できることを確認する
- [ ] `README.md` / `command.md` / `explain-forhuman.md` のうち、**既定値説明を持つ箇所だけ**を特定する
- [ ] `tests/windows-run-night-batch-self-hosted.test.js` に RED テストを追加/更新する
- [ ] RED を実行し、現状の既定値が 100x10 で失敗することを確認する
- [ ] `config/night_batch/bundle-foreground-reuse-config.json` の `us_campaign` / `jp_campaign` を 12x10 へ変更する
- [ ] `README.md` の foreground config / workflow 既定説明を 12x10 基準へ更新する
- [ ] `command.md` の foreground config / workflow 既定説明を 12x10 基準へ更新する
- [ ] `explain-forhuman.md` の「今の workflow 既定値で何が走るのか」周辺を 12x10 基準へ更新する
- [ ] 100x10 言及が履歴説明として残る箇所と、既定値説明として残ってしまった箇所を切り分けて確認する
- [ ] 対象テストと dry-run を実行し、config path は維持したまま既定 campaign だけ 12x10 に切り替わっていることを確認する
- [ ] 必要なら `npm test` を実行し、night-batch 周辺以外の既存回帰がないことを確認する
- [ ] plan を `docs/exec-plans/completed/` へ移動する
- [ ] `fix: switch default night batch bundle to 12x10` で commit する
- [ ] `main` へ push する

## 8) 検証コマンド

```bash
git --no-pager diff --check

node --test tests/windows-run-night-batch-self-hosted.test.js

python3 python/night_batch.py smoke-prod \
  --config config/night_batch/bundle-foreground-reuse-config.json \
  --dry-run

rg -n "next-long-run-us-(finetune-100x10|12x10)|next-long-run-jp-(finetune-100x10|12x10)|bundle-foreground-reuse-config\.json" \
  config/night_batch/bundle-foreground-reuse-config.json \
  README.md \
  command.md \
  explain-forhuman.md

npm test
```

## 9) リスク / 注意点

- `README.md` / `command.md` は active plan と競合しやすい
- self-hosted runner が live checkout を使用中に config を変えると、実行中 run と説明が食い違う恐れがある
- workflow の既定 **path** は変わらず、**中身だけ 12x10 に変わる**ため、docs でそこを明確にしないと誤解が残る
- `explain-forhuman.md` には「latest docs と workflow 既定値は別」という説明があるため、12x10 へ切り替え後は論理矛盾が出ないよう更新範囲をまとめて直す必要がある

## 10) commit / push 方針

- commit message:
  - `fix: switch default night batch bundle to 12x10`
- push 先:
  - `origin main`
- commit 前に実施:
  - plan を `docs/exec-plans/completed/` へ移動
  - `git --no-pager diff --check`
  - 対象テスト / dry-run / 必要なら `npm test`
- commit 末尾:
  - `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`
