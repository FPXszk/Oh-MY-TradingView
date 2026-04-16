# Exec Plan: strategy-live-retired-diff-tranche3_20260414_1900

## 1. tranche の目的

第3トランシェでは、`config/backtest/strategy-presets.json` の **live set** と `docs/bad-strategy/retired-strategy-presets.json` の **retired set** の差分を、
**人間にも機械にも追える形で可視化**する。

具体的には、各 retired strategy に対して以下を説明できる状態を作る。

- なぜ retire されたか（`retire_reason`）
- 最後に strong だった世代はどこか（`last_strong_generation`）
- どの live family / live preset に置き換わったか（`replacement_family` / `replacement_live_ids`）

前提として、第1トランシェで整備済みの latest summary / ranking artifact / manifest / pointer check と、第2トランシェで整備済みの live checkout protection を活かし、今回は **retired metadata と live/retired diff の見える化** に絞る。

---

## 2. in-scope / out-of-scope

### In Scope

- strategy lifecycle metadata を保持する単一の正本を導入する
- live / retired をその正本から投影できる形に整理する
- retired strategy ごとに `retire_reason` / `last_strong_generation` / `replacement_family` を保持する
- latest summary に live/retired diff セクションを追加する
- `docs/references/backtests/` 配下に machine-readable な diff artifact を追加する
- `tests/preset-validation.test.js` / `tests/backtest.test.js` を中心に既存契約を壊さないことを固定する
- 必要に応じて `tests/night-batch.test.js` / `tests/repo-layout.test.js` を拡張する

### Out of Scope

- results 肥大化対策
- ranking ロジック自体の再設計
- live 15 本の採用ルール変更
- campaign / universe pointer ルールの追加拡張
- live checkout protection の追加強化
- latest 配下に新しい常設ドキュメントを増やすこと

---

## 3. 変更対象ファイル

### 作成

- `docs/exec-plans/active/strategy-live-retired-diff-tranche3_20260414_1900.md`
- `config/backtest/strategy-catalog.json`
- `src/core/strategy-catalog.js`
- `src/core/strategy-live-retired-diff.js`
- `tests/strategy-catalog.test.js`
- `tests/strategy-live-retired-diff.test.js`

### 更新

- `config/backtest/strategy-presets.json`
- `docs/bad-strategy/retired-strategy-presets.json`
- `docs/bad-strategy/README.md`
- `src/core/backtest.js`
- `src/core/preset-validation.js`
- `scripts/backtest/generate-rich-report.mjs`
- `python/night_batch.py`
- `tests/preset-validation.test.js`
- `tests/backtest.test.js`
- `tests/night-batch.test.js`
- `tests/repo-layout.test.js`
- `docs/research/latest/main-backtest-latest-summary.md`

### 参照のみ

- `docs/research/latest/project-improvement-review.md`
- `docs/research/latest/manifest.json`
- `docs/references/backtests/next-long-run-market-matched-200-combined-ranking_20260409_1525.json`
- `docs/references/backtests/next-long-run-finetune-complete_20260413.summary.json`

### 削除

- 原則なし

---

## 4. active exec-plan との衝突有無

### 判定

**衝突なし。**

### 根拠

- `docs/exec-plans/active/` は現時点で空
- 関連する過去 plan として `completed/live-checkout-protection-tranche2_20260414_1639.md` はあるが、active 競合はない

---

## 5. 実装アプローチ

### A. metadata をどこに持たせるか

**正本は新設 `config/backtest/strategy-catalog.json` とする。**

理由:

- 現状は live (`strategy-presets.json`) と retired (`retired-strategy-presets.json`) が分離しており、metadata を足すほど二重管理 drift が起きやすい
- tranche 3 では lifecycle 情報が増えるため、正本を 1 箇所に寄せた方が安全
- 既存 runtime / docs / tests は現行ファイル名に依存しているため、**外部契約は維持しつつ内部だけ単一正本化**するのが最小リスク

各 strategy には既存 preset schema を維持したまま `lifecycle` を追加する。

想定イメージ:

```json
{
  "id": "donchian-...",
  "name": "...",
  "builder": "donchian_breakout",
  "parameters": { "entry_period": 55, "exit_period": 20 },
  "lifecycle": {
    "status": "retired",
    "retired_at": "2026-04-14",
    "retire_reason": {
      "code": "fell_below_live_cutline",
      "summary": "latest + previous の strongest 15 から外れた"
    },
    "last_strong_generation": {
      "generation_id": "next-long-run-market-matched-200_20260409",
      "artifact_path": "docs/references/backtests/next-long-run-market-matched-200-combined-ranking_20260409_1525.json"
    },
    "replacement_family": {
      "family_id": "deep-pullback-strict",
      "summary": "strict 系 family に集約",
      "replacement_live_ids": [
        "donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict"
      ]
    }
  }
}
```

### B. どの artifact を正本にするか

役割を分ける。

- **strategy 定義 / lifecycle の正本**: `config/backtest/strategy-catalog.json`
- **performance 根拠の正本**: 既存の combined ranking artifact（`docs/references/backtests/*combined-ranking*.json`）
- **可視化用 diff artifact**: 上記 2 つから生成される派生 JSON

つまり、retire 理由の説明文は catalog に持ち、
「どの世代で最後に strong だったか」の根拠は ranking artifact へリンクする。

### C. live / retired 差分をどう可視化するか

#### 1. runtime / docs 互換 view

- `config/backtest/strategy-presets.json` は **live subset view** として維持
- `docs/bad-strategy/retired-strategy-presets.json` は **retired subset view** として維持
- `src/core/strategy-catalog.js` で catalog load / live 抽出 / retired 抽出を共通化する

#### 2. machine-readable diff artifact

`docs/references/backtests/` 配下に、rich report 生成時に以下を追加出力する。

- `docs/references/backtests/<run-id>-live-retired-diff.json`

この artifact には最低限以下を含める。

- live count / retired count
- family ごとの live / retired 件数
- retired ledger
  - `presetId`
  - `retire_reason`
  - `last_strong_generation`
  - `replacement_family`
  - `replacement_live_ids`
  - latest ranking 上の参考順位（存在する場合）

#### 3. human-readable latest summary

`docs/research/latest/main-backtest-latest-summary.md` に `## Live / Retired diff` セクションを追加し、以下を表示する。

- summary counts
- family diff table
- retired ledger の要約表
- diff artifact への導線

方針として、latest summary には **要約のみ** を載せ、詳細台帳は diff artifact に寄せる。

### D. 既存ファイルへの影響範囲

- `src/core/backtest.js`
  - `loadPreset()` は catalog ベースに寄せつつ、live / retired lookup の後方互換を維持する
- `src/core/preset-validation.js`
  - preset 本体 validation を壊さず、必要なら lifecycle validation helper を追加する
- `scripts/backtest/generate-rich-report.mjs`
  - ranking artifact 出力に加えて diff artifact を出力する
- `python/night_batch.py`
  - latest summary 自動生成に diff セクションと diff artifact 導線を追加する
- `docs/bad-strategy/README.md`
  - 退役台帳の説明書として更新し、詳細の正本は catalog / diff artifact だと明記する

---

## 6. RED→GREEN→REFACTOR を含むテスト戦略

### RED

#### 新規: `tests/strategy-catalog.test.js`

- catalog が読み込める
- strategy id が全体で一意
- `lifecycle.status` が `live` / `retired` のみ
- retired entry では `retire_reason` / `last_strong_generation` / `replacement_family` が必須
- live / retired overlap がない

#### 新規: `tests/strategy-live-retired-diff.test.js`

- live / retired counts が deterministic に出る
- family diff 集計が期待通り
- ranking artifact に存在しない retired preset があっても壊れない
- retired ledger に期待フィールドが揃う

#### 既存拡張: `tests/preset-validation.test.js`

- live view の 15 本契約が維持される
- retired view の各 strategy に retirement metadata が投影される
- live / retired の id 重複が起きない

#### 既存拡張: `tests/backtest.test.js`

- `loadPreset()` が live / retired どちらも後方互換で解決できる
- catalog 導入後も preset build が壊れない

#### 既存拡張: `tests/night-batch.test.js`

- latest summary に `Live / Retired diff` 節が出る
- diff artifact path が summary に載る
- nightly/report 導線で diff artifact の出力先が deterministic

#### 既存拡張: `tests/repo-layout.test.js`

- `strategy-presets.json` は live projection として 15 本を保つ
- `docs/bad-strategy/README.md` と retired ledger 導線が維持される

### GREEN

- catalog loader / selector を追加する
- lifecycle metadata を catalog に実装する
- live / retired projection を更新する
- diff 集計 helper を追加する
- rich report / latest summary に差分可視化を接続する

### REFACTOR

- path 定数や JSON loader の重複を整理する
- lifecycle validation と preset validation の責務を分離する
- diff 表示用の整形ロジックを小関数へ切り出す
- fixture と helper を整理してテストの可読性を上げる

### coverage 方針

repo には coverage 専用 script が見当たらないため、新規モジュール
`strategy-catalog.js` / `strategy-live-retired-diff.js` を中心にユニットテストを厚くし、
**今回触る経路で 80% 以上相当の touched-path coverage** を狙う。
coverage 計測ツール自体の導入はこの tranche の対象外。

---

## 7. 検証コマンド

```bash
git --no-pager diff --check
node --test tests/strategy-catalog.test.js tests/strategy-live-retired-diff.test.js tests/preset-validation.test.js tests/backtest.test.js tests/night-batch.test.js tests/repo-layout.test.js
npm test
npm run test:all
```

補足:

- `npm test` は既存回帰の主確認
- `npm run test:all` は最終の広め確認
- `npm run test:e2e` は今回の変更中心ではないため必須ではないが、影響が広がった場合のみ追加検討する

---

## 8. リスク

- catalog 正本化の途中で live / retired view の同期が崩れると、runtime と docs の説明がズレる
- `loadPreset()` の参照元変更で既存 CLI/backtest 契約を壊す可能性がある
- 初回の retired metadata 付与で、`retire_reason` と `replacement_family` の粒度が粗すぎる / 揃わない可能性がある
- ranking artifact に存在しない retired preset をどう扱うか曖昧だと、`last_strong_generation` の説明が不安定になる
- latest summary に情報を載せすぎると可読性が落ちるため、summary と diff artifact の責務分離が必要

---

## 9. チェックボックス形式の実装ステップ

- [ ] `strategy-catalog.json` の schema と `lifecycle` 形式を確定する
- [ ] live 15 本と retired preset を catalog に統合する
- [ ] retired strategy に `retire_reason` / `last_strong_generation` / `replacement_family` を埋める
- [ ] `src/core/strategy-catalog.js` を追加し、catalog load / live projection / retired projection を実装する
- [ ] `src/core/strategy-live-retired-diff.js` を追加し、family diff / retired ledger / ranking join を実装する
- [ ] `config/backtest/strategy-presets.json` を live projection として同期する
- [ ] `docs/bad-strategy/retired-strategy-presets.json` を retired projection として同期する
- [ ] `src/core/backtest.js` の `loadPreset()` を catalog ベースへ寄せつつ後方互換を維持する
- [ ] `scripts/backtest/generate-rich-report.mjs` に diff artifact 出力を追加する
- [ ] `python/night_batch.py` の latest summary 生成に `Live / Retired diff` セクションを追加する
- [ ] `docs/bad-strategy/README.md` を更新し、正本・投影 view・diff artifact の関係を明文化する
- [ ] `tests/strategy-catalog.test.js` / `tests/strategy-live-retired-diff.test.js` を RED から追加する
- [ ] `tests/preset-validation.test.js` / `tests/backtest.test.js` / `tests/night-batch.test.js` / `tests/repo-layout.test.js` を RED から拡張する
- [ ] `git --no-pager diff --check` → 対象テスト → `npm test` → `npm run test:all` の順で検証する
- [ ] latest summary と diff artifact が operator 視点で読めることを確認する

---

## 10. 完了条件

- strategy lifecycle の正本が 1 箇所に定まり、live / retired view はそこから説明できる
- retired strategy ごとに `retire_reason` / `last_strong_generation` / `replacement_family` が追える
- latest summary から live / retired diff を deterministic に読める
- `docs/references/backtests/` に diff artifact が生成される
- preset/backtest/night-batch/repo-layout 系の既存契約が維持される
