# テーマ粒度セクター再設計と moomoo screening 置換可能性調査

## 調査日

2026-05-31

## 結論

現行の `daily-ranking` は TradingView の粗い `sector` 分類をそのまま Phase1 に使っているため、ユーザーが見たい

- メモリ関連
- 宇宙関連
- 光通信 / 光半導体
- 電力
- MLCC / コンデンサ

の粒度は表現できない。

最適方針は、**TradingView を broad screener として残しつつ、repo 側に「テーマ分類レイヤー」を新設し、moomoo はテーマ breadth / plate 補完に使う** ことである。  
**moomoo 単独への全面置換は現時点では非推奨**。理由は、US 市場では `stock_filter` が `industry plate` までは使えても、ユーザーが欲しい粒度の多くは単一 API フィールドでは切れず、repo 側の再分類が依然必要だからである。

## 1. 現行実装の整理

### 1.1 いまのセクターランキングの実体

現行 Phase1 は `TradingView Scanner API` から `sector` 列を取り、銘柄を `row.sector` ごとに集計して rank-sum している。

- 入力列: `sector`, `Perf.1M`, `Perf.3M`, `Perf.6M`, `Perf.Y`, `RSI`, `relative_volume_10d_calc` など
- 集計軸: `sector`
- 評価指標: 平均 12M / 6M / 3M、SPY 比、SMA50 上比率、SMA200 上比率、52w 高値近辺比率

このため、Phase1 ラベルは `Technology Services`, `Electronic Technology`, `Communications`, `Producer Manufacturing` のような大分類になる。

### 1.2 現行 Phase2 も大分類依存

`src/core/sector-screening-profiles.js` でも、US の profile は

- `Technology Services`
- `Electronic Technology`
- `Communications`
- `Producer Manufacturing`
- `Utilities`

など TradingView `sector` 前提で組まれている。  
例外として、半導体だけは `Electronic Technology` の中を `industry ~ /Semiconductors/` と symbol ルールで切り出している。

これは重要で、**repo にはすでに「大分類 + repo 独自の細分類」を重ねる前例がある**。  
したがって、今回ほしいテーマ粒度も同じ方向で拡張するのが自然である。

## 2. ユーザー希望テーマごとの最適な切り方

### 2.1 結論表

| テーマ | TradingView sector だけで十分か | moomoo plate だけで十分か | 最適な切り方 |
| --- | --- | --- | --- |
| メモリ関連 | 不十分 | 不十分 | `industry + symbol rule + keyword rule` |
| 宇宙関連 | 不十分 | 不十分 | `curated theme map + moomoo plate 補完` |
| 光通信 / 光半導体 | 不十分 | 不十分 | `industry + product keyword + symbol rule` |
| 電力 | 一部可能 | 一部可能 | `sector/industry を 2-3 群に分解` |
| MLCC / コンデンサ | 不十分 | 不十分 | `symbol allowlist + business keyword` |

### 2.2 メモリ関連

これは `Electronic Technology` や `Semiconductors` では広すぎる。  
GPU、アナログ、通信 IC、EDA まで混ざるため、**DRAM / NAND / controller / memory subsystem** の粒度で切る必要がある。

最適案:

- ベース母集団: `sector = Electronic Technology`
- 第一条件: `industry` が `Semiconductors` 周辺
- 第二条件: symbol allowlist または description / revenue breakdown keyword
- 例: `dram|nand|memory|hbm|ssd|controller`

実装上は、既存の `semiconductor-business-models.js` を拡張して、`semiconductor-subthemes.js` のようなレイヤーを足すのが筋が良い。

### 2.3 宇宙関連

宇宙は GICS / TradingView sector に素直に乗らず、

- satellite
- launch
- space communications
- defense-space crossover

に分散しやすい。  
moomoo が US 向けにそのまま「space concept plate」を安定提供してくれる保証も今回確認できていない。

最適案:

- `Communications`, `Electronic Technology`, `Producer Manufacturing`, `Industrial Services` を母集団にする
- curated symbol list を主軸にする
- moomoo に plate がある場合だけ breadth 補完に使う

つまり、**宇宙は provider の sector に寄せるより repo の theme master を持つ方が安全**。

### 2.4 光通信 / 光半導体

これは

- optical networking
- optical components
- laser / photonics
- datacenter interconnect

が混ざるため、`Technology Services` でも `Electronic Technology` でも粗い。

最適案:

- 母集団: `Electronic Technology` + 一部 `Communications`
- `industry` 条件
- keyword 条件: `optical|photonics|laser|coherent|datacenter interconnect|fiber`
- symbol rule

テーマとしては十分再現価値があるが、**単一の sector / industry では不足**。

### 2.5 電力

電力は今回の 5 テーマの中では最も provider の sector を使いやすい。  
ただし、ユーザーが見たい「電力」はおそらく純公益だけでなく、

- 発電・送配電 utilities
- grid / power equipment
- electrical infrastructure
- power semis / cooling / data center power chain

が混じる。

最適案:

- `Utilities` は独立で残す
- `Producer Manufacturing` / `Electronic Technology` から power equipment / electrical infrastructure を別テーマとして切る
- 必要なら「純電力」「電力インフラ」「AI電力需要恩恵」の 3 分割

つまり、**電力は sector をそのまま使うより、subtheme に分けた方が読み筋に合う**。

### 2.6 MLCC / コンデンサ

これは極端に狭いテーマで、provider sector ではまず表現できない。  
米国株でも該当母集団は多くない。

最適案:

- symbol allowlist を主軸にする
- business keyword を補助にする
- 必要なら日本株も含む cross-market theme として扱う

このテーマは **sector ではなく custom basket** と考えるのが正しい。

## 3. moomoo 側で取れる分類粒度

## 3.1 取れるもの

repo 既存調査と実装から、moomoo では少なくとも次が使える。

- `get_stock_filter()`
- `get_plate_list()`
- `get_plate_stock()`
- `request_history_kline()`

repo 側でも `plate_code` を stock filter payload に渡せるようになっている。

## 3.2 使い分け

### `get_stock_filter()`

これは条件検索 API として強い。  
価格、時価総額、ROIC、RSI、52 週高値接近度などはかなり扱える。  
一方で、repo が重視する `Perf.3M`, `Perf.6M`, `Perf.Y`, `SMA50`, `SMA200` は history から repo 側再計算が必要で、FCF / valuation 系も一部は partial proxy に留まる。

### `get_plate_list()` / `get_plate_stock()`

これはテーマ breadth 補完に向く。  
構成銘柄集合を取り、repo 側で

- advance ratio
- 52w 高値近辺比率
- volume support ratio

などを計算できる。

ただし、US 市場で `stock_filter` の `plate_code` に直接使える板は、公式上は **industry plate** が中心で、HK / 上海深センの方が concept plate が広い。  
したがって、**US でユーザー希望のテーマ粒度をそのまま moomoo plate に期待しすぎるのは危険**。

## 3.3 moomoo が TradingView より細かいか

答えは **部分的には Yes、全面的には No**。

- `sector` という意味では TradingView も moomoo も粗い
- `plate` / `concept` という意味では moomoo の方が細かく取れる場面がある
- ただし US は concept plate の活用幅が HK / CN より狭く、今回ほしいテーマを全部そのまま切れる保証はない

よって、**moomoo は「分類マスタの正本」ではなく、「theme breadth を取る補完データ源」として使うのが最適**。

## 4. 置換か補完か

### 4.1 TradingView を残す理由

現在の repo は TradingView 側で

- broad universe screening
- `sector` / `industry`
- price momentum
- quality / valuation の多項目取得

を一気通貫で行えている。  
日次スクリーニングもこの前提で積み上がっているため、ここを全面置換するとコストが大きい。

### 4.2 moomoo を足す理由

moomoo は

- plate 構成銘柄の取得
- breadth の再計算
- 一部 fundamentals / indicators の確認
- 履歴 OHLC の照合

が強い。  
特に「テーマとして広がっているか」を見る補助には向いている。

### 4.3 推奨方針

推奨は次の 3 層。

1. TradingView を broad candidate 抽出に使う  
2. repo 側 custom theme taxonomy で再分類する  
3. moomoo は plate breadth / validation 用に使う  

これなら、

- 既存実装を壊しにくい
- ユーザーが見たいテーマ粒度を持てる
- moomoo の強みも使える

の 3 つを同時に満たせる。

## 5. 実装するならどう切るのが最適か

## 5.1 新しい分類単位

`sector` を捨てていきなり provider 依存テーマへ寄せるより、repo 側で次の 3 層を持つのが良い。

### Layer 1: broad sector

既存の TradingView `sector`

### Layer 2: sub-industry / business model

例:

- semiconductors
- software
- utilities
- industrial electrical

### Layer 3: custom theme

例:

- memory
- space
- optical-photonics
- power-infrastructure
- mlcc-passives

この Layer 3 を ranking / breadth / leader selection の見出しに使う。

## 5.2 定義方法

おすすめは `config/screener/theme-taxonomy-us.json` のような定義ファイルで、各テーマに以下を持たせる構成。

- `seed_sectors`
- `seed_industries`
- `include_symbol_patterns`
- `exclude_symbol_patterns`
- `name_keywords`
- `description_keywords`
- `moomoo_plate_codes`
- `manual_symbols`

最初から完全自動化しようとせず、**manual_symbols を許した半自動分類** にした方が実運用では強い。

## 5.3 テーマ別の初期案

### memory

- seed sector: `Electronic Technology`
- seed industry: `Semiconductors`
- keywords: `memory`, `dram`, `nand`, `hbm`, `ssd controller`
- note: 最初は curated basket 前提

### space

- seed sectors: `Communications`, `Electronic Technology`, `Producer Manufacturing`, `Industrial Services`
- keywords: `satellite`, `space`, `launch`, `orbital`
- note: curated basket 主体

### optical-photonics

- seed sectors: `Electronic Technology`, `Communications`
- keywords: `optical`, `photonics`, `laser`, `fiber`, `coherent`
- note: keyword 補助が重要

### power-infrastructure

- seed sectors: `Utilities`, `Producer Manufacturing`, `Electronic Technology`
- keywords: `grid`, `power`, `electrical`, `transformer`, `cooling`
- note: 純公益と設備系を分ける余地あり

### mlcc-passives

- seed sectors: `Electronic Technology`, `Producer Manufacturing`
- keywords: `capacitor`, `mlcc`, `passive components`
- note: symbol allowlist 主体

## 6. 次の実装タスクとして自然な順番

1. **taxonomy doc / config を追加する**  
   broad sector と custom theme の対応表を repo に持つ

2. **既存 screener 結果に custom theme を付与する**  
   まずは Phase2 通過銘柄だけに theme tag を付ければよい

3. **theme breadth 集計を追加する**  
   TradingView ベース簡易 breadth から始め、必要に応じて moomoo plate 補完を足す

4. **theme ranking 表示を追加する**  
   現行 Phase1 sector ranking とは別表でよい

## 7. 最終提案

今回の粒度変更で一番よいのは、**「セクターランキングをより細かくする」のではなく、「セクターの上にテーマ分類を一段足す」こと** である。

理由:

- provider の `sector` / `industry` だけでは粒度が足りない
- moomoo に置き換えても US テーマ粒度はそのままでは足りない
- repo にはすでに半導体向けの repo 独自細分類の前例がある

したがって次の一手は、

- `TradingView broad screener` は残す
- `repo custom theme taxonomy` を作る
- `moomoo plate` は breadth 確認の補完に使う

が最適。
