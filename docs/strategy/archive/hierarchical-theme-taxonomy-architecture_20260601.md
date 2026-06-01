# 階層型テーマ taxonomy と 4-phase screener architecture

## 調査日

2026-06-01

## 結論

ユーザーが意図している

1. `Phase1`: 強いセクターを取る
2. `Phase2`: そのセクター配下の中テーマを取る
3. `Phase3`: その中テーマ配下の小テーマを取る
4. `Phase4`: 上位 sector / 中テーマ / 小テーマに属する個別株だけを最終採点する

という構造は、現行実装よりも**戦略意図にかなり近い**。  
特に、「まず market center にいること」を最上流に置く点は、現行の `theme 後付け表示` より一貫している。

一方で、この構造を成立させるには、`中テーマ` / `小テーマ` を単なるラベルではなく、**breadth と persistence を測れる母集団単位**として定義する必要がある。  
つまり、細かく切ればよいのではなく、

- `中テーマ`: その時点で複数の leader / satellite が存在しうる事業クラスター
- `小テーマ`: 中テーマの中でさらに product / business model / demand pocket で切った narrower cluster

として持つのがよい。

結論だけ先に言うと、最初の設計原則は次の 4 つである。

1. `sector` は provider 依存の broad 軸として残す  
2. `中テーマ` は **business chain / demand pocket** で切る  
3. `小テーマ` は **product / architecture / business model** で切る  
4. `小テーマ` が薄すぎるときは無理に独立ランキングせず、`中テーマ` に吸収する  

## 1. なぜ現行とズレるのか

現行の daily screener は、実装上は

1. TradingView の `sector` で市場全体を集計し、強いセクターを選ぶ
2. その selected sector に対して、銘柄を scanner 条件で取る
3. 通過銘柄へ repo custom theme を後付けする
4. theme ranking を表示する

という順番で動いている。

このため、現行の `Phase2 テーマランキング` は、

- テーマで候補抽出しているのではなく
- 通過銘柄を後からテーマ別に見せているだけ

である。

ユーザー意図はそうではなく、

- まず強セクターにいること
- そのセクターの中で、どの中テーマに資金が集中しているか
- さらにその中で、どの小テーマが最も尖っているか
- その hierarchy を全て通過した個別株だけを最後に採点すること

である。

これは発想として、`sector breadth -> theme breadth -> subtheme breadth -> stock quality` の順番であり、  
今の `sector breadth -> stock filter -> theme relabel` とは設計思想が異なる。

## 2. 外部分類体系から何を借りるべきか

### 2.1 GICS / ICB から借りるべきもの

GICS は 2024 年 8 月版 methodology で、`11 sectors / 25 industry groups / 74 industries / 163 sub-industries` の 4 層構造を持つ。  
ICB も official overview で `11 industries / 20 supersectors / 45 sectors / 173 subsectors` の 4 層構造を持つ。

この 2 つから借りるべきなのは、**厳密なラベル名そのもの**よりも次の考え方である。

1. broad な上位分類は provider / index 業界標準に寄せる  
2. 下位分類は revenue source や business nature に基づいて切る  
3. 1 社 1 ラベルだけでは足りない場合でも、正本となる primary classification は安定させる  

つまり、この repo でも

- `sector` は TradingView / provider の broad classification を使う
- `中テーマ` / `小テーマ` は repo 側で business nature ベースに持つ

という二層構造が自然である。

### 2.2 GICS / ICB をそのまま使わない理由

GICS / ICB は優秀だが、ユーザーが見たい粒度

- HBM
- NAND
- optical transceivers
- coherent optics
- power cooling
- nuclear merchant power

のような **市場で資金が回る実戦的テーマ粒度** までは、そのまま出してくれない。

たとえば `Semiconductors` や `Communications Equipment` は broad すぎる。  
投資判断上ほしいのは、その中で

- memory cycle にいるのか
- AI accelerator にいるのか
- wafer fab equipment にいるのか
- coherent optics にいるのか

という切り方である。

したがって、標準分類は **上位整流板** として使い、  
alpha を取りにいく粒度は repo custom taxonomy で持つのがよい。

## 3. TradingView / moomoo / repo custom の役割分担

## 3.1 TradingView

TradingView Stock Screener の公式ヘルプでは、stock screener は多数の metric を filter / table column に使え、`sector context` の比較にも使えるとされている。  
この repo でも、実際に `sector` / `industry` / momentum / valuation / profitability 指標をまとめて取れている。

したがって TradingView の役割は次のままでよい。

1. broad universe の取得
2. sector / industry ベースの大枠整流
3. 個別株の technical / fundamental の cross-sectional score 計算

つまり、**Phase1 と Phase4 の主エンジン** は引き続き TradingView が向いている。

## 3.2 moomoo

moomoo OpenAPI 公式 docs では、

- `get_plate_list(market, plate_class)`
- `get_plate_stock(plate_code, ...)`
- `get_stock_filter(market, filter_list, plate_code=None, ...)`

が使える。  
また `PlateSetType` には `INDUSTRY` / `REGION` / `CONCEPT` があるが、公式 docs 上でも **US と HK の regional plate は一時的に空** とされている。

このため moomoo は、

1. `industry plate` / `concept plate` が使えるところでは theme candidate の補完
2. plate constituent から breadth を計算する補助
3. TradingView 候補を別 provider で再確認する validation

には強い。

ただし US 市場では、ほしいテーマ粒度を全部 official plate だけで安定取得できる保証は薄い。  
ゆえに moomoo の役割は **taxonomy の正本** ではなく、**breadth / validation の補完データ源** と考えるのがよい。

## 3.3 repo custom taxonomy

最終的な正本は repo custom taxonomy に置くべきである。  
理由は、ユーザーが見たいテーマ粒度が

- provider の sector より細かく
- provider の concept plate より一貫性が必要で
- 時々の buzzword に流されず
- breadth 計算に使える stable tree である

必要があるからである。

言い換えると、

- `sector`: provider
- `middle theme`: repo custom primary tree
- `small theme`: repo custom product/business tree
- `plate`: optional validation / breadth helper

が最も噛み合う。

## 4. 中テーマ / 小テーマをどう切るべきか

## 4.1 設計原則

### 中テーマ

中テーマは、**ひとつの需要波や投資ストーリーとして読める単位**にする。  
条件は次の 4 つ。

1. 同じ `sector` の中に主な母集団が存在する
2. 3-15 銘柄程度の breadth 候補がありうる
3. 1 銘柄だけのヒーロー物語で終わらない
4. 3M / 6M / 1Y persistence を持ちうる

例:

- Memory
- Optical Connectivity
- Semiconductor Equipment
- Grid Equipment
- Cybersecurity
- Cloud Software
- Satellite Communications

### 小テーマ

小テーマは、**中テーマの内部で product / architecture / business model の差が意味を持つ単位**にする。  
条件は次の 4 つ。

1. 中テーマの中で business exposure が明確に違う
2. 2-8 銘柄程度のクラスターとして存在しうる
3. 代表銘柄が固定しやすい
4. 小テーマ単位の強弱を見ても、売買判断に意味がある

例:

- `Memory` の下に `HBM/DRAM`, `NAND/Storage`, `Memory Controllers`
- `Optical Connectivity` の下に `Optical Transceivers`, `Coherent/Fiber`, `Laser/Photonics`
- `Power & Grid` の下に `Independent Power`, `Grid Equipment`, `Power Cooling`

### 切ってはいけない小テーマ

次のようなものは、最初から小テーマにしない方がよい。

1. 銘柄数が実質 1-2 しかないもの
2. その日だけ話題の buzzword
3. business overlap が強すぎて隣テーマと区別不能なもの
4. breadth を測る前に symbol allowlist 固定になってしまうもの

この場合は `watch-tag` として持つのはありだが、ranking 単位にはしない。

## 4.2 どの軸で分類するか

分類軸は優先順で次の通りにするのがよい。

1. `sector`
2. `industry`
3. `business model`
4. `product keywords`
5. `symbol allowlist`

つまり、まず broad provider 軸でぶらさず、その上で

- semiconductors の中でも memory なのか
- communications の中でも satellite なのか
- utilities の中でも nuclear merchant power なのか

を事業実態ベースで切る。

symbol allowlist は最後の補助であり、最初から allowlist 主体にすると taxonomy が brittle になりやすい。

## 5. 初期 taxonomy 試案

以下は v1 として始めやすい粒度案である。  
重要なのは、**まず強くなりやすいセクターから作る**ことであり、全市場全セクターを一気に完成させる必要はない。

## 5.1 Electronic Technology

このセクターは現行でも market center になりやすく、最重要である。

### 中テーマ候補

1. `AI Compute`
2. `Memory`
3. `Semiconductor Equipment`
4. `Optical / Photonics`
5. `Connectivity Silicon`
6. `Defense Electronics`

### 小テーマ候補

`AI Compute`

- AI Accelerators
- AI Servers
- Interconnect / Retimers

`Memory`

- HBM / DRAM
- NAND / Storage
- Memory Controllers / Interfaces

`Semiconductor Equipment`

- Wafer Fab Equipment
- Test / Metrology
- Packaging / Advanced Assembly

`Optical / Photonics`

- Optical Transceivers
- Coherent Optics
- Laser / Photonics

### この切り方がよい理由

- `Semiconductors` だけでは broad すぎる
- しかし `HBM` だけだと狭すぎる
- なので `Memory` を中テーマにして、その下に `HBM/DRAM` や `NAND/Storage` を置くと breadth と尖りの両方を見やすい

## 5.2 Technology Services

### 中テーマ候補

1. `Cloud Software`
2. `Cybersecurity`
3. `Data / Observability`
4. `AI Software`
5. `Enterprise Workflow`

### 小テーマ候補

`Cloud Software`

- Application Software
- Infrastructure Software
- Data Platforms

`Cybersecurity`

- Network Security
- Endpoint / Identity
- Security Operations

`AI Software`

- Model / Data Platforms
- AI Developer Tools
- Inference / Workflow Software

### 注意点

Technology Services は product keyword の揺れが大きい。  
したがって v1 では、company keyword だけでなく `industry + curated symbol set` の重みを強める方が安全である。

## 5.3 Communications

### 中テーマ候補

1. `Network Infrastructure`
2. `Satellite / Space Communications`
3. `Wireless Infrastructure`
4. `Broadband Access`

### 小テーマ候補

`Network Infrastructure`

- Ethernet Switching
- Carrier / Optical Networking
- Datacenter Interconnect

`Satellite / Space Communications`

- Direct-to-Cell
- Satellite Services
- Ground / Communications Systems

### 注意点

宇宙は cross-sector に広がる。  
ただし v1 では、まず Communications 配下の `Satellite / Space Communications` として anchored に持ち、  
後で `cross-sector meta-theme` を別レイヤーとして足す方が安全である。

## 5.4 Producer Manufacturing / Industrial Services

### 中テーマ候補

1. `Power Infrastructure`
2. `Electrical Equipment`
3. `Factory Automation`
4. `Aerospace & Defense`
5. `Thermal / Cooling`

### 小テーマ候補

`Power Infrastructure`

- Grid Equipment
- Transformers / Distribution
- EPC / Grid Buildout

`Factory Automation`

- Motion Control
- Industrial Software / Controls
- Robotics / Sensing

`Aerospace & Defense`

- Defense Platforms
- Drones / Autonomy
- Mission Sensors / Secure Comms

### この切り方がよい理由

電力テーマは Utilities だけでは足りず、設備側の winners はむしろ Producer Manufacturing / Industrial Services に多い。  
したがって `Power Infrastructure` はこのセクターにも持つべきである。

## 5.5 Utilities

### 中テーマ候補

1. `Baseload / Nuclear`
2. `Merchant Power`
3. `Regulated Utilities`
4. `Renewables / Transition`

### 小テーマ候補

`Baseload / Nuclear`

- Nuclear Operators
- Fuel / Services

`Merchant Power`

- Independent Power Producers
- Peak Power / Flexible Generation

### 注意点

Utilities の中では、同じ電力でも「規制公益」と「merchant power」は読み筋がかなり違う。  
ここを切らずに一括にすると、AI 電力需要の本命とディフェンシブ公益が混ざってしまう。

## 6. 4-phase architecture の詳細案

## Phase1: Sector Strength Ranking

目的は、**いま市場の中心にいる broad sector を選ぶこと**である。

### 入力

- TradingView broad universe
- sector ごとの constituent

### 指標

- average 3M / 6M / 1Y
- SPY relative strength
- % above SMA50
- % above SMA200
- % near 52w high
- leader concentration penalty

### 重要ポイント

Phase1 は「どの sector にいるべきか」を決める層なので、  
個別株の quality score をここに混ぜすぎない方がよい。

## Phase2: Middle Theme Ranking Within Selected Sectors

目的は、selected sector の中で、**どの demand pocket に資金が集中しているか**を取ること。

### 入力

- Phase1 上位 sector
- repo custom middle theme mapping
- 必要に応じて moomoo plate breadth

### 指標

- middle theme constituent count
- average 3M / 6M
- % near 52w high
- positive breadth ratio
- top 3 leaders concentration
- persistence score

### 重要ポイント

Phase2 の ranking は、1 銘柄の平均点ではなく、

- その theme に強い銘柄が何銘柄いるか
- その強さが継続しているか
- 1 銘柄だけに依存していないか

を見るべきである。

## Phase3: Small Theme Ranking Within Selected Middle Themes

目的は、middle theme の中で、**いま最も尖っている product / architecture pocket** を取ること。

### 入力

- Phase2 上位 middle themes
- repo custom small theme mapping

### 指標

- small theme breadth
- leader quality density
- top-decile stock count
- short-term acceleration

### 重要ポイント

Phase3 は尖りを取りに行く層だが、  
あまりに narrow だと 1 銘柄テーマ化する。

したがって、

- constituent < 3
- breadth 指標が不安定
- 実質 1 leader のみ

なら、独立 ranking せず中テーマへ吸収する fallback が必要である。

## Phase4: Final Stock Scoring

目的は、上位 hierarchy に属する個別株だけを、最後に technical / fundamental で採点すること。

### 必須条件

1. Phase1 上位 sector 所属
2. Phase2 上位 middle theme 所属
3. Phase3 上位 small theme 所属

この 3 条件を先に満たしたものだけを scoring 対象にする。

### Stock scoring の例

- technical:
  - 12M / 6M / 3M momentum
  - 52w high proximity
  - RSI
  - relative volume
  - ATR%
- fundamental:
  - ROIC
  - gross profit / assets
  - FCF margin
  - revenue growth
  - EPS growth
  - valuation guard

### 重要ポイント

この Phase4 ではじめて individual quality を強く見る。  
上流で hierarchy を通しているため、いきなり market-wide score を作るより、

- market center にいる
- hot theme にいる
- sharp subtheme にいる
- その上で leader quality が高い

という順番で candidate quality が上がる。

## 7. ranking をどう作るべきか

中テーマ / 小テーマ ranking は、単純平均だけでは不十分である。  
少なくとも次の 5 要素を分けて持つべきである。

1. `breadth`
   - 上昇銘柄比率
   - 52w 高値圏比率
   - SMA50 / SMA200 上比率
2. `persistence`
   - 3M / 6M / 1Y 継続強度
3. `leadership density`
   - 上位スコア銘柄が何銘柄いるか
4. `concentration risk`
   - 1 ヒーロー依存度
5. `freshness`
   - 5D / 10D / 1M 再加速

おすすめは、`強い銘柄が何銘柄いるか` を明示的に入れることである。  
ユーザーの意図がそこにあるからである。

## 8. v1 でやるべきこと / やらないこと

## v1 でやるべきこと

1. `sector -> middle theme -> small theme` の strict tree を作る
2. 強くなりやすい主要 sector から始める
3. `Memory`, `Optical`, `Grid`, `Cybersecurity` のような明確な需要ポケットから定義する
4. breadth 指標を hierarchy ごとに計算する
5. narrow すぎる小テーマは吸収する fallback を持つ

## v1 でやらない方がよいこと

1. 全セクター完全対応
2. cross-sector meta-theme の本格導入
3. すべての buzzword を taxonomy に入れること
4. 1 銘柄しかない micro-theme の ranking 化

まずは **強い sector の内部を深く切る** ことに集中した方がよい。

## 9. 実装へ落とすなら次の順番

1. `taxonomy schema` を `sector -> middle theme -> small theme` の 3 層へ拡張する
2. `middle theme` ranking 集計関数を追加する
3. `small theme` ranking 集計関数を追加する
4. Phase4 stock screener を `selected hierarchy only` に変える
5. レポートを `Phase1 -> Phase2 -> Phase3 -> Phase4` へ組み替える

## 10. 現時点の推奨

最初に詰めるべきは、コードではなく taxonomy である。  
特に次の順がよい。

1. `Electronic Technology`
2. `Communications`
3. `Producer Manufacturing / Industrial Services`
4. `Utilities`
5. `Technology Services`

この順で

- 中テーマを何個持つか
- 小テーマをどこまで分けるか
- どのテーマはまだ narrow すぎるから中テーマ止まりにするか

を決めると、かなり実戦的な tree になる。

## Sources

- GICS Methodology (MSCI / S&P, August 2024)
- Industry Classification Benchmark official overview (LSEG / FTSE Russell)
- TradingView Stock Screener help center
- moomoo OpenAPI docs: `get_plate_list`, `get_plate_stock`, `get_stock_filter`, `PlateSetType`
- repo local docs:
  - `docs/strategy/theme-sector-taxonomy-and-moomoo-screening-research_20260531.md`
  - `docs/strategy/moomoo_integration_analysis.md`
  - `docs/strategy/theme-momentum-definition.md`
