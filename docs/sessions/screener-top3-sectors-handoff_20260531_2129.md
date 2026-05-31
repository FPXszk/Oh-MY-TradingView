# Screener Top3 Sectors Handoff 20260531_2129

## 今回やったこと

- US ファンダメンタルスクリーナーを `Phase1 上位3セクターのみ` に変更
- `SNDK` を落としていた Moomoo 売上成長率 hard filter を削除し、growth scoring のみへ変更
- `MU` に効いていた半導体 `IDM/foundry` の `P/FCF` 上限を `100 -> 120` に緩和
- レポートを「横断ランキング」から「上位3セクターごとに最大30件表示」へ変更

## 変更ファイル

- `.github/workflows/daily-screener.yml`
- `src/core/fundamental-screener.js`
- `src/core/sector-momentum.js`
- `src/core/sector-screening-profiles.js`
- `src/core/semiconductor-business-models.js`
- `scripts/screener/run-fundamental-screening.mjs`
- `tests/fundamental-screener.test.js`
- `tests/daily-screener-report.test.js`
- `docs/reports/screener/daily-ranking.md`

## live 確認結果

実行コマンド:

```bash
MOOMOO_HOST=172.31.144.1 MOOMOO_PORT=11112 MOOMOO_ADAPTER_TIMEOUT_MS=30000 SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE SCREENER_RESULT_LIMIT=90 SCREENER_SELECTED_SECTOR_COUNT=3 node scripts/screener/run-fundamental-screening.mjs
```

結果:

- `totalScanned=206`
- `serverFiltered=121`
- `clientFiltered=69`
- `matched=69`

最新レポートでは:

- Phase1 採用セクターは `Electronic Technology`, `Communications`, `Producer Manufacturing`
- `MU` は Electronic Technology 1位
- `SNDK` は Electronic Technology 2位
- 4位以下セクターは Phase1 除外でレポート非掲載

## 銘柄メモ

- `MU`
  - 現在 `P/FCF = 107.9`
  - 半導体 `IDM` 上限を `120` にしたので workflow eligible に復帰
- `SNDK`
  - `revenueGrowth = 10.38%`
  - 以前は半導体の `revenueGrowthMinPct=15` hard filter で落ちていた
  - いまは hard filter を外したので workflow eligible に復帰

## 次に見るとよさそうな点

- 総合点の設計を、ユーザーが言っていた「ファンダメンタルの配点をもっと明示的にしたい」方向へ再設計するか
- `Communications` が 2位セクターに入るのが意図通りか
- `Producer Manufacturing` 2位/3位まわりで、OTC を含めない運用前提なら rank の納得感が十分か

## コミット

- plan commit: `f0f5fb4` `docs: update screener adjustment plan`
- implementation commit: `8d126b6` `feat: focus screener on top sectors`
