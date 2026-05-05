# Momentum x Fundamental Screening Indicators Research 2026-05-05

## 目的

`docs/strategy/deep-research-instruction.md` に従い、「今まさにモメンタムがあり、ファンダメンタルが最強の銘柄」を日次で抽出するための指標セットを検証した。

結論は、現行スクリーナーの方向性は正しい。ただし中核スコアを `Perf.3M + ROE + FCF margin` に寄せすぎているため、次の改善余地が大きい。

- 価格モメンタムは `Perf.3M` 単独ではなく、`Perf.6M`、`Perf.Y`、12-1 モメンタム相当、52週高値接近度、セクター/業種モメンタムで束ねる。
- ファンダメンタルは `ROE` 単独を避け、`ROIC`、粗利益/総資産、営業利益率、FCF マージン、FCF 利回り、D/E を組み合わせる。
- 成長は売上成長率だけでなく、EPS 成長、FCF 成長、売上サプライズ/利益サプライズを優先する。ただし日次スクリーナーではサプライズ系のデータ取得が課題。
- RSI、MACD、BB、VWAP は主役ではなく、エントリー確認または過熱/失速の補助に降格する。

## 調査範囲と制約

- 調査日: 2026-05-05 JST
- 対象コード: `src/core/fundamental-screener.js`、`src/core/sector-momentum.js`、`src/core/sector-screening-profiles.js`、`scripts/screener/run-fundamental-screening.mjs`
- 外部根拠: 学術論文、AQR / Kenneth French / Alpha Architect / Robeco / Quantpedia などの実務資料、X/Twitter、Reddit、Substack、GitHub 上の周辺実装
- データ取得可否: 現行実装と TradingView Scanner API への軽いフィールド確認を根拠にした。Yahoo Finance は現行の `revenueGrowth` 補完のみ前提とした。
- 有料 DB、ログイン必須論文、非公開 API は採用判断の根拠にしない。
- X/Twitter、Reddit、Substack、GitHub は実務上の関心と実装ヒントとして扱い、論文根拠より上位には置かない。

## 現行スクリーナーの棚卸し

現行の `runFundamentalScreener` は、Phase 1 で強いセクターを選び、Phase 2 でそのセクター内の銘柄をファンダメンタルと価格条件で絞り込む。

### Phase 1: セクター選択

- US: sector ETF を `Perf.3M`、`Perf.1M`、`RSI`、`relative_volume_10d_calc` の rank-sum で評価する。
- JP: 個別株をセクター集計し、`Perf.3M`、`Perf.1M`、`RSI`、`RSI >= 60 の比率`、`relative_volume_10d_calc` の rank-sum で評価する。
- 良い点: 個別株選定前に市場の資金流入先を絞るため、Moskowitz and Grinblatt (1999) の業種モメンタムと整合する。
- 弱い点: 1カ月モメンタムと RSI を rank 中核に入れているため、短期リバーサルの影響を受けやすい。

### Phase 2: 個別銘柄フィルター

共通条件:

- 時価総額 > 10億ドル
- EPS(TTM) > 0
- Close > SMA200
- Close > SMA50
- Close >= 52週高値の 75%

セクター別条件:

- `RSI`
- `relative_volume_10d_calc`
- `return_on_equity`
- `gross_margin_ttm`
- `free_cash_flow_margin_ttm`
- `Perf.3M`
- `P/FCF`
- Yahoo 補完時のみ `revenueGrowth`

現在のランキング:

- Yahoo 補完なし: `rank(Perf.3M) + rank(ROE) + rank(FCF margin)`
- Yahoo 補完あり: `rank(Perf.3M) + rank(ROE) + rank(FCF margin) + rank(revenueGrowth)`

この設計は「モメンタム、収益性、キャッシュ創出」を押さえている。一方、ROE のレバレッジ歪み、3カ月モメンタムの短期寄り、粗利率と粗利益/総資産の混同、売上成長の glamour リスクが残る。

## 評価基準

| 評価 | 意味 |
|---|---|
| ◎ | 中核採用。論文・実証根拠が強く、日次スクリーナーにも落としやすい |
| ○ | 採用候補。中核指標を補強するが、単独では過信しない |
| △ | 条件付き。根拠、データ取得、セクター適合、過剰最適化のどれかに制約がある |
| ✕ | 不採用または削除候補。日次スクリーナーの中核には向かない |

取得可否の表記:

- TV 直取得: TradingView Scanner API の列として取得可能
- TV 計算: TradingView の既存列を組み合わせれば計算可能
- Yahoo 補完: 現行 Yahoo Finance 補完または類似補完が必要
- 外部必要: 13F、ショート残高、アナリスト予想、決算サプライズなど外部データが必要
- 未確認: 公開 API 上の安定取得を確認していない

## 現行指標の検証

| 指標 | 定義/計算式 | 経済的意味 | 根拠 | 評価 | 取得可否 | 追加優先度 |
|---|---|---|---|---|---|---|
| RSI | Wilder の 14期間 RSI。上昇幅/下落幅から 0-100 で短期強弱を測る | 短期の価格強度と過熱度 | Wilder (1978)。ただし横断的株式リターン根拠は中期モメンタムより弱い | ○ | TV 直取得 `RSI` | P1。rank 中核ではなく entry confirmation |
| Perf.3M | 3カ月リターン | 中期価格モメンタム | Jegadeesh and Titman (1993, 2001)、Asness et al. (2013) | ◎ | TV 直取得 `Perf.3M` | P0。残すが 6M/12M と併用 |
| 相対出来高 | 当日/近時点出来高を10日平均で割る | 注目度、需給ショック、ブレイクアウト確認 | Lee and Swaminathan (2000)、Gervais et al. (2001) | ○ | TV 直取得 `relative_volume_10d_calc` | P1。単独順位でなく confirmation |
| 52週高値比率 | `close / price_52_week_high` | 投資家アンカーを上抜く強い銘柄の検出 | George and Hwang (2004) | ◎ | TV 計算 | P0。75% floor は維持、上位 rank に追加 |
| ROE | `net income / equity` | 資本効率 | Fama and French (2015) の profitability と整合するが、レバレッジで歪む | ○ | TV 直取得 `return_on_equity` | P1。D/E と ROIC で補正 |
| 粗利率 | `gross profit / revenue` | 価格決定力、ソフトウェア型の収益性 | Novy-Marx (2013) は粗利率ではなく粗利益/総資産を重視 | ○ | TV 直取得 `gross_margin_ttm` | P1。Tech では有効、全業種中核にはしない |
| FCF マージン | `free cash flow / revenue` | 売上が現金に変わる質 | Sloan (1996)、Dechow et al. (1995) の accruals 論点と整合 | ◎ | TV 直取得 `free_cash_flow_margin_ttm` | P0。現行維持 |
| EPS(TTM)>0 | 希薄化後 EPS が正 | 赤字企業を除外 | PEAD や収益性研究とは別で、最低限の安全弁 | ○ | TV 直取得 `earnings_per_share_diluted_ttm` | P1。rank ではなく gate |
| P/FCF | `market_cap / free_cash_flow_ttm` | FCF 利回りの逆数。過大評価回避 | Value/quality 文献、Greenblatt、Loughran and Wellman (2011) と近い考え | ○ | TV 計算、`price_free_cash_flow_ttm` も取得可 | P1。セクター別 cap が必要 |
| 売上成長率 | YoY 売上成長 | 成長持続と TAM 拡大 | Jegadeesh and Livnat (2006)。単純 growth は La Porta (1996) の期待過大リスクあり | ○ | 現行 Yahoo 補完、TV `total_revenue_yoy_growth_*` も取得可 | P1。EPS/FCF 成長と束ねる |
| Close > SMA200 | 200日移動平均を上回る | 長期 uptrend filter | Brock et al. (1992)、Park and Irwin (2007)、Moskowitz et al. (2012) | ○ | TV 直取得 `SMA200` | P1。gate として維持 |
| Close > SMA50 | 50日移動平均を上回る | 中期 uptrend filter | trend-following 系実証と整合 | ○ | TV 直取得 `SMA50` | P1。gate として維持 |
| 時価総額 | `market_cap_basic` | 流動性、売買可能性、データ品質 | size premium そのものではなく実務制約 | ○ | TV 直取得 | P1。alpha ではなく universe gate |

## 追加候補40項目の評価

| No | 指標 | 定義/計算式 | 経済的意味 | 根拠 | 評価 | 取得可否 | 追加優先度 |
|---:|---|---|---|---|---|---|---|
| 1 | Perf.1M | 1カ月リターン | 短期資金流入 | 短期では Jegadeesh (1990)、Lehmann (1990) のリバーサルも強い | △ | TV 直取得 `Perf.1M` | P2。Phase1 の補助に限定 |
| 2 | Perf.6M / Perf.12M | 6カ月、12カ月リターン | 中期モメンタムの王道 | Jegadeesh and Titman (1993, 2001)、Fama and French factor library | ◎ | TV 直取得 `Perf.6M`, `Perf.Y` | P0。次の最優先追加 |
| 3 | 12-1 モメンタム | 直近1カ月を除いた過去12カ月リターン | リバーサルを除いた持続トレンド | Carhart/FF momentum、AQR factor 定義 | ◎ | TV 単独不可。OHLC 履歴で計算 | P0。履歴取得があるなら最優先 |
| 4 | セクター/業種モメンタム | sector/industry の平均または ETF リターン | 資金流入テーマの特定 | Moskowitz and Grinblatt (1999)、Griffin et al. (2003) | ◎ | 現行実装済み | P0。Phase1 維持、1M 依存を弱める |
| 5 | 新高値フラグ | 52週高値更新または接近 | 強い winner のアンカー突破 | George and Hwang (2004) | ◎ | TV 計算 | P0。比率 rank と新高値 flag を追加 |
| 6 | 価格加速度 | `Perf.3M - Perf.6M/2` など | 勢いの加速/失速 | 実務では使うが学術根拠は中期モメンタムほど強くない | △ | TV 計算 | P2。過剰最適化に注意 |
| 7 | 残差モメンタム | 市場/業種/ファクター回帰残差の momentum | beta や sector を除いた固有トレンド | Blitz et al. (2011)、Robeco | ○ | 外部計算必要 | P1。実装コストは高いが有望 |
| 8 | Time-series momentum | 過去リターンが正ならロングなど | 銘柄自身のトレンド持続 | Moskowitz, Ooi and Pedersen (2012) | ○ | TV 計算 | P1。横断 rank の gate として有用 |
| 9 | ROIC | `NOPAT / invested capital` | 事業資本への収益性 | Fama and French (2015)、quality investing 実務 | ◎ | TV 直取得 `return_on_invested_capital` | P0。ROE の代替/補正 |
| 10 | ROCE | `EBIT / capital employed` | 資本集約産業の効率 | ROIC と近い quality 指標 | ○ | TV 直取得未確認、計算は外部必要 | P2。ROIC 優先 |
| 11 | Gross profit / assets | `gross_profit_ttm / total_assets` | Novy-Marx 型の粗収益性 | Novy-Marx (2013) | ◎ | TV 計算 `gross_profit_ttm`, `total_assets` | P0。粗利率より優先 |
| 12 | Operating profitability | 営業利益または営業利益率 | Fama-French 5 factor の profitability | Fama and French (2015) | ◎ | TV 直取得 `operating_margin_ttm`。厳密定義は計算必要 | P0/P1。スコアへ追加 |
| 13 | Net margin | `net income / revenue` | 最終利益率 | Profitability の補助 | △ | TV 直取得 `net_margin_ttm` | P2。FCF/営業利益率より下 |
| 14 | Cash conversion ratio | `FCF / net income` または `CFO / net income` | 利益の現金化、accruals 回避 | Sloan (1996)、Dechow et al. (1995) | ○ | TV 計算 `free_cash_flow_ttm`, `net_income_ttm`, `cash_f_operating_activities_ttm` | P1。FCF 質の確認に追加 |
| 15 | Asset turnover | `revenue / assets` | DuPont 分解、資産効率 | Soliman (2008) | △ | TV 直取得未確認、計算は可能性あり | P2。業種差が大きい |
| 16 | EPS acceleration / SUE | EPS 成長の加速、標準化予想外利益 | 決算後の過小反応 | Ball and Brown (1968)、Bernard and Thomas (1989) | ◎ | SUE は外部必要。TV EPS YoY は取得可 | P1。TV では EPS YoY proxy |
| 17 | Revenue acceleration | 売上 YoY の改善幅 | 成長の加速 | Jegadeesh and Livnat (2006) | ○ | TV `total_revenue_yoy_growth_ttm/fq` | P1。売上成長単体より良い |
| 18 | Operating leverage | 売上成長に対する利益成長感応度 | 固定費型ビジネスの利益伸長 | Novy-Marx (2011) など operating leverage 研究 | △ | 外部計算必要 | P2。実装時は sector 別 |
| 19 | Earnings surprise / PEAD | 決算発表後の abnormal return や analyst surprise | 情報の遅い織り込み | Foster et al. (1984)、Bernard and Thomas (1989) | ◎ | 外部必要 | P1。データ導入時の優先候補 |
| 20 | Forward EPS growth | アナリスト予想 EPS 成長 | 将来成長期待 | 実務で重要だが analyst bias あり | △ | TV フィールド未確認、Yahoo/外部必要 | P2。後回し |
| 21 | EV/EBITDA | `enterprise value / EBITDA` | 資本構成をならした valuation | Loughran and Wellman (2011) | ○ | TV 直取得 `enterprise_value_ebitda_ttm` | P1。Energy/Materials/Industrials で P/FCF 補完 |
| 22 | PEG | `P/E / EPS growth` | 成長込み valuation | Easton (2004)。予想成長の質に依存 | △ | TV フィールド未確認 | P2。Forward EPS が安定してから |
| 23 | P/S | `market cap / sales` | 赤字/高成長銘柄の valuation proxy | Barbee et al. (1996) | △ | TV 直取得 `price_sales_current` | P2。Software/biotech の補助 |
| 24 | EV/FCF | `enterprise value / free cash flow` | FCF 利回りを debt 込みで見る | Value/FCF 実務、Sloan/Dechow の cash quality と整合 | ○ | EV が取れれば TV 計算、P/FCF は TV 直取得可 | P1。P/FCF より良いが field 安定性要確認 |
| 25 | Forward P/E | `price / forward EPS` | 将来利益ベースの valuation | 実務標準だが analyst estimate 依存 | △ | TV フィールド未確認、外部必要 | P2。日次自動では後回し |
| 26 | SMA200 乖離率 | `close / SMA200 - 1` | トレンドの強さと過熱の両方 | Brock et al. (1992)、trend-following 研究 | ○ | TV 計算 | P1。高すぎる過熱 guard も併用 |
| 27 | ADX | 方向性の強さ | trend strength | Wilder (1978)。実務では有用だが学術根拠は限定 | ○ | TV 直取得 `ADX` | P1。breakout confirmation |
| 28 | MACD | EMA 差分と signal | トレンド変化 | technical rule 実証では単独優位は不安定 | △ | TV 直取得 `MACD.macd`, `MACD.signal` | P2。既存 momentum と重複 |
| 29 | Bollinger breakout | close が BB upper を上抜くなど | volatility expansion | Park and Irwin (2007) の technical rule 概観。個別根拠は弱め | △ | TV 直取得 `BB.upper`, `BB.lower` | P2。entry 条件で限定 |
| 30 | ATR volatility adjustment | `ATR / close`、position sizing、stop 幅 | crash/whipsaw 低減 | Barroso and Santa-Clara (2015)、Daniel and Moskowitz (2016) の momentum crash 対応 | ◎ | TV 直取得 `ATR` | P0。risk overlay として追加 |
| 31 | VWAP deviation | `close / VWAP - 1` | 短期需給、機関投資家平均価格からの乖離 | intraday 実務では使うが日次因子根拠は弱い | △ | TV 直取得 `VWAP` | P2。日次 rank では不要 |
| 32 | Piotroski F-score | 収益性、レバレッジ、効率、希薄化など9項目 | 安い銘柄の財務健全性 | Piotroski (2000) | ○ | 外部/複数項目計算必要 | P2。value basket 用 |
| 33 | Altman Z-score | 財務破綻予測スコア | 倒産リスク回避 | Altman (1968)、Campbell et al. (2008) | ○ | 外部/複数項目計算必要 | P2。distress 除外用 |
| 34 | Accruals | `net income - CFO` を資産で割るなど | 利益の質 | Sloan (1996)、Dechow et al. (1995) | ○ | TV 計算可能性あり | P1。FCF と併用 |
| 35 | Debt/Equity | `total debt / equity` | ROE のレバレッジ歪み、財務安全性 | distress/quality 研究と整合 | ○ | TV 直取得 `debt_to_equity`, `debt_to_equity_fq` | P1。ROE と P/FCF の guard |
| 36 | Interest coverage | `EBIT / interest expense` | 利払い耐性 | distress 回避 | △ | TV フィールド未確認 | P2。D/E と net debt を優先 |
| 37 | Beta | 対市場感応度 | 高 beta 過多、クラッシュ耐性 | Frazzini and Pedersen (2014)、Baker et al. (2011) | ○ | TV 直取得 `beta_1_year` | P1。risk guard、rank 中核ではない |
| 38 | Sector relative strength | sector ETF または sector 平均の市場相対 | 資金流入先の選択 | Moskowitz and Grinblatt (1999)、Fama and French (2012) | ◎ | 現行実装済み | P0。Phase1 中核 |
| 39 | Short interest | short interest / float、days to cover | 悪材料期待、需給 squeeze | Asquith et al. (2005)、Boehmer et al. (2008) | △ | TV 未確認、外部必要 | P2。高 short は除外ではなく警戒 |
| 40 | Institutional ownership change | 13F 保有比率変化 | 機関投資家の累積買い | Gompers and Metrick (2001)、Sias et al. (2006) | △ | 外部必要、13F は遅い | P2。日次には不向き |

## 推奨指標セット

### P0: 次に入れるべき中核

| ブロック | 指標 | 役割 | 実装メモ |
|---|---|---|---|
| 中期モメンタム | `Perf.6M`, `Perf.Y`, 可能なら 12-1 momentum | winner の持続性 | TV 直取得から開始。12-1 は OHLC 履歴が必要 |
| 52週高値 | `close / price_52_week_high`、新高値 flag | 強い銘柄のアンカー突破 | 現行 gate に加えて rank 化 |
| セクター/業種 RS | Phase1 sector momentum | 資金流入先の限定 | 現行維持。1M と RSI の重みは下げる |
| 収益性 | ROIC、gross profit/assets、operating profitability | 強い事業の選別 | TV で ROIC と gross_profit/asset を追加 |
| キャッシュ品質 | FCF margin、cash conversion、accruals | 見せかけ利益を避ける | FCF margin は現行維持、CFO/NI を追加候補 |
| リスク調整 | ATR/close、beta、D/E | momentum crash と leverage を抑える | rank ではなく guard/position sizing |

### P1: 追加推奨上位5件

1. `Perf.6M` と `Perf.Y` を追加し、`Perf.3M` 単独の ranking をやめる。
2. `return_on_invested_capital` と `gross_profit_ttm / total_assets` を追加し、ROE のレバレッジ歪みを薄める。
3. `total_revenue_yoy_growth_ttm/fq`、`earnings_per_share_diluted_yoy_growth_ttm/fq`、`free_cash_flow_yoy_growth_ttm` を追加し、売上だけでなく EPS/FCF 成長も見る。
4. `enterprise_value_ebitda_ttm` と `price_free_cash_flow_ttm` をセクター別 valuation guard として使い、P/FCF の一律 cap を弱める。
5. `ATR`、`beta_1_year`、D/E を risk overlay に追加し、強いが壊れやすい銘柄を下げる。

### 削除または降格推奨

| 指標 | 判断 | 理由 |
|---|---|---|
| RSI 単独の高 weight | 降格 | RSI は短期確認には有用だが、横断 rank の主役は中期モメンタムにする |
| Perf.1M | 降格 | 短期リバーサルを拾いやすい。Phase1 の補助に限定 |
| EPS>0 | 維持だが gate 専用 | EPS 正は最低条件で、強い銘柄の順位付けには粗い |
| P/FCF の一律上限 | 見直し | Tech/semis と Energy/Materials で適正レンジが違う |
| 売上成長率単独 rank | 降格 | glamour 株の過大期待リスクがあり、EPS/FCF/サプライズと束ねるべき |
| MACD / BB / VWAP | 後回し | 価格モメンタムと重複しやすく、日次 screening alpha としては弱い |

## セクター別調整

| セクター | 優先する指標 | 注意点 |
|---|---|---|
| Technology / Software | Gross margin、FCF margin、revenue/EPS growth、Rule of 40 proxy、P/S 補助 | 粗利率は効くが、P/S 単独は危険。FCF と成長の両立を見る |
| Semiconductors | ROIC、FCF margin、revenue acceleration、sector RS、EV/EBITDA | cycle が強い。P/FCF cap は fabless と IDM/foundry で分ける現行方針を維持 |
| Industrials | ROIC/ROCE、asset turnover、operating margin、EV/EBITDA | 粗利率より資産効率と backlog/需要 cycle が重要 |
| Materials / Energy | FCF yield、EV/EBITDA、D/E、commodity trend | 粗利率・売上成長率の横断比較は弱い |
| Consumer Discretionary | Revenue acceleration、gross margin、FCF margin、relative volume | 景気感応度が高く、beta/ATR guard を強める |
| Health Care | profitable health care は FCF/ROIC、biotech は別 universe | 赤字 biotech を同じ quality filter に入れると候補が歪む |
| Financials / Real Estate / Utilities | 今回は本線外 | 現行の Phase2 除外は妥当。別指標セットが必要 |

## 日次スクリーナーの推奨スコア設計

実装するなら、単純な rank-sum を保ちながら次のブロックに分けるのが最小変更で済む。

| ブロック | 推奨 weight | 指標 |
|---|---:|---|
| Price momentum | 35% | `Perf.3M`, `Perf.6M`, `Perf.Y`, 52週高値比率 |
| Sector/industry strength | 20% | Phase1 sector rank、industry momentum |
| Profitability/quality | 25% | ROIC、gross profit/assets、FCF margin、cash conversion |
| Growth confirmation | 10% | revenue/EPS/FCF YoY growth、可能なら SUE/PEAD |
| Risk/value guard | 10% | P/FCF or EV/EBITDA、ATR/close、beta、D/E |

まずは weight を持つ複雑な合成スコアにせず、既存の rank-sum へ P0 指標を足して ablation する。過剰設計を避けるため、初回実装候補は次の5列追加に留める。

- `Perf.6M`
- `Perf.Y`
- `return_on_invested_capital`
- `gross_profit_ttm`
- `total_assets`

その後、`enterprise_value_ebitda_ttm`、`price_free_cash_flow_ttm`、`ATR`、`beta_1_year`、YoY growth 群を足す。

## 日本株への適用

日本株でもモメンタムは存在するが、米国と同じ強さを前提にしない。Fama and French (2012) は国際市場でも momentum と value を確認している一方、Chui, Titman and Wei (2010) は文化圏や市場構造で momentum の強さが違うことを示す。日本株では次を優先する。

- 個別株の raw momentum より、業種/テーマ内 rank を重視する。
- 流動性と時価総額 floor を米国より厳密に扱う。
- ROE は日本企業で有効だが、低 leverage 高 cash 企業では ROIC/FCF を併用する。
- 出来高 confirmation は米国より重要。流動性が薄い銘柄の一時的な高騰を除外する。
- `market_cap_basic` や財務フィールドの coverage 欠損を manifest/report で記録する。

## 補助ソースの扱い

X/Twitter では Alpha Architect、Quantpedia 周辺の momentum / factor investing 投稿を確認した。内容は学術研究を実務家向けに再整理するものが中心で、採用判断は論文と公開 factor data を優先した。

Reddit では Yartseva (2025) とされる multibagger study への言及が複数見つかった。FCF yield、margin expansion、reinvestment を重視する方向性は本レポートの FCF/quality 推奨と矛盾しない。ただし一次論文の所在と査読状態を確認できないため、主要根拠には置かない。

Substack と GitHub は residual momentum、quality momentum、TradingView scanner 実装の探索に使った。実装ヒントにはなるが、根拠としては AQR、Kenneth French、査読論文を優先する。

## 参考文献

- Jegadeesh, N. and Titman, S. (1993) "Returns to Buying Winners and Selling Losers". Journal of Finance. https://www.jstor.org/stable/2328882
- Jegadeesh, N. and Titman, S. (2001) "Profitability of Momentum Strategies". Journal of Finance. https://doi.org/10.1111/0022-1082.00342
- Jegadeesh, N. (1990) "Evidence of Predictable Behavior of Security Returns". Journal of Finance. https://www.jstor.org/stable/2328818
- Lehmann, B. N. (1990) "Fads, Martingales, and Market Efficiency". Quarterly Journal of Economics. https://www.jstor.org/stable/2937819
- Moskowitz, T. J. and Grinblatt, M. (1999) "Do Industries Explain Momentum?" Journal of Finance. https://doi.org/10.1111/0022-1082.00146
- George, T. J. and Hwang, C. Y. (2004) "The 52-Week High and Momentum Investing". Journal of Finance. https://doi.org/10.1111/j.1540-6261.2004.00695.x
- Asness, C. S., Moskowitz, T. J. and Pedersen, L. H. (2013) "Value and Momentum Everywhere". Journal of Finance. https://doi.org/10.1111/jofi.12021
- Blitz, D., Huij, J. and Martens, M. (2011) "Residual Momentum". Journal of Empirical Finance. https://doi.org/10.1016/j.jempfin.2011.01.003
- Moskowitz, T. J., Ooi, Y. H. and Pedersen, L. H. (2012) "Time Series Momentum". Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2011.11.003
- Daniel, K. and Moskowitz, T. J. (2016) "Momentum Crashes". Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2015.12.002
- Barroso, P. and Santa-Clara, P. (2015) "Momentum Has Its Moments". Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2014.11.005
- Lee, C. M. C. and Swaminathan, B. (2000) "Price Momentum and Trading Volume". Journal of Finance. https://doi.org/10.1111/0022-1082.00280
- Gervais, S., Kaniel, R. and Mingelgrin, D. H. (2001) "The High-Volume Return Premium". Journal of Finance. https://doi.org/10.1111/0022-1082.00349
- Novy-Marx, R. (2013) "The Other Side of Value: The Gross Profitability Premium". Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2013.01.003
- Fama, E. F. and French, K. R. (2015) "A Five-Factor Asset Pricing Model". Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2014.10.010
- Kenneth French Data Library. https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html
- Piotroski, J. D. (2000) "Value Investing: The Use of Historical Financial Statement Information to Separate Winners from Losers". Journal of Accounting Research. https://doi.org/10.2307/2672906
- Sloan, R. G. (1996) "Do Stock Prices Fully Reflect Information in Accruals and Cash Flows about Future Earnings?" Accounting Review. https://doi.org/10.2307/2491429
- Dechow, P. M., Sloan, R. G. and Sweeney, A. P. (1995) "Detecting Earnings Management". Accounting Review. https://www.jstor.org/stable/248303
- Ball, R. and Brown, P. (1968) "An Empirical Evaluation of Accounting Income Numbers". Journal of Accounting Research. https://doi.org/10.2307/2490232
- Bernard, V. L. and Thomas, J. K. (1989) "Post-Earnings-Announcement Drift". Journal of Accounting Research. https://doi.org/10.2307/2491062
- Foster, G., Olsen, C. and Shevlin, T. (1984) "Earnings Releases, Anomalies, and the Behavior of Security Returns". Accounting Review. https://www.jstor.org/stable/247060
- Jegadeesh, N. and Livnat, J. (2006) "Revenue Surprises and Stock Returns". Journal of Accounting and Economics. https://doi.org/10.1016/j.jacceco.2005.10.003
- Greenblatt, J. (2006) "The Little Book That Beats the Market". Wiley. https://www.wiley.com/en-us/The+Little+Book+That+Still+Beats+the+Market-p-9780470624159
- Loughran, T. and Wellman, J. W. (2011) "New Evidence on the Relation between the Enterprise Multiple and Average Stock Returns". Journal of Financial and Quantitative Analysis. https://www.cambridge.org/core/journals/journal-of-financial-and-quantitative-analysis/article/new-evidence-on-the-relation-between-the-enterprise-multiple-and-average-stock-returns/5CD22A12A06AFCDC5233E477757FB659
- Easton, P. D. (2004) "PE Ratios, PEG Ratios, and Estimating the Implied Expected Rate of Return on Equity Capital". Accounting Review. https://doi.org/10.2308/accr.2004.79.1.73
- Barbee, W. C., Mukherji, S. and Raines, G. A. (1996) "Do Sales-Price and Debt-Equity Explain Stock Returns Better than Book-Market and Firm Size?" Financial Analysts Journal. https://doi.org/10.2469/faj.v52.n2.1980
- La Porta, R. (1996) "Expectations and the Cross-Section of Stock Returns". Journal of Finance. https://doi.org/10.1111/j.1540-6261.1996.tb05205.x
- Brock, W., Lakonishok, J. and LeBaron, B. (1992) "Simple Technical Trading Rules and the Stochastic Properties of Stock Returns". Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x
- Park, C. H. and Irwin, S. H. (2007) "What Do We Know About the Profitability of Technical Analysis?" Journal of Economic Surveys. https://doi.org/10.1111/j.1467-6419.2007.00519.x
- Wilder, J. W. (1978) "New Concepts in Technical Trading Systems". Trend Research.
- Soliman, M. T. (2008) "The Use of DuPont Analysis by Market Participants". Accounting Review. https://doi.org/10.2308/accr.2008.83.3.823
- Frazzini, A. and Pedersen, L. H. (2014) "Betting Against Beta". Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2013.10.005
- Baker, M., Bradley, B. and Wurgler, J. (2011) "Benchmarks as Limits to Arbitrage". Financial Analysts Journal. https://doi.org/10.2469/faj.v67.n1.4
- Altman, E. I. (1968) "Financial Ratios, Discriminant Analysis and the Prediction of Corporate Bankruptcy". Journal of Finance. https://doi.org/10.1111/j.1540-6261.1968.tb00843.x
- Campbell, J. Y., Hilscher, J. and Szilagyi, J. (2008) "In Search of Distress Risk". Journal of Finance. https://doi.org/10.1111/j.1540-6261.2008.01416.x
- Asquith, P., Pathak, P. A. and Ritter, J. R. (2005) "Short Interest, Institutional Ownership, and Stock Returns". Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2004.08.002
- Boehmer, E., Jones, C. M. and Zhang, X. (2008) "Which Shorts Are Informed?" Journal of Finance. https://doi.org/10.1111/j.1540-6261.2008.01344.x
- Gompers, P. A. and Metrick, A. (2001) "Institutional Investors and Equity Prices". Quarterly Journal of Economics. https://doi.org/10.1162/003355301753265589
- Sias, R. W., Starks, L. T. and Titman, S. (2006) "Changes in Institutional Ownership and Stock Returns". Journal of Business. https://doi.org/10.1086/504874
- Fama, E. F. and French, K. R. (2012) "Size, Value, and Momentum in International Stock Returns". Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2011.10.011
- Chui, A. C. W., Titman, S. and Wei, K. C. J. (2010) "Individualism and Momentum Around the World". Journal of Finance. https://doi.org/10.1111/j.1540-6261.2010.01532.x
- Griffin, J. M., Ji, X. and Martin, J. S. (2003) "Momentum Investing and Business Cycle Risk". Journal of Finance. https://doi.org/10.1111/1540-6261.00578
- AQR Data Library. https://www.aqr.com/Insights/Datasets
- Alpha Architect. https://alphaarchitect.com/
- Quantpedia. https://quantpedia.com/
- Robeco "Residual Momentum". https://www.robeco.com/en-int/insights/2011/02/residual-momentum
- Reddit discussion of Yartseva multibagger study. https://www.reddit.com/r/ValueInvesting/comments/1ro1gmd/the_only_statistical_study_on_multibaggers_find/
