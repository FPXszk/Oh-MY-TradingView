# Exec Plan: attach-run8-top6-to-nextplan-and-register-campaign_20260412_0518

## 目的

最新 run 8 の集計から抽出した **US top3 / JP top3 の計6本** を、既存の `external-phase1-priority-top` を置き換えずに **新しい backtest campaign** として追加する。  
あわせて、`docs/research/next-strategy-candidates-integrated_20260411_1843.md` に **run 8 validated shortlist / next backtest attach 先** を追記し、既存の RSI 系候補および `smc-short-term-discretionary` を残したまま、次のバックテ候補として整理する。

---

## 非重複確認

`docs/exec-plans/active/` 配下の既存4本とは主題が重複しない。

- `document-self-hosted-runner-foreground-autostart_20260412_0006.md`
- `investigate-night-batch-self-hosted-queued_20260410_2307.md`
- `rerun-night-batch-after-run-cmd_20260410_1714.md`
- `run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md`

---

## 実装方針

### 方針A: nextplan doc に run 8 shortlist を追記
`docs/research/next-strategy-candidates-integrated_20260411_1843.md` の既存構成は維持しつつ、後段に以下の新セクションを追加する。

- `run 8 validated shortlist`
- `next backtest campaign attachment`
- 「既存 `external-phase1-priority-top` は維持し、今回は別 campaign を追加する」旨の注記

これにより、既存の **RSI 系 control / watchlist** と **SMC 仮説** を壊さずに、run 8 の実績ベース shortlist を nextplan に接続できる。

### 方針B: 新 campaign JSON を追加
既存 `config/backtest/campaigns/external-phase1-priority-top.json` を参照しつつ、置換ではなく **新規 campaign file** を追加する。

想定ファイル:
- `config/backtest/campaigns/external-phase1-run8-us-jp-top6.json`

構造は既存パターンに合わせ、比較可能性を優先して以下を原則踏襲する。

- `universe`: `long-run-cross-market-100`
- `date_override`: `2000-01-01` ～ `2099-12-31`
- `phases`: smoke=10 / pilot=25 / full=100
- `experiment_gating`: 既存 external phase1 と同等
- `execution`: 既存 external phase1 と同等

### 方針C: campaign テストを追加
`tests/campaign.test.js` に新 campaign 向けの確認を追加し、以下を仕様化する。

- campaign が正常に load / validate できる
- `preset_ids` が **6本** である
- 順序が **US top3 → JP top3**、各市場内は順位順である
- phase sizing が **10 / 25 / 100** である
- 既存 `external-phase1-priority-top` のテストは維持し、非回帰を担保する

---

## 対象戦略（run 8 validated shortlist）

### US top3
1. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback`
3. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier`

### JP top3
1. `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
2. `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late`
3. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`

---

## 変更・作成するファイル

### 変更
- `docs/research/next-strategy-candidates-integrated_20260411_1843.md`
- `tests/campaign.test.js`

### 作成
- `config/backtest/campaigns/external-phase1-run8-us-jp-top6.json`

---

## 実装内容と影響範囲

### 1. `docs/research/next-strategy-candidates-integrated_20260411_1843.md`
- run 8 実績ベース shortlist の追記
- next backtest に attach する campaign 候補としての位置づけを追記
- 既存の `rsi14-mean-reversion` control と `smc-short-term-discretionary` watchlist の整理は維持
- 「research doc の更新」であり、preset/builder/runtime 変更ではないことを明記

**影響範囲:**  
ドキュメント整理のみ。実行系コードへの影響なし。

### 2. `config/backtest/campaigns/external-phase1-run8-us-jp-top6.json`
- 新 campaign 定義を追加
- 既存 `external-phase1-priority-top.json` は変更しない
- run 8 top6 を固定順で登録
- external phase1 系の phase/gating/execution 慣例に合わせる

**影響範囲:**  
campaign loader の読み込み対象が1件増える。既存 campaign の挙動は不変。

### 3. `tests/campaign.test.js`
- 新 campaign の load/validate テスト追加
- `preset_ids` 数、順序、phase sizing を明示的に検証
- 既存 external campaign テストとの整合を保つ

**影響範囲:**  
campaign 設定変更時の安全性が上がる。仕様逸脱を早期に検知可能。

---

## In Scope

- run 8 の US top3 / JP top3 を nextplan に整理して追記する
- 既存 external phase1 campaign を残したまま、新 campaign を追加する
- 新 campaign の構造・順序・phase sizing をテストで保証する
- next backtest 用 shortlist と campaign の接続関係を docs 上で明確化する

## Out of Scope

- `external-phase1-priority-top.json` の置換・削除・上書き
- `config/backtest/strategy-presets.json` の追加・変更
- `src/core/*` の builder / runtime / schema 拡張
- 実 backtest の実行や結果更新
- run 8 以外のランキング再評価
- RSI 系 / SMC 系の研究内容そのものの改変

---

## TDD 方針

### RED
先に `tests/campaign.test.js` へ新 campaign 用テストを追加し、以下の失敗を確認する。

- campaign file が未作成で load できない
- `preset_ids` が 6 本でない
- 順序が想定と一致しない
- phase sizing が `10 / 25 / 100` でない

### GREEN
最小限の実装でテストを通す。

- `external-phase1-run8-us-jp-top6.json` を追加
- run 8 top6 を正しい順序で登録
- nextplan doc に shortlist / attach セクションを追加

### REFACTOR
テストが通った状態を維持したまま、以下を整理する。

- doc の見出し・文体を既存 research doc に合わせる
- テストの重複を減らし、意図が読める粒度に整える
- campaign 名称・説明文を将来の派生 campaign と衝突しにくい形に調整する

---

## 検証コマンド

```bash
node --test tests/campaign.test.js
npm test
```

---

## リスク

- campaign 名が曖昧だと、将来の run 由来 campaign と識別しづらくなる
- `preset_ids` の順序をテストで固定しないと、後続編集で比較前提が崩れる
- doc の書き方次第で「既存 `external-phase1-priority-top` を置き換える」と誤解される
- phase sizing や gating を既存 external phase1 と揃えないと、比較可能性が下がる
- research doc と campaign JSON の対応関係が弱いと、次回バックテ実行時に shortlist の意図が追いにくくなる

---

## タスクリスト

- [ ] `docs/research/next-strategy-candidates-integrated_20260411_1843.md` の追記位置を決める
- [ ] run 8 の US top3 / JP top3 を市場別・順位付きで整理する
- [ ] `run 8 validated shortlist` セクションを追加する
- [ ] `next backtest campaign attachment` セクションを追加する
- [ ] 「既存 `external-phase1-priority-top` は維持し、新 campaign を追加する」旨を明記する
- [ ] `config/backtest/campaigns/external-phase1-priority-top.json` を参照して新 campaign JSON の骨格を決める
- [ ] `config/backtest/campaigns/external-phase1-run8-us-jp-top6.json` を作成する
- [ ] `preset_ids` を US top3 → JP top3 の順で登録する
- [ ] `phases` を smoke=10 / pilot=25 / full=100 に設定する
- [ ] `experiment_gating` と `execution` を既存 external phase1 に合わせる
- [ ] `tests/campaign.test.js` に RED テストを追加する
- [ ] 新 campaign 実装を加えて GREEN にする
- [ ] doc / test の記述を整理して REFACTOR する
- [ ] `node --test tests/campaign.test.js` を実行して campaign テスト通過を確認する
- [ ] `npm test` を実行して非回帰を確認する

---

## 完了条件

- nextplan doc に run 8 shortlist と attach 方針が追記されている
- 新 campaign JSON が追加され、既存 `external-phase1-priority-top` は変更されていない
- campaign テストで新 campaign の構造・順序・phase sizing が保証されている
- `node --test tests/campaign.test.js` と `npm test` が通る
