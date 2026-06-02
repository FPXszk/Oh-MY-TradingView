# スクリーニング結果 YYYY/MM/DD（曜）

更新: HH:MM JST

セクター別取得候補 XXX銘柄 → ユニバース条件通過 XXX銘柄 → ランキング対象 XXX銘柄 → レポート掲載 XX銘柄

このファイルは、日次スクリーニング Markdown の見出しと章立てを確認するための雛形です。実際の出力ロジックの正本は [run-fundamental-screening.mjs](/home/fpxszk/code/Oh-MY-TradingView/scripts/screener/run-fundamental-screening.mjs:144) の `buildMarkdown()` にあります。

## Phase1 セクターランキング

- Phase1 ソース候補数
- 相対強度の基準: benchmark
- `12M / 6M / 3M` はセクター構成銘柄の平均リターン
- `benchmark差`、`SMA50上`、`SMA200上`、`52w高値90%内` を確認

## Phase2 セクター別ランキング

- メインのランキング表（企業規模は時価総額で確認）
- `12M / 6M / 3M` は銘柄自身のリターン
- `52w` は 52 週高値に対する現在位置

### 1位 セクター名

- 通過銘柄数
- セクター平均3M / 平均総合点

| セクター順位 | セクター内順位 | シンボル | 市場 | 時価総額 | 12M | 6M | 3M | 52w | ROIC | GP/A | FCF | 売上YoY | Rule40 | EPS YoY | P/FCF | ATR% | 総合点 (T/F) |
|:---:|:---:|:---|:---:|:---|---:|---:|---:|---:|---:|---:|---:|---:|:---|---:|---:|---:|---:|
| 1 | 1 | **AAA** | NASDAQ | $12.3B | 120.0% | 55.0% | 22.0% | 96.0% | 24.0% | 18.0% | 16.0% | 20.0% | 36.0 | 18.0% | 25.0 | 3.2% | 60.00 (T30.0/F30.0) |

---

**スコア算出:**

| ブロック | 重み | 主な評価項目 | 役割 |
|:---|---:|:---|:---|
| Price momentum | 32% | 12M momentum, 6M momentum, 3M momentum, 52w high proximity | 最も重視。上昇トレンドの強さと52週高値接近を評価 |
| Sector strength | 15% | Phase1 sector rank | 強いセクター追随かを確認 |
| Profitability / quality | 25% | ROIC, Gross profit / assets, Operating margin, FCF margin, Cash conversion | 収益性とキャッシュ創出力を確認 |
| Growth confirmation | 10% | Revenue YoY growth, EPS YoY growth, FCF YoY growth, Moomoo revenue growth | 売上・EPS・FCF の成長確認 |
| Risk / value guard | 15% | P/FCF, EV/EBITDA, ATR %, Beta 1Y, Debt / equity | 過熱バリュエーションと変動リスクを抑制 |
| Rule of 40 (US software) | 3% | Revenue growth + FCF margin | US software の質を補助的に確認 |

**指標説明:**

- この表は Phase2 の銘柄ランキング列を対象にしています。Phase1 の `12M / 6M / 3M` はセクター構成銘柄の平均リターンです。
- Phase1 の `52w高値90%内` は、セクター構成銘柄のうち 52 週高値の 90% 以内にいる銘柄比率です。

| 列名 | 意味 | 見方 |
|:---|:---|:---|
| セクター順位 | Phase1 でのセクター順位 | 1 が最上位セクター |
| セクター内順位 | そのセクター内での順位 | 1 がそのセクター内トップ |
| シンボル | 銘柄のティッカー | 例: NVDA, AAPL |
| 市場 | 上場市場 | NASDAQ / NYSE / TSE など |
| 時価総額 | 企業規模の目安 | 大型株かどうかの確認に使う |
| 12M | 過去12か月の株価騰落率 (Perf.Y) | 長期モメンタム。高いほど 1 年で強い |
| 6M | 過去6か月の株価騰落率 (Perf.6M) | 中期モメンタム |
| 3M | 過去3か月の株価騰落率 (Perf.3M) | 足元の勢い。短中期モメンタム |
| 52w | 現在株価が 52 週高値の何%位置か | 100% に近いほど 52 週高値圏 |
| ROIC | 投下資本利益率 | 事業に使った資本でどれだけ利益を生むか |
| GP/A | Gross Profit / Assets = 粗利益 ÷ 総資産 | 資産に対する稼ぐ力を見る quality 指標 |
| FCF | FCF margin = フリーキャッシュフロー ÷ 売上 | 売上がどれだけ現金として残るか |
| 売上YoY | 売上高の前年比成長率 | 事業成長の確認 |
| Rule40 | 売上YoY + FCF margin | 主に US software 系の成長と収益性をまとめて確認 |
| EPS YoY | EPS の前年比成長率 | 利益成長の確認。N/A は TradingView 側の欠損 |
| P/FCF | 株価 ÷ FCF の倍率 | 低いほど割高感が小さい傾向 |
| ATR% | ATR ÷ 株価 × 100 | 値動きの荒さ。高いほどボラティリティが高い |
| 総合点 (T/F) | repo 独自の総合スコア | 高いほど良い。T はテクニカル寄り、F はファンダ寄り |

**フィルター条件と scoring guide:**
| 区分 | 項目 | 条件・説明 |
|:---|:---|:---|
| 共通条件 | ベース条件 | 時価総額 / EPS / SMA / 52週高値条件 |
| 補助ポリシー | Rule of 40 | 対象範囲、式、badge / warning 条件 |
| 補助ポリシー | Theme taxonomy | repo 独自 taxonomy の版情報 |
| ユニバース | 取引所 | NASDAQ, NYSE など |
| ユニバース | 銘柄ユニバース | allowlist がある場合のみ |
| 補助ポリシー | Moomoo 補助 | 売上成長率の補助利用方針 |
| セクタープロファイル | Technology Services | hard gate と scoring 条件 |
