# 最強戦略 profit protect + risk sizing + US40 10pack 計画

作成日時: 2026-04-24 12:52 JST

## 目的

現状の最強US戦略 `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` を基準に、以下を満たす比較用の新戦略群を作る。

- 終値判定の2段階部分利確を追加する
- 8%ストップ前提のリスクベース・ポジションサイジングへ変更する
- 命名を短縮しつつ、今回追加する新機能のパラメータだけを変えた 10 戦略を用意する
- 2015-01-01 からの 10 年間 + US40 ユニバースで回せる campaign / night batch 設定へ登録する

## 既存 active plan との関係

- 既存 active plan は `docs/exec-plans/active/fix-manual-pine-validation-flow_20260423_1035.md`
- 今回は最強戦略の派生作成と campaign 登録が対象で、手動 Pine 検証フロー修正とは直接競合しない

## 変更・削除・作成するファイル

- 作成: `docs/exec-plans/active/strongest-strategy-profit-protect-us40-10pack_20260424_1252.md`
- 変更候補: `references/pine/next-long-run-market-matched-200_20260409_1525/04_donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late.pine`
- 変更候補: `references/pine/review-smoke/04_donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late.pine`
- 変更候補: `config/backtest/strategy-catalog.json`
- 変更候補: `config/backtest/campaigns/current/selected-us40-8pack.json`
- 変更候補: `config/night_batch/nightly.default.json`
- 変更候補: `tests/campaign.test.js`
- 変更候補: `tests/strategy-expansion-fixtures.js`
- 変更候補: `tests/my-scripts.test.js`
- 変更候補: `docs/research/strategy/current-strategy-reference.md`

## スコープ

### 実施すること

- 最強戦略の現行 Pine 実装を基準に、終値ベースの部分利確と 8%ストップ逆算のポジションサイジングを追加する
- 部分利確が同一閾値で再発しないよう、ポジション単位でフラグ管理する
- 命名から固定値の `hard-stop-8pct` と既存 theme suffix の冗長さを落とし、今回比較したい新機能パラメータ中心の 10 preset を定義する
- 新 10 戦略を US40・2015-01-01〜2025-12-31 の campaign に登録する
- night batch 既定設定からその campaign を実行できる状態にする
- 追加戦略と campaign 変更を固定するテストを追加または更新する

### 実施しないこと

- RSP filter / RSI regime / Donchian 期間そのものの探索拡大
- 8%ストップ以外の stop 幅比較
- US40 以外の JP campaign への横展開
- 実装前に未合意の追加ロジックを勝手に載せること

## 実装内容と影響範囲

- Pine 側ではエントリー後の含み益率判定、部分決済フラグのリセット条件、qty 算出を追加する
- catalog 側では 10 戦略分の id / name / metadata / theme notes を追加または差し替える
- campaign 側では現行 `selected-us40-8pack` を置き換えるか、新しい 10pack campaign を定義して US40 比較用の実行単位を更新する
- night batch 側では production 実行対象が新 campaign を指すよう調整する
- 既存テストは preset 展開・campaign 整合・my-scripts 登録の観点で更新が必要になる可能性が高い

## TDD / 検証戦略

### RED

- 新しい 10 戦略 id / campaign 構成を期待するテストを先に更新し、まず失敗させる
- 可能なら Pine 生成内容に部分利確・risk sizing 文字列が含まれることを確認するテストを追加して失敗させる

### GREEN

- Pine と catalog / campaign 設定を最小差分で更新し、新規テストと関連既存テストを通す

### REFACTOR

- 命名、theme notes、説明文の重複を整理する
- 10 戦略間で比較軸がぶれないよう metadata を揃える

## 想定コマンド

```bash
node --test tests/campaign.test.js tests/my-scripts.test.js
```

```bash
node --test tests/campaign.test.js tests/my-scripts.test.js tests/pine.analyze.test.js
```

```bash
rg -n "profit protect|position sizing|selected-us40|10pack" config tests docs references -S
```

## リスク / 注意点

- 現在の Pine 実体が `references/pine/...` 配下にあり、catalog 側との同期方法を読み違えると source と metadata がずれる
- TradingView の `strategy.entry` / `strategy.exit` / `strategy.close` の組み合わせ次第で、部分利確と stop が干渉する可能性がある
- `strategy.percent_of_equity` のままでは株数逆算が表現しづらいため、qty 指定方式の見直しが必要になる可能性がある
- night batch の既定 config が campaign 名ではなく CLI 文字列直書きなので、差し替え範囲を誤ると既存運用を壊す

## 実装ステップ

- [ ] 対象 preset の source と strategy-catalog 上の定義関係を確認し、10 戦略の命名ルールを確定する
- [ ] RED: 追加予定の 10 戦略 / US40 campaign / 登録状態を期待するテストを先に更新する
- [ ] GREEN: 基準 Pine に部分利確フラグ管理とリスクベース qty 算出を実装する
- [ ] GREEN: 新機能パラメータだけを変えた 10 戦略を catalog と参照ドキュメントへ登録する
- [ ] GREEN: US40 10年 campaign と night batch 既定設定を新 10 戦略向けに更新する
- [ ] GREEN: 関連テストを実行して通す
- [ ] REVIEW: ロジック破綻、命名の一貫性、不要な複雑化がないか確認する

## 完了条件

- 最強戦略ベースの新 10 戦略が一意な id で定義されている
- 部分利確とリスクベース sizing を含む Pine 実装が source に反映されている
- US40 / 2015-01-01〜2025-12-31 の campaign と night batch 設定が新 10 戦略を参照している
- 追加・更新した関連テストが通る
