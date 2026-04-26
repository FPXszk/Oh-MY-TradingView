# Night Batch Run68 micro sweep / 特殊エントリー実現性確認 計画

## 問題と方針

`docs/research/night-batch-self-hosted-run68_20260426.md` の結論では、`tp25-33-tp100-50` を軸に TP1 比率の micro sweep を優先すべきと整理されている。今回の作業では、まずこの示唆を踏まえた **10 個の micro sweep 戦略候補**を具体化し、あわせて **RSP が 200MA を下回る局面での特殊エントリー案**について、現行 repo の実装資産でどこまで再現できるかを調査し、research ドキュメントに判断を残す。

## 対象ファイル

- **作成** `docs/exec-plans/active/night-batch-run68-micro-sweep-feasibility_20260426_2314.md`
- **更新** `docs/research/night-batch-self-hosted-run68_20260426.md`

## 影響範囲

- run68 の研究メモに、次の比較候補 10 戦略と特殊エントリー案の feasibility を追記する
- 既存の preset / pine / campaign / test / 実装コードは変更しない

## 実装ステップ

- [ ] run68 の順位と既存 TP1 系 preset 群を読み直し、`tp25-33-tp100-50` を軸にした 10 個の micro sweep 候補を命名規則込みで整理する
- [ ] 現行 backtest / preset / raw_source の仕組みを根拠に、特殊エントリー案を「そのまま実装可能 / 追加実装で可能 / 現状データ不足で困難」に分解して評価する
- [ ] `docs/research/night-batch-self-hosted-run68_20260426.md` に、候補 10 件・評価理由・推奨優先順位・特殊エントリー feasibility を追記する
- [ ] 文面レビューを行い、run68 本来の結果サマリと今回の追加考察が混ざりすぎていないか確認する

## テスト戦略

- 今回は docs 更新のみのため、RED/GREEN/REFACTOR の対象となる自動テスト追加は行わない
- ただし記述は既存コード (`strategy-presets.json`, `strategy-catalog.json`, `research-backtest.js`, 既存 raw_source Pine) の実装事実に一致させる

## バリデーション

- 既存コードと docs の整合確認を行う
- 変更が docs のみで完結するため、repo テストコマンドは実行対象外とする

## リスク / 注意点

- TP1 候補名だけ先走って追加し、既存命名規則や既存 sweep の穴を外すと次の実装時に混乱する
- 特殊エントリー案には `Fear & Greed`, `AAII`, `NAAIM`, `S&P500 予想PER` など repo / Pine で直接扱っていない外部データが含まれるため、「今すぐ backtest に載せられる条件」と「追加データ導入が必要な条件」を明確に切り分ける必要がある

## スコープ外

- preset / catalog / raw_source Pine / campaign JSON の追加実装
- Night Batch の実行
- 実データ取得基盤や新しい外部 API 連携の追加

## 競合確認

- `docs/exec-plans/active/` の現行 active plan は `repo-structure-align-and-archive-rules_20260424_2015.md` のみで、今回の run68 分析タスクとは直接競合しない
