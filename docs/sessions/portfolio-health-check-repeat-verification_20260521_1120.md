# Session Log 20260521_1120

## Summary

安定化後の `Portfolio Health Check` workflow を追加で 2 回 live 実行して確認した。結果は 2 回とも `success` だったが、SBI capture の取得内容と所要時間にはまだばらつきがある。特に 1 回目は `ALLTYPE` が欠け、2 回目は `ALLTYPE` / `DISTRIBUTION` の両方が取得できた。

## User Request

- あと 1 回か 2 回 workflow を実行して、ちゃんと成功するか見たい
- 不安定さが直っているかを確認したい

## Runs

### Run 1

- run id: `26201631346`
- conclusion: `success`
- duration: `17m46s`
- artifact:
  - `portfolio_health_check_report.md`
  - `capture/latest/capture-summary.md`
  - `downloads/DISTRIBUTION_20260521113915.csv`
  - `downloads/SaveFile.csv`
- SBI capture summary:
  - `米国株式` direct CSV: 未取得
  - `実現損益詳細` CSV: 未取得
  - `配当金・分配金履歴` CSV: 取得成功
- report:
  - 統合レポートは生成成功
  - ただし `実現損益` 商品別集計は空

### Run 2

- run id: `26201631375`
- conclusion: `success`
- duration: `5m2s`
- artifact:
  - `portfolio_health_check_report.md`
  - `capture/latest/capture-summary.md`
  - `downloads/ALLTYPE_20260521114408.csv`
  - `downloads/DISTRIBUTION_20260521114422.csv`
  - `downloads/SaveFile.csv`
- SBI capture summary:
  - `米国株式` direct CSV: 未取得
  - `実現損益詳細` CSV: 取得成功
  - `配当金・分配金履歴` CSV: 取得成功
- report:
  - 統合レポートは生成成功
  - `実現損益` / `配当金・分配金履歴` とも本文に反映

## Interpretation

- **成功率**:
  - 直近 2 run は `2/2 success`
- **改善した点**:
  - workflow 自体が途中失敗せず、最終統合レポートまで到達した
  - `配当金・分配金履歴` は 2/2 で安定
  - `実現損益詳細` は 1/2 で成功
- **まだ不安定な点**:
  - `実現損益詳細` CSV (`ALLTYPE`) は run により欠ける
  - 実行時間が `17m46s` と `5m2s` で大きくぶれる
  - `米国株式` direct CSV は依然取れず、fallback 前提

結論としては、

- workflow 全体の **成功しやすさは改善**
- ただし SBI 側の **内容完全性はまだ flaky**

という評価が妥当。

## Evidence

- run 1 artifact:
  - `tmp/26201631346/portfolio-health-check-26201631346/`
- run 2 artifact:
  - `tmp/26201631375/portfolio-health-check-26201631375/`

## Commits

- `7fa6311` `docs: portfolio-health-check-repeat-verification_20260521_1120`
