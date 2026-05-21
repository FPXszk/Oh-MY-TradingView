# Session Log 20260521_1103

## Summary

`SBI Portfolio Capture` の待機と再試行を安定化し、`Portfolio Health Check` workflow の live run `26201183615` で最終統合レポート生成まで確認した。固定 sleep 中心だった遷移待ちを DOM 安定待ちに寄せ、CSV ダウンロードは一時ファイルが消えて変化が落ち着くまで completion 扱いにしないよう改善した。

## User Request

- SBI 側の待機時間や不安定性をデバッグして、より安定する方法を入れたい
- 画面遷移が早すぎる、ダウンロード失敗時の再試行不足などを改善したい
- 最後に実際の workflow を回し、期待値のレポートが生成されるか確認したい

## What Changed

- Update: `scripts/sbi/capture-portfolio-data.mjs`
  - `waitForPageSettle()` を `readyState=complete` + DOM 安定連続 poll ベースへ強化
  - CSV download completion 判定に pending file (`.crdownload`, `.tmp`, `Unconfirmed`) 回避を追加
  - route capture を attempt 単位で再試行できるようにし、`実現損益詳細` / `配当金・分配金履歴` など CSV 必須 route の取りこぼしに備えた
  - `照会` 後の wait を固定 2 秒から settle wait へ変更
  - summary note に attempt 番号つきで遷移・submit・range forcing の詳細を残すようにした
- Update: `tests/sbi-capture-workflow.test.js`
  - route attempt plan
  - pending download detection
  - route retry decision
  を固定する test を追加
- Update: `docs/strategy/sbi-portfolio-report-workflow.md`
  - stability update を追記

## Verification

### Local tests

- `node --test tests/sbi-capture-workflow.test.js` -> success
- `node --test tests/sbi-portfolio-report.test.js` -> success
- `node --test tests/moomoo.test.js` -> success
- `git diff --check` -> clean

### Live workflow run

- workflow: `Portfolio Health Check`
- run id: `26201183615`
- conclusion: `success`
- duration: `3m9s`
- URL: <https://github.com/FPXszk/Oh-MY-TradingView/actions/runs/26201183615>

artifact で確認できたこと:

- `portfolio_health_check_report.md`
- `moomoo_portfolio_diagnostics.json`
- `capture/latest/capture-summary.md`
- `capture/latest/downloads/ALLTYPE_20260521110941.csv`
- `capture/latest/downloads/DISTRIBUTION_20260521110955.csv`
- `capture/latest/downloads/SaveFile.csv`
- `capture/latest/foreign-holdings-page.json`

最終レポートで確認できたこと:

- 先頭に `総合サマリー`
- その下に `総合保有一覧`
- 下段に `SBI 詳細` と `moomoo 詳細`
- SBI 側で
  - 総資産 `￥5,405,576`
  - 米国株 5 件
  - 投資信託 3 件
  - `配当金・分配金履歴`
  - `DISTRIBUTION_20260521110955.csv`
  を反映

capture summary で確認できたこと:

- `実現損益詳細` route は `ALLTYPE_20260521110941.csv` 回収成功
- `配当金・分配金履歴` route は `DISTRIBUTION_20260521110955.csv` 回収成功
- `米国株式` route は direct CSV は未取得のままだが、`外国株式トップ -> 保有銘柄` fallback が動き、`foreign-holdings-page` snapshot を確保

## Interpretation

- もっとも効いたのは「固定 sleep を増やすこと」ではなく、
  - 遷移後に DOM が安定するまで待つ
  - download mutation が落ち着くまで完了扱いにしない
  - CSV 必須 route は route ごとに再進入できるようにする
  の 3 点だった
- 今回の live run では `ALLTYPE` と `DISTRIBUTION` の両 CSV が取得でき、最終レポートも統合形で生成されたため、SBI 側の安定性は一段改善したと判断してよい
- ただし `米国株式` direct CSV は依然 flaky なので、ここは引き続き fallback 前提の運用が妥当

## Commits

- `2aacdf9` `docs: sbi-capture-stability-debug_20260521_1103`
- `c3de527` `fix: stabilize sbi portfolio capture`
