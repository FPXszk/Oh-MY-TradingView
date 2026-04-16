# Exec Plan: strongest-family-overlay-ablation_20260416_1140

## 0) Path note

- この repo で durable な exec-plan を置く canonical path は `plans/exec/active/` / `plans/exec/completed/`。
- older text に `docs/exec-plans/` 表記が残っていても、現行 repo layout test と `plans/README.md` は `plans/exec/` を正本として扱う。

## 1) 目的 / 研究質問

- 目的は **新戦略 family 追加ではなく、現 strongest family の寄与分離**。
- 今回の committed tranche は **Priority 1: overlay の寄与分離** のみを実施対象にする。
- 研究質問は次の 3 点に固定する。
  1. overlay なしに対して `Chandelier Exit` / `ATR Trailing Stop` は **profit_factor** と **max_drawdown** を改善するか。
  2. 改善が `best_symbol` 依存ではなく、focused universe 全体でも残るか。
  3. focused campaign の結論を broader market campaign に持ち上げても崩れないか。

## 2) この順序を採る理由

- current live set には overlay / FTD variants が追加済みだが、`docs/research/current/main-backtest-current-summary.md` 上では **overlay / FTD variants の current score が未計測**。
- 一方で `exit 18/20/22` と `strict entry 50/55/60` には、すでに
  - `long-run-jp-exit-sweep-{50,100}x3`
  - `long-run-us-entry-sweep-{50,100}x3`
  という archive campaign と結果 docs が存在する。
- したがって、**新規エビデンスが薄い overlay を最初に切り出す**のが最も情報利得が高い。
- follow-on queue の推奨順は `overlay -> FTD necessity -> exit 18/20/22 revalidation -> strict entry timing revalidation -> regime 55/60`。
  - 理由: exit / strict は archive エビデンスがすでにあるため、未検証の FTD を先に減らした方が live expansion の寄与分離として自然。

## 3) strongest family の前提と軸固定

### overlay tranche で比較したい base anchors

1. `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
3. `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide`

### 固定するもの

- regime filter: `RSP > SMA200`
- RSI regime: `RSI14 > 55`
- stop loss: `8% hard stop`
- family: Donchian deep-pullback tight line
- universe progression: focused current 12 symbols -> broader 50 symbols（必要時のみ）
- comparison metrics: `net_profit`, `profit_factor`, `max_drawdown`, `percent_profitable`, `closed_trades`, `best_symbol`

### 変数にするもの

- `exit_overlay` のみ
  - none
  - `chandelier_exit`
  - `atr_trailing_stop`

## 4) repo-aware correction: 55/20 anchor mismatch

- 現在の canonical preset
  - `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
  は **ID / name は 55/20 だが、実パラメータは `entry_period=57`, `exit_period=20`**。
- しかし overlay variants
  - `...tight-profit-protect-chandelier`
  - `...tight-profit-protect-atr-trailing`
  は **`entry_period=55`, `exit_period=20`**。
- そのため、既存 base preset をそのまま overlay 比較に使うと、**overlay 差ではなく entry period 差も同時に混ざる**。

### overlay tranche の decision gate

- 推奨: **research-only control として true 55/20 + no overlay を 1 本追加**し、overlay 比較の 1 軸性を守る。
- 代替: 55/20 family は tranche 1 から外し、まず clean な 55/18 / 55/22 の 2 base だけで overlay を切る。
- 非推奨: 既存 57/20 base をそのまま比較に入れる。

## 5) 変更 / 作成 / 更新対象ファイル

### 今回の tranche で作成予定

- `plans/exec/active/strongest-family-overlay-ablation_20260416_1140.md`
- `config/backtest/campaigns/archive/strongest-overlay-us-12x9.json`
- `config/backtest/campaigns/archive/strongest-overlay-jp-12x9.json`
- `config/backtest/campaigns/archive/strongest-overlay-us-50x9.json`（conditional: focused 通過時のみ）
- `config/backtest/campaigns/archive/strongest-overlay-jp-50x9.json`（conditional: focused 通過時のみ）
- `docs/research/archive/strongest-family-overlay-ablation-results_YYYYMMDD_HHMM.md`

### decision gate が「research-only 55/20 control を追加する」の場合に更新予定

- `config/backtest/strategy-catalog.json`
- `docs/research/strategy/retired/retired-strategy-presets.json`
- `tests/strategy-catalog.test.js`
- `tests/backtest.test.js`

### 今回の tranche で更新予定

- `tests/campaign.test.js`
- `docs/research/archive/README.md`（new archive doc への導線追加が必要な場合のみ）

### 原則として更新しない

- `config/backtest/campaigns/current/next-long-run-us-12x10.json`
- `config/backtest/campaigns/current/next-long-run-jp-12x10.json`
- `docs/research/current/README.md`
- `docs/research/current/manifest.json`
- `python/night_batch.py`
- `config/night_batch/*`

## 6) campaign 設計

### focused campaign

#### US

- campaign id: `strongest-overlay-us-12x9`
- universe: `next-long-run-us-12`
- phase design:
  - smoke: current universe の `smoke`
  - pilot: current universe の `pilot`
  - full: current universe の `full`
- preset set:
  - 55/18 tight: none / chandelier / atr
  - 55/20 tight: none / chandelier / atr
  - 55/22 tight: none / chandelier / atr

#### JP

- campaign id: `strongest-overlay-jp-12x9`
- universe: `next-long-run-jp-12`
- phase design:
  - smoke: current universe の `smoke`
  - pilot: current universe の `pilot`
  - full: current universe の `full`
- preset set: US と同じ 9 本

### broader campaign（focused 通過時のみ）

#### US

- campaign id: `strongest-overlay-us-50x9`
- universe: `long-run-us-50`
- phase design: `10 / 25 / 50`

#### JP

- campaign id: `strongest-overlay-jp-50x9`
- universe: `long-run-jp-50`
- phase design: `10 / 25 / 50`

### comparison rule

- ranking は market 混合で 1 本に潰さず、まず **US / JP を別々**に読む。
- そのうえで archive doc では cross-market section を追加し、
  - per-market summary
  - overlay cohort summary
  - base-anchor ごとの winner / loser
  を並べる。
- `best_symbol` が同一 symbol に過度集中する場合は、winner 判定を保留し broader へ進める。

## 7) 完了条件

- focused US / JP で overlay 比較用 campaign が valid config として読める。
- `tests/campaign.test.js` に focused / broader campaign の shape, preset order, matrix count, universe coupling を固定する RED テストが入る。
- comparison doc で各 base anchor ごとに
  - none
  - chandelier
  - atr
  の 3 本を同じ指標で横並び比較できる。
- `best_symbol` 依存が強いケースを doc 内で明示し、broader へ進める/止める基準を書けている。
- current pointer / manifest を壊さず、archive 側だけで durable に残せる。

## 8) スコープ

### In scope

- overlay contribution の切り分け
- focused -> broader の二段階 campaign 設計
- archive research doc と backtest references の残し方定義
- 55/20 anchor mismatch の扱いを明文化

### Out of scope

- 新 family の追加
- stop 幅 6 / 8 / 10 の広い探索
- exit 18 / 20 / 22 の再比較
- strict entry 50 / 55 / 60 の再比較
- FTD necessity 比較
- regime threshold 55 / 60 比較
- current campaign / night-batch default の差し替え
- current docs / manifest の世代更新（overlay 結果が current handoff を置き換えると判断される場合は別 tranche）

## 9) TDD 方針（RED -> GREEN -> REFACTOR）

### RED

- `tests/campaign.test.js` に失敗テストを先に追加する。
  - `strongest-overlay-us-12x9.json` / `strongest-overlay-jp-12x9.json` が valid
  - 9 preset IDs が deterministic order で入る
  - focused matrix が `9 x 3`, `9 x 6`, `9 x 12`
  - broader matrix が `9 x 10`, `9 x 25`, `9 x 50`
  - US focused は US-only、JP focused は JP-only
- 55/20 control を research-only で追加する場合は
  - `tests/strategy-catalog.test.js`
  - `tests/backtest.test.js`
  に RED を追加し、catalog / generator / retired projection を固定する。

### GREEN

- campaign JSON を最小限で追加して tests を通す。
- research-only control が必要なら additive に 1 preset だけ追加する。
- archive doc を最小構成で追加し、comparison artifact の path を決める。

### REFACTOR

- preset order の意味が読み取れる naming / notes を揃える。
- comparison doc の章立てを
  - question
  - method
  - focused read
  - broader read
  - adoption / reject
  に正規化する。

## 10) 検証コマンド

```bash
node --test tests/campaign.test.js
node --test tests/backtest.test.js tests/strategy-catalog.test.js
node --test tests/repo-layout.test.js tests/archive-latest-policy.test.js
npm test
git --no-pager diff --check
```

### 実行ルール

- `tests/backtest.test.js` と `tests/strategy-catalog.test.js` は、55/20 research-only control を追加する場合のみ。
- `tests/repo-layout.test.js` と `tests/archive-latest-policy.test.js` は、current/manifest を触らない前提なら smoke check 扱い。
- full regression は最後に `npm test`。

## 11) 研究 doc に残す内容

- question:
  - overlay は pure base に対して何を改善したか
- setup:
  - base anchor
  - fixed axes
  - variable axis
  - focused / broader universe
- result:
  - `net_profit`
  - `profit_factor`
  - `max_drawdown`
  - `percent_profitable`
  - `closed_trades`
  - `best_symbol`
- read:
  - best-symbol dependency
  - broader での維持 / 崩れ
  - 採用 / 不採用
  - 次に切るべき軸

## 12) active plan との衝突

- current active plan: `plans/exec/active/repo-information-architecture-restructure_20260416_0845.md`
- 直接衝突は小さい。
  - 相手は docs / IA / path governance が主対象
  - 今回は backtest campaign archive と archive research doc が主対象
- ただし `docs/research/current/` や manifest を触る設計へ広げると衝突面が増えるため、**overlay tranche は archive-only を既定**にする。

## 13) follow-on queue（今回の plan では実装しない）

1. **FTD necessity**
   - `none / ftd-early / ftd-late`
   - overlay なし固定
   - 55/20 family は今回と同じ control mismatch 問題を再確認
2. **exit 18 / 20 / 22**
   - 既存 archive campaign / results を baseline として再読
   - current 12-symbol focused で再確認するかだけを別 plan で決める
3. **strict entry 50 / 55 / 60**
   - 既存 archive 50x3 / 100x3 を baseline に、current 12-symbol で再確認するかを別 plan で決める
4. **regime 55 / 60**
   - 55/20 true control をどう扱うか確定後に着手

## 14) 承認時に決めること

1. 55/20 overlay 比較のために **research-only true 55/20 no-overlay control** を追加するか
2. follow-on queue を `overlay -> FTD -> exit -> strict -> regime` に並べ替えるか
