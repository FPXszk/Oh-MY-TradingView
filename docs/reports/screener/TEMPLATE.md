# スクリーニング結果 YYYY/MM/DD（曜）

更新: HH:MM JST

セクター別取得候補 XXX銘柄 → ユニバース条件通過 XXX銘柄 → ランキング対象 XXX銘柄 → レポート掲載 XX銘柄

このファイルは、日次スクリーニング Markdown の見出しと章立てを確認するための雛形です。実際の出力ロジックの正本は [run-fundamental-screening.mjs](/home/fpxszk/code/Oh-MY-TradingView/scripts/screener/run-fundamental-screening.mjs:144) の `buildMarkdown()` にあります。

## Phase1 セクターランキング

- Phase1 ソース候補数
- 相対強度の基準: SPY
- `12M / 6M / 3M` はセクター構成銘柄の平均リターン
- `SPY差`、`SMA50上`、`SMA200上`、`52w高値90%内` を確認

## 銘柄ランキング

- メインのランキング表（企業規模は時価総額で確認）

---

**スコア算出:**

| ブロック | 重み | 主な評価項目 | 役割 |
|:---|---:|:---|:---|
| Price momentum | 67% | 12M / 6M / 3M momentum、52週高値比率 | 何を最重視しているか |
| Sector strength | 10% | sector rank、sector 12M / 6M / 3M | セクター追随の確認 |
| Profitability / quality | 10% | ROIC、GP/A、FCF margin など | 収益性の確認 |
| Growth confirmation | 5% | 売上 / EPS / FCF growth | 成長確認 |
| Risk / value guard | 5% | P/FCF、EV/EBITDA、ATR%、beta、D/E | 過熱抑制 |
| Rule of 40 | 3% | revenue growth + FCF margin | US software 補助確認 |

**フィルター条件と scoring guide:**
| 区分 | 項目 | 条件・説明 |
|:---|:---|:---|
| 共通条件 | ベース条件 | 時価総額 / EPS / SMA / 52週高値条件 |
| 補助ポリシー | Rule of 40 | 対象範囲、式、badge / warning 条件 |
| ユニバース | 取引所 | NASDAQ, NYSE など |
| ユニバース | 銘柄ユニバース | allowlist がある場合のみ |
| 補助ポリシー | Yahoo Finance 補完 | null 許容などの扱い |
| セクタープロファイル | Technology Services | hard gate と scoring 条件 |
