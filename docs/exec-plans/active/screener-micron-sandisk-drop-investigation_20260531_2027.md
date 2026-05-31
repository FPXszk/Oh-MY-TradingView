# Exec-plan: screener-micron-sandisk-drop-investigation_20260531_2027

## 目的

以前のスクリーニングでは上位に入っていた Micron / SanDisk 系銘柄が、現行のスクリーニング結果では入っていない理由を特定する。単なる推測ではなく、過去と現在の設定差分・実行結果差分・銘柄ごとの落選条件を確認し、どの条件が効いたのかを説明できる状態にする。

## 前提

- 依頼の中心は「なぜ今は入っていないのか」の調査であり、現時点ではスクリーニングロジックの変更は含めない
- 以前の調整内容は `docs/exec-plans/completed/` と現行コード差分から追跡できる前提で進める
- 「SanDisk」は銘柄名そのものではなく、現行ティッカーや親会社名で出ている可能性があるため、名称揺れも確認対象に含める
- 日次レポートと生データ JSON の両方を見て、順位表だけでなく候補母集団とスコア内訳も確認する

## 変更ファイル

| 種別 | ファイル | 内容 |
|---|---|---|
| 作成 | `docs/exec-plans/active/screener-micron-sandisk-drop-investigation_20260531_2027.md` | 本調査計画 |
| 参照 | `src/core/fundamental-screener.js` | 現行スクリーニング条件・スコア配分・除外条件の確認 |
| 参照 | `scripts/screener/run-fundamental-screening.mjs` | 現行レポート生成と出力内容の確認 |
| 参照 | `docs/reports/screener/daily-ranking.md` | 最新レポート上の結果確認 |
| 参照 | `docs/reports/screener/daily-ranking-run.json` | 最新 run metadata / 候補データ確認 |
| 参照 | `docs/exec-plans/completed/rebalance-fundamental-screener-balanced-weights_20260513_1725.md` | 以前のスコア調整意図の確認 |
| 参照 | `docs/exec-plans/completed/add-rule-of-40-to-us-screener_20260512_1955.md` | 追加指標導入の影響確認 |
| 参照 | `docs/exec-plans/completed/daily-screener-ranking-explainability_20260504_1942.md` | 順位説明に関わる出力構造の確認 |

## 影響範囲

- 影響あり
  - 調査結果の説明
  - 今後必要なら行うスクリーニング条件再調整の判断材料
- 影響なし
  - 現時点のスクリーニング実装
  - workflow / 自動化設定

## 範囲外

- 新しいランキングロジックの実装
- 指標追加や閾値変更
- GitHub Actions workflow の改修

## 実施ステップ

- [ ] 過去の調整内容を整理する
  - 確認: どのタイミングでスコア配分や補助指標が変わったかを特定する

- [ ] 現行レポートと run metadata を確認する
  - 確認: Micron / SanDisk 系が候補母集団にいるのか、いるなら何位付近か、いないならどの段階で落ちたかを切り分ける

- [ ] 現行コードの hard filter / ranking を確認する
  - 確認: 以前入っていた銘柄が今落ちる可能性のある条件を列挙する

- [ ] 銘柄単位で理由を特定する
  - 確認: Micron / SanDisk 系について、名称揺れ・市場データ欠損・hard filter 不通過・rank 低下のどれかを説明できる

- [ ] 結果を要約する
  - 確認: 「何が変わったから入らなくなったのか」をユーザーに短く説明できる

## 検証方法

```bash
rg -n "Micron|SanDisk|MU|SNDK|WDC" docs/reports/screener/daily-ranking.md docs/reports/screener/daily-ranking-run.json
node -e "const data=require('./docs/reports/screener/daily-ranking-run.json'); console.log(Object.keys(data));"
```

## リスク

1. 過去に見ていた「SanDisk」が現行では別ティッカーや親会社名で管理されている可能性がある
2. 最新 run metadata に候補全件が残っておらず、必要に応じてローカル再実行が必要になる可能性がある
3. 順位変動がコード変更だけでなく、直近マーケットデータ更新でも起きうるため、ロジック差分とデータ差分を分けて説明する必要がある

## 競合確認

- `docs/exec-plans/active/` 配下は空で、今回の調査と競合する active plan は見当たらない
