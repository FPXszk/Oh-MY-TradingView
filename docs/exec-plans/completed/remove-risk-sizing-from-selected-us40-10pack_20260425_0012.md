# selected-us40-10pack から risk 1%/2% 制限を外す計画

作成日時: 2026-04-25 00:12 JST

## 目的

Night Batch Self Hosted #64 で使用した `selected-us40-10pack` の 10 戦略について、比較を歪めている `risk` ベースの損失制限を外す。

この計画では、現行の `risk1` / `risk2` 固定サイズをやめ、同一条件で TP 差分だけを比較できる 10 戦略セットへ置き換える前提で進める。

## 既存 active plan との関係

- 既存 active plan: `docs/exec-plans/active/repo-structure-align-and-archive-rules_20260424_2015.md`
- 今回は backtest preset / campaign / night batch bundle の更新が対象で、archive ルール整理とは直接競合しない

## 変更・削除・作成するファイル

- 作成: `docs/exec-plans/active/remove-risk-sizing-from-selected-us40-10pack_20260425_0012.md`
- 変更: `config/backtest/strategy-catalog.json`
- 変更: `config/backtest/strategy-presets.json`
- 変更: `config/backtest/campaigns/selected-us40-10pack.json`
- 変更: `config/night_batch/bundle-foreground-reuse-config.json`
- 変更: `docs/strategy/current-strategy-reference.md`
- 変更: `tests/strategy-expansion-fixtures.js`
- 変更: `tests/strategy-catalog.test.js`
- 変更: `tests/preset-validation.test.js`
- 変更: `tests/backtest.test.js`
- 変更: `tests/campaign.test.js`
- 必要に応じて変更: `tests/windows-run-night-batch-self-hosted.test.js`
- 変更: `docs/references/pine/selected-us40-10pack/donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50-risk1.pine`
- 変更: `docs/references/pine/selected-us40-10pack/donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50-risk1.pine`
- 変更: `docs/references/pine/selected-us40-10pack/donchian-60-20-rsp-rsi14-regime60-tp35-25-tp100-50-risk1.pine`
- 変更: `docs/references/pine/selected-us40-10pack/donchian-60-20-rsp-rsi14-regime60-tp30-20-tp100-50-risk1.pine`
- 変更: `docs/references/pine/selected-us40-10pack/donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50-risk1.pine`
- 変更: `docs/references/pine/selected-us40-10pack/donchian-60-20-rsp-rsi14-regime60-tp30-25-tp80-50-risk1.pine`
- 変更: `docs/references/pine/selected-us40-10pack/donchian-60-20-rsp-rsi14-regime60-tp30-25-tp120-50-risk1.pine`
- 変更: `docs/references/pine/selected-us40-10pack/donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-33-risk1.pine`
- 変更: `docs/references/pine/selected-us40-10pack/donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-67-risk1.pine`
- 変更または削除相当の差し替え: `docs/references/pine/selected-us40-10pack/donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50-risk2.pine`

## スコープ

### 実施すること

- `selected-us40-10pack` の 10 戦略から `riskAmount = strategy.equity * 0.01/0.02` による固定リスクサイズ制御を外す
- 比較軸を TP 系パラメータに寄せるため、strategy id / name / theme axis / source の整合を更新する
- campaign の 10 本構成を、risk 制限なしの比較用セットへ差し替える
- foreground bundle の既定 `us_campaign` が同 campaign を指し続けることを維持する
- 変更後の preset を backtest 実行可能な設定として repo に登録する
- 関連テストを RED -> GREEN -> REFACTOR で更新し、対象セットの整合性を固定する
- 承認後の実装完了時には commit / push し、self-hosted workflow を起動する

### 実施しないこと

- TP パラメータ自体の追加探索
- universe や date range の変更
- `selected-us40-10pack` 以外の campaign への横展開
- run64 の既存 artifact や過去レポートの数値を書き換えること

## 実装内容と影響範囲

- Pine source では risk sizing 用の qty 算出と `riskAmount` 系ロジックを除去し、他の売買条件は維持する
- preset / catalog では `risk1` / `risk2` を含む命名が比較目的に不適切になるため、id 体系を risk 非依存に更新する可能性が高い
- campaign では strategy_ids の全面差し替えが発生する
- テストでは live preset 一覧、10pack ID 一覧、campaign matrix、raw source 期待値を更新する必要がある
- night batch 実行後に新しい artifact 名や ranking は変わるが、その更新は workflow 実行結果として扱う

## TDD / 検証戦略

### RED

- `tests/strategy-expansion-fixtures.js` の 10pack ID 一覧を新しい risk 非依存セットへ先に変更する
- `tests/strategy-catalog.test.js` / `tests/preset-validation.test.js` / `tests/campaign.test.js` で旧 `risk1` / `risk2` 前提が落ちる状態を先に作る
- `tests/backtest.test.js` で raw source から risk sizing 文字列が消えることを期待する失敗テストへ更新する

### GREEN

- Pine / preset / catalog / campaign を最小差分で更新し、対象テストを通す

### REFACTOR

- 命名、theme notes、説明文、優先度やタグの重複を整理する
- risk 除去後も比較軸が TP のみで読み取れるよう、説明文のノイズを削る

## 想定コマンド

```bash
node --test tests/strategy-catalog.test.js tests/preset-validation.test.js tests/backtest.test.js tests/campaign.test.js
```

```bash
node --test tests/windows-run-night-batch-self-hosted.test.js tests/night-batch.test.js
```

```bash
rg -n "risk1|risk2|riskAmount = strategy\\.equity \\* 0\\.0[12]|selected-us40-10pack" config docs tests
```

## リスク / 注意点

- `risk1` / `risk2` を外すと preset id が変わる可能性が高く、参照漏れがあると campaign 読み込みや My Scripts 登録が壊れる
- `raw_source` preset は source_path 参照と catalog 記述の両方があるため、片側だけ直すと不整合になる
- ユーザー意図が「risk2 だけ外す」ではなく「10 戦略すべてから 1%/2% 損失制限を外す」だと解釈している。今回の計画は後者で組む
- workflow 実行には commit / push 後の GitHub Actions dispatch が必要で、ローカル修正だけでは完了しない

## 実装ステップ

- [ ] `selected-us40-10pack` を構成する preset / source / campaign / bundle 参照を洗い出し、変更点を最終確定する
- [ ] RED: 10pack ID 一覧、live preset 一覧、campaign 構成、raw source 期待値を新仕様前提に更新して失敗させる
- [ ] GREEN: 10 本の Pine source から risk sizing 制御を外し、必要なら id / name / theme axis を risk 非依存の命名へ変更する
- [ ] GREEN: `strategy-catalog.json` と `strategy-presets.json` を新しい 10 戦略定義へ更新する
- [ ] GREEN: `selected-us40-10pack` campaign と foreground bundle 既定設定を新しい比較用 10pack に合わせる
- [ ] GREEN: 関連テストを実行し、失敗箇所を潰して全件 GREEN にする
- [ ] REVIEW: ロジック破綻、命名の一貫性、不要な複雑化がないか確認する
- [ ] COMMIT 準備: plan を `docs/exec-plans/completed/` へ移動し、Conventional Commit で commit / push する
- [ ] PUSH 後: 対象 workflow を dispatch し、run 開始を確認する

## 完了条件

- `selected-us40-10pack` の 10 戦略から risk 1% / 2% 固定サイズ制御が除去されている
- strategy catalog / presets / campaign / docs / tests が新しい比較セットに揃っている
- 関連テストが通っている
- 変更が GitHub に push 済みで、self-hosted workflow が起動している
