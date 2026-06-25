# Exec-plan: tradingview-heatmap-sector-alignment-research_20260626_0037

## Goal

米国株スクリーニングのPhase1/Phase2大セクター分類と、TradingView Stock Heatmapの大セクター分類が一致しているかを、コード・scanner API実データ・Heatmap UI/ネットワークの3方向から確認する。

## Scope

### In scope

- Phase1が利用するsectorフィールドと集計経路の特定。
- Phase1実データのセクター一覧抽出。
- Phase2プロファイルの対応セクター一覧抽出。
- Phase1とPhase2の不足・余分・名称差分比較。
- TradingView Stock HeatmapのUI、network request、JSON/configの調査。
- scanner sectorとHeatmap sectorの差分・一致度判定。
- 調査結果、参照資料、取得手順の文書化。

### Out of scope

- セクター分類コードの修正。
- GICS / ICB / NAICSへの移行。
- 中テーマ・小テーマの再設計。
- Phase4ランキングロジックの変更。

## Files

| File | Action | Purpose |
|---|---|---|
| `src/core/sector-momentum.js` | READ | Phase1セクター集計経路 |
| `src/core/fundamental-screener.js` | READ | scanner列とPhase1/Phase2接続 |
| `src/core/sector-screening-profiles.js` | READ | Phase2プロファイル一覧 |
| `docs/reports/screener/daily-ranking.md` | READ | 現行Phase1/Phase2出力 |
| `docs/research/tradingview-heatmap-sector-alignment.md` | CREATE | 最終調査レポート |
| `docs/research/manifest.json` | MODIFY | 調査レポートをkeep対象へ追加 |
| `docs/references/design-ref-llms.md` | MODIFY | TradingView公式参照資料を記録 |
| 本exec-plan | MOVE | 完了時にcompletedへ移動 |

## Steps

- [x] Phase1のsector取得・集計・選択経路をコードとテストから確定する。
- [x] scanner APIを実行し、米国株で返るsector/industry一覧を抽出する。
- [x] Phase2プロファイル一覧を抽出し、Phase1一覧との差分を計算する。
- [x] TradingView Stock Heatmapをブラウザで開き、表示セクターとnetwork/configを調査する。
- [x] Heatmap分類の由来についてTradingView公式資料を確認する。
- [x] scanner一覧とHeatmap一覧を比較し、一致度を判定する。
- [x] レポート・参照台帳・manifestを更新する。
- [x] 文書・layoutテストを実行し、計画をcompletedへ移動してcommit/pushする。

## Success Criteria

- Phase1/Phase2それぞれのセクター名一覧と由来が明示されている。
- Heatmap大セクター一覧または取得不能の根拠が明示されている。
- scanner sectorとの具体的な差分表がある。
- `完全一致 / ほぼ一致 / 不一致` の判定と今後の正本方針が示されている。
- 分類ロジックには変更がない。

## Validation

```powershell
node --test tests/archive-latest-policy.test.js
npm run test:unit
git diff --check
```

## Risks

- Heatmapは動的UIであり、表示ラベルが遅延ロードや認証状態で変わる可能性がある。
- network endpointは非公開仕様で変更され得るため、再現可能な取得方法と安定性を分けて評価する。
- scanner APIのsector一覧は対象市場・銘柄タイプ・取得rangeに依存するため、米国株全体を十分に覆うrangeで確認する。

## Result

- Phase1はTradingView scanner raw `sector`をそのまま集計していた。
- Phase1実データは20セクター、Phase2 unique scopeも20セクターで差分なし。
- S&P 500 Stock Heatmapのscanner responseも同じ20セクターだった。
- Heatmap bundleは`groupKeys: ["sector"]`、`translatedKeys: ["sector.tr"]`を使用していた。
- TradingView公式資料から、分類元はFactSet Industries and Economic Sectorsモデルと確認した。
- 判定は完全一致。分類ロジックの変更は不要。
- `docs/research/tradingview-heatmap-sector-alignment.md`へ詳細を記録した。
- `tests/archive-latest-policy.test.js` 4件、`npm run test:unit` 1001件が成功した。
- `tests/repo-layout.test.js`はrepoに存在しないため、実在するarchive policy testと全unit testsで検証した。
