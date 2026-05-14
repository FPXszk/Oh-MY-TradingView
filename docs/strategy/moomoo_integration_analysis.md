# moomoo OpenAPI × Oh-MY-TradingView 統合分析

## 調査日
2026-05-14

## エグゼクティブサマリー
moomoo OpenAPI は、Oh-MY-TradingView における「下流の市場データ取得」と「paper order 実行」の統合先としてはかなり有望で、Quote API と `SIMULATE` 取引はすでに実査済みである。特に `request_history_kline()`、`get_stock_filter()`、`get_plate_list()` / `get_plate_stock()`、`place_order(..., trd_env=SIMULATE)` は、現行ワークフローへ直接つなげやすい。
一方で、現状の 3 層スクリーニングを moomoo だけで完全代替するのは難しい。理由は、このリポジトリが重視している theme persistence、breadth、RSP/RSI レジーム確認、tight setup の最終判断までを moomoo 単体でそのまま再現できるとは確認できていないためである。
結論としては、moomoo は TradingView の置き換え先ではなく、まずは「テーマ候補の補完データ源」「履歴データの照合先」「TradingView webhook の paper execution backend」として導入するのが最も自然である。
優先度の高い実装は、read-only MCP ツール群、シグナル確認用のデータ補完、TradingView alert からの `SIMULATE` 発注導線である。本番発注は対象外とし、未確認の push 安定性・権限差・レート制限は段階的に追加検証する前提が必要である。

## 1. スクリーニングワークフローへの活用

### 1.1 現状ワークフローとの対応マッピング

現状の Oh-MY-TradingView は、`docs/strategy/theme-momentum-definition.md` にある通り、`theme persistence -> breadth -> market alignment -> leader stock の low-risk entry` という順番で候補を絞る。ここに moomoo を当てはめると、完全な 1 対 1 置換ではなく、層ごとに役割が異なる。

| 現状の層 | 現在の役割 | moomoo で対応できること | 評価 |
| --- | --- | --- | --- |
| テーマ外部スクリーニング | テーマの継続性、熱量、breadth の一次把握 | `get_plate_list()` / `get_plate_stock()` による業種・概念・構成銘柄の取得 | 補完向き |
| TradingView スクリーナー | 条件検索、財務・価格モメンタム絞り込み | `get_stock_filter()`、一部 `FinancialFilter` / `CustomIndicatorFilter` | 一部代替可能 |
| Pine Script 確認 | Donchian breakout、RSI、RSP、tight setup 確認 | `request_history_kline()` で OHLC を取り、自前計算で近似可能 | 補完向き |

この対応から分かるのは、moomoo が最も強いのは「個別銘柄条件検索」と「対象銘柄の履歴・リアルタイム確認」であり、テーマ投資の上流で必要な persistence 判断や repo 独自 proxy の最終判定そのものではない、という点である。

### 1.2 代替・補完できる部分

`get_stock_filter()` は、価格、時価総額、PER だけでなく `FinancialFilter` や `CustomIndicatorFilter` を組み立てられるため、現行 TradingView スクリーナーのうち「機械的な一次条件絞り込み」はかなり近い形で置き換えられる可能性がある。実査でも US 市場で条件ヒット `all_count=9429`、返却 `20` 件を確認しており、ページング前提のスクリーニング API としては十分実用的である。ただし、現行戦略研究で重視している `Perf.6M`、`Perf.Y`、52 週高値接近度、ROIC、gross profit/assets、FCF margin などの全指標がそのまま取れるかは、この調査範囲では未確認である。よって、TradingView スキャナの完全代替候補というより、基礎条件の高速スキャンを担当させるのが現実的である。

`get_plate_list()` / `get_plate_stock()` は、テーマ・セクターの一次スクリーニング補助として有用である。現行ワークフローでは、leader 一本ではなく breadth を重視しているため、plate 構成銘柄を起点に「そのテーマ内で何銘柄が高値圏か」「短期で何銘柄がプラスか」を別処理で集計すれば、テーマ breadth を測るパイプラインを組める。これは外部テーマサイトの完全代替ではなく、moomoo 内で業種・概念・構成銘柄を掴み、下流で breadth 指標を自前計算する補完用途として価値がある。

`get_capital_flow()` / `get_capital_distribution()` は、リーダー株選別の強化要素として意味がある。現在の repo はテーマ persistence と leader stock の質を重視しており、資金フローはその間を埋める「今どこに資金が集中しているか」の確認に使える。特に、テーマ内で複数候補が残ったときに、資金流入が明確な銘柄を優先する、または breakout 直前にフローが悪化した銘柄を見送る、といった実務的フィルタへ発展させやすい。

リアルタイム取得・更新パイプラインについては、完全に不可能ではない。`subscribe()` は K 線 push の購読自体は成功し、板・ticker・rt_data 系は購読前提で取得成功しているため、`price_monitor.py` のようなポーリング型、または相場時間中の push 監視型で更新系パイプラインを構築できる余地がある。ただし、K 線 push は今回 30 秒窓で `push_count=0` だったため、まずは `get_market_snapshot()` ベースの定期ポーリングを第一候補とし、push 依存設計は追加実査後に限定すべきである。

### 1.3 制約・注意事項

最大の制約は、moomoo が現行ワークフローの全判断軸をそのまま持っているわけではない点である。`theme-momentum-definition.md` にある persistence、breadth、market alignment、tight setup の思想を再現するには、moomoo API だけで完結させるより、取得した plate 構成銘柄や K 線データを使って repo 側で追加計算する必要がある。

また、`get_stock_filter()` の実用性は高いが、利用可能な列・市場差・権限差の実態までは今回の文書で限定的である。README でも `market / entitlement 依存` とされており、`get_capital_flow()` / `get_capital_distribution()` も LV2 可能性が示されている。したがって、スクリーニング基盤を全面的に移す前に、「US 市場で必要な列が埋まるか」「JP を含めた対象市場で同等に動くか」「権限不足時の戻り方はどうか」を確認する必要がある。

## 2. バックテスト戦略との連携

### 2.1 ヒストリカルデータ取得の実態

`request_history_kline()` は、少なくとも `K_DAY`、`K_WEEK`、`K_1M` を取得できることが `quote_sample_02.py` と `01_quote_api.md` で確認されている。返り値も `ret, dataframe, page_req_key` の 3 要素で、ページング前提の長期間取得 API と理解できる。このため、Donchian 60/20 戦略に必要な日足系列を取り、同一銘柄・同一期間で Pine Script のバックテスト入力と比較する基盤は作れる。

ただし、今回確認できたのは「取得できる」ことまでであり、どこまで長い期間を一括またはページングで安定取得できるか、split/dividend 調整の扱い、extended time の影響、TradingView 側データとの誤差幅までは未検証である。したがって、moomoo データを Pine と完全同一視するのではなく、まずは benchmark comparison 用の二次データ源として扱うのが安全である。

repo の主力戦略は `current-strategy-reference.md` から、US では `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-...` 系が軸である。この戦略を moomoo 側へ接続する場合、価格系列そのものは `request_history_kline()` で比較可能だが、RSP フィルタと RSI14 レジーム判定は repo 側で別途計算する必要がある。特に RSP は benchmark 系列を別銘柄で取得して 200SMA 判定を計算しなければならないため、moomoo は「素材データ供給者」であって、最終シグナルエンジンそのものではない。

### 2.2 シグナル→ペーパー発注フローの設計案

この連携は実現可能性が高い。理由は、`03_mcp_integration.md` と `tv_webhook_server.py` にすでに設計の雛形があり、`TradingView alert webhook -> shared secret 検証 -> symbol 正規化 -> place_order(..., trd_env=SIMULATE)` の流れが具体化されているためである。さらに `trade_sample_04.py` では `US.AAPL` の 1 株成行買いが `SIMULATE` で成功し、`trade_sample_06.py` ではキャンセルも確認済みである。

実際の設計としては、Pine Script が breakout 条件成立時に webhook を発火し、受信サーバーが payload を `symbol / side / qty / order_type / note` に正規化、サーバー内で market prefix を付与し、moomoo 側へ paper order を送る形が最短である。その後に `order_list_query()` を呼んで注文状態を記録し、`deal_list_query()` が paper 非対応である分は、注文状態とポジション増減を監査ログとして残すのが妥当である。

また、MCP 側では `moomoo_snapshot`、`moomoo_positions`、`moomoo_balance`、`moomoo_paper_buy`、`moomoo_cancel_order` を揃えることで、TradingView からの自動発注だけでなく、「アラートが出たので、いまの板・残高・既存ポジションを見てから paper order」を同じ会話面で回せる。これは Oh-MY-TradingView の運用体験をかなり改善する。

### 2.3 制約・注意事項

最も明確な制約は、paper trading で `deal_list_query()` が使えず、`Paper trading does not support deal data.` になることである。つまり、約定履歴ベースの厳密な execution audit はそのままでは取れない。paper 運用では、`place_order` 応答、`order_list_query`、`position_list_query`、`accinfo_query` を組み合わせて監査する必要がある。

次に、データ取得コストや頻度制限は、今回の一次資料では定量化されていない。`subscribe()`、`get_rt_data()`、`get_order_book()` が使えること、`get_market_snapshot()` のポーリング monitor が成立することまでは確認済みだが、何銘柄をどの頻度で回せるか、rate limit に当たった場合の戻り方までは未確認である。このため、初期実装は watchlist 数を絞り、`snapshot polling + bounded webhook execution` に留めるべきである。

さらに、OpenD は Windows 側 `127.0.0.1:11111` bind で、WSL からは `172.31.144.1:11112` の portproxy が前提である。よって、統合設計では接続先を固定値埋め込みせず、Python adapter 側に host/port 設定を集約する必要がある。これを外すと、Node wrapper や webhook server を追加しても環境差異で壊れやすい。

## 3. 新機能提案

### 3.1 優先度高

| 機能 | 概要 | 期待効果 | 実装難易度 |
| --- | --- | --- | --- |
| MCP read-only moomoo bridge | `moomoo_health_check`、`moomoo_snapshot`、`moomoo_kline_history`、`moomoo_stock_filter` を追加 | TradingView 以外の確認系データ源を同一 UI で扱える | 中 |
| TradingView webhook -> moomoo paper order | `tv_webhook_server.py` をベースに `SIMULATE` 固定発注 | Pine シグナルの paper execution を最短距離で実現 | 中 |
| Screening補完パイプライン | `get_stock_filter()` と `get_plate_*()` を使って候補群を自動取得し、repo 側 proxy で再採点 | 3 層スクリーニングの上流を半自動化 | 中 |

最優先は read-only bridge である。これは既存の `03_mcp_integration.md` でも優先度高とされ、実査済み API だけで構成できるため、最も低リスクで価値が出る。ユーザーは OpenD 疎通、複数銘柄スナップショット、履歴 K 線、スクリーニング候補取得を MCP ツールとして会話から直接呼べるようになる。

次点は webhook 連携による paper order 自動化である。これは本プロジェクトの stated goal そのものであり、`place_order(..., trd_env=SIMULATE)` 成功、`modify_order(CANCEL)` 成功、FastAPI sample あり、という条件が揃っている。実装上の本質は注文ロジックそのものより、secret 検証、idempotency、ログ、取消導線の整備である。

### 3.2 優先度中

| 機能 | 概要 | 期待効果 | 実装難易度 |
| --- | --- | --- | --- |
| ポートフォリオ可視化 | `positions`、`balance`、`order_list` をまとめて表示 | paper 運用の追跡が簡単になる | 低 |
| リーダー株資金フロー確認 | `get_capital_flow()` / `get_capital_distribution()` を leader 選別へ追加 | breakout 候補の質確認が強化される | 中 |
| モニタリング通知 | `price_monitor.py` 発展版で breakout 価格到達を通知 | TradingView 以外の再確認経路を持てる | 低 |

ポートフォリオ管理系は実装難易度が低い割に運用価値が高い。paper 運用では「何を持っていて、どの注文が未約定か」をすぐ見られることが重要で、`position_list_query()` と `accinfo_query()` はすでに成功しているため、MCP ツール化や小さな集約ビューを作るだけで十分役立つ。

資金フロー連携は差別化要素になりうるが、現時点では「使える」ことまでしか分かっていないため優先度中とする。実際に leader 選別へ効くかは、AAPL など既存候補銘柄でフロー指標と breakout 成否の相関を見てから判断したい。

### 3.3 優先度低・将来検討

| 機能 | 概要 | 期待効果 | 実装難易度 |
| --- | --- | --- | --- |
| push ベースのリアルタイム監視 | `subscribe()` + callback で即時シグナル反応 | polling より低遅延 | 高 |
| 履歴データ比較レポート | TradingView と moomoo の OHLC 差分を定期比較 | バックテスト信頼性評価に有効 | 中 |
| 完全独立 moomoo screening mode | TradingView を介さず候補抽出から paper まで完結 | 運用自由度は高い | 高 |

push ベース監視は魅力的だが、今回の実査では 30 秒窓で K 線 push が観測できていない。まずは snapshot polling で十分であり、push 化は相場時間中の安定性が検証できてからでよい。

完全独立スクリーニングモードは、将来的には面白いが、現行 repo の思想である theme persistence と breadth を再現する追加計算が必要で、TradingView 置換のコストが高い。今は「補完して強くする」方が成果に直結する。

## 4. 実装ロードマップ案

### Phase 1: Read-only 統合

- Python sidecar か独立 Python MCP server で OpenD 接続を共通化する
- `moomoo_health_check`、`moomoo_snapshot`、`moomoo_kline_history`、`moomoo_stock_filter` を追加する
- `get_plate_list()` / `get_plate_stock()` を使ったテーマ候補取得を read-only で整える
- ここでの完了基準は「会話または CLI から moomoo データ参照が安定すること」

### Phase 2: Screening / Validation 強化

- `get_stock_filter()` の利用可能列を洗い出し、現行スクリーナー指標と対応表を作る
- plate 構成銘柄から breadth 指標を repo 側で計算する
- `request_history_kline()` で Pine バックテスト対象銘柄の OHLC を比較し、ズレの傾向を確認する
- ここでの完了基準は「TradingView 候補を moomoo データで再確認できること」

### Phase 3: Paper Trading 導線

- `tv_webhook_server.py` をベースに shared secret、入力バリデーション、監査ログを加える
- `moomoo_paper_buy`、`moomoo_cancel_order`、`moomoo_order_list`、`moomoo_positions` を MCP 側へ公開する
- TradingView alert から `SIMULATE` 発注し、状態確認まで一連で追えるようにする
- ここでの完了基準は「alert -> paper order -> status verification」が再現できること

### Phase 4: 運用ハードニング

- idempotency key、retry policy、OpenD reconnect、portproxy 障害時の診断を追加する
- polling 頻度や watchlist 数を調整し、実運用で破綻しないレートに落とす
- `deal_list_query()` 非対応を補う監査ビューを整える
- ここでの完了基準は「paper 運用を継続しても監査と復旧がしやすいこと」

## 5. 未解決の調査事項・残課題

- `get_stock_filter()` で現行スクリーナーが重視する全指標をどこまで再現できるか未確認
- `request_history_kline()` の長期間ページング、adjustment 差、extended time 差分の検証が未了
- `subscribe()` の K 線 push が相場時間中に安定して届くか未確認
- `get_capital_flow()` / `get_capital_distribution()` の権限差、対象市場差、実運用での有効性が未確認
- paper trading で `deal_list_query()` が使えないため、約定監査の代替設計が必要
- レート制限、同時監視可能銘柄数、snapshot polling の安全頻度が未測定
- OpenD が Windows loopback bind 前提のため、WSL/Windows 間 portproxy を前提にした障害対策が必要
