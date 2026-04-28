# 今夜用 US40 50pack 再構成計画

## 目的
- 今夜回す US40 40銘柄 × 50戦略 = 2000 run 用の campaign を再構成する。
- 2本の baseline を含め、前回強かった recovery 4本を残しつつ、比較価値の低い 1 本を外した 50 本構成にする。
- 実行期間を `2015-01-01` から `2026-04-27` に固定する。

## 前提整理
- 依頼された 2 baseline はどちらも **既に live preset として登録済み**:
  - `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`
  - `donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50`
- 指定された上位 4 本も **既に live preset として登録済み**。
- 既存 `strongest-plus-recovery-reversal-us40-50pack` は 50 本すべて live preset を参照しており、そこから 1 本だけ外して deep-pullback baseline を足せば、依頼どおり
  - 2 baseline
  - 上位 4 本そのもの
  - 派生 44 本
  の合計 50 本を満たせる。

## 変更対象ファイル
- 作成: `config/backtest/campaigns/deep-pullback-plus-recovery-us40-50pack.json`
- 作成: `config/night_batch/deep-pullback-plus-recovery-us40-50pack.json`
- 変更: `tests/campaign.test.js`
- 作成: `docs/exec-plans/active/tonight-us40-50pack-recompose_20260428_2259.md`

## 変更予定なし（監査のみ）
- `config/backtest/strategy-presets.json`
- `config/backtest/strategy-catalog.json`
- 既存 `config/night_batch/*.json`

## 実装内容
- 既存 `strongest-plus-recovery-reversal-us40-50pack` をベースに、新しい今夜用 campaign を追加する。
- `strategy_ids` は以下のルールで 50 本にする:
  - 追加: `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`
  - 維持: `donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50`
  - 維持: 上位 4 本
  - 維持: 既存 `strongest-plus-recovery-reversal-us40-50pack` の残り候補
  - 除外: `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-or-rsi2x10-sma25-rsi65`
- 除外理由:
  - `docs/research/night-batch-self-hosted-run71_20260428.md` で `即除外` 候補
  - avg net profit / PF / DD のすべてで平均を明確に下回っている
- 新 campaign の `date_override` は以下に固定する:
  - `from: "2015-01-01"`
  - `to: "2026-04-27"`
- smoke phase は既存 US40 campaign と同様に `SPY` 1銘柄だけで各戦略 1 回ずつ確認する。
- workflow 実行用に `config/night_batch/deep-pullback-plus-recovery-us40-50pack.json` を追加し、新 campaign を dispatch 可能にする。

## 50戦略の構成
- Baseline 1: `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`
- Baseline 2: `donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50`
- 上位 4 本:
  - `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi65`
  - `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi65`
  - `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma15-rsi62`
  - `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma15-rsi60`
- 派生 44 本:
  - 既存 `strongest-plus-recovery-reversal-us40-50pack` の recovery 系 45 本から、上記除外 1 本だけを外したもの

## 影響範囲
- 新 campaign を使うと、今夜用の US40 50pack は `2026-04-27` までを対象に 2000 run で読めるようになる。
- 既存 `strongest-plus-recovery-reversal-us40-50pack` とその過去比較軸は壊さない。
- live preset 件数や catalog 件数は変えない。

## スコープ外
- TradingView My Scripts への登録
- night batch dispatch の実行
- 新規 raw_source Pine の作成
- 既存 preset / catalog のリネームや整理

## テスト戦略
- 既存の件数固定テストは触らず、新 campaign 読み込みテストだけを追加する。
- 想定検証:
  - `node --test tests/campaign.test.js`
  - 必要に応じて `node --test tests/repo-layout.test.js`

## リスク
- campaign 名を新設するため、今夜の実行時にどの campaign を指定するかを取り違える可能性がある。
- `strategy_ids` の並びを崩すと、後段の比較メモと突き合わせにくくなる。
- もし「新しい派生 44 本を追加作成したい」という意図だった場合、この最小変更案では不足する。その場合は別 exec-plan で preset / catalog / Pine 一式を追加する必要がある。

## No-overlap check
- `docs/exec-plans/active/repo-structure-align-and-archive-rules_20260424_2015.md` は docs / archive 整理タスクであり、今回の campaign 追加とは競合しない。

## 実装ステップ
- [x] 新 campaign `deep-pullback-plus-recovery-us40-50pack` の JSON を追加する
- [x] workflow dispatch 用の `config/night_batch/deep-pullback-plus-recovery-us40-50pack.json` を追加する
- [x] strategy_ids を 50 本に整え、baseline 2 本・上位 4 本・派生 44 本の構成を確認する
- [x] `date_override.to` を `2026-04-27` に固定する
- [x] `tests/campaign.test.js` に新 campaign の 40 x 50 と smoke phase の読み込み検証を追加する
- [x] `node --test tests/campaign.test.js` を実行する
- [x] `node --test tests/repo-layout.test.js` を実行し、副作用がないことを確認する
