# 米国株テーマ外部ソース deep research

## 調査日

2026-06-01

## 調査目的

米国株スクリーニングにおいて、

1. `Phase1` で盛り上がっているセクターを選ぶ
2. そのセクター配下の銘柄群に対して repo 側でテーマを付与する
3. そのテーマが **信頼できる外部ソースでも独立に言及されていれば加点する**

という重み付けを実現したい。

この文書では、米国株で使える「外部テーマ源」を

- 信頼性
- テーマ定義の明確さ
- 米国株カバレッジ
- 取得方法
- 日次運用しやすさ
- スクレイピング/再利用リスク

の観点で比較し、repo への組み込み方針を整理する。

## 先に結論

最適方針は、**外部テーマ源を 1 つに寄せるのではなく、役割別に 3 層で使い分けること** である。

1. `TradingView`
   - 既存どおり `Phase1` の broad sector ranking に使う
2. `repo theme taxonomy`
   - `Phase1` 通過銘柄を `Memory` `Space` `Power & Grid` などの中テーマへ再分類する
3. `外部テーマ源`
   - repo が付与したテーマに対して、外部での独立言及を加点する

この 3 層のうち、**外部テーマ源の第一候補は `Morningstar + MSCI + S&P Kensho` の組み合わせ** で、`moomoo` は補助候補である。

理由は次の通り。

- `Morningstar`
  - テーマ指数を持つだけでなく、`Consensus` という形で「複数 thematic fund holdings にまたがる共通テーマ」を定義している
- `MSCI`
  - institutional-grade の thematic framework を持ち、security-level の thematic exposure standard まで整理している
- `S&P Kensho`
  - New Economies / frontier themes の整理が強く、テーマの実務的なラベルとして使いやすい
- `moomoo`
  - API 取得はしやすいが、米国株テーマの coverage と定義安定性は index provider ほど強くない

したがって、**「信頼できるテーマ定義」は Morningstar / MSCI / S&P Kensho で持ち、`moomoo` は実運用の補助シグナルに留める** のが最も筋が良い。

## 1. 評価フレーム

今回の外部テーマ源には、次の 2 種類がある。

### 1.1 テーマ定義ソース

テーマそのものを provider が定義しているもの。

例:

- Morningstar thematic indexes
- MSCI thematic indexes
- S&P Kensho thematic indexes
- Nasdaq thematic indexes

### 1.2 テーマ熱量ソース

「今そのテーマが注目されているか」を示すもの。

例:

- broker/app 内の concept / plate
- thematic ETF / index の直近相対強度
- 複数 provider で同じテーマが並行して採用されているか

今回ほしいのは、**テーマ定義ソースを正本にしつつ、熱量ソースを加点に使う** 形である。

## 2. 候補一覧

### 2.1 Morningstar

- 公式:
  - [Morningstar Thematic Indexes](https://indexes.morningstar.com/thematic/)
  - [Morningstar Thematic Indexes Methodology](https://indexes.morningstar.com/docs/calculation-and-methodology/morningstar-thematic-indexes-methodology)

#### 何があるか

Morningstar は thematic index 群を公開しており、特に `Consensus` 系が重要である。  
公式説明では、Morningstar thematic index は **thematic funds の公開 holdings を使い、共通テーマを抽出する** 形を取る。

公開されている `Morningstar Thematic Consensus Indexes` のルール文書では、対象テーマとして少なくとも次が挙がっている。

- Artificial Intelligence and Big Data
- Battery Technology
- Cybersecurity
- Cloud Computing
- Digital Economy
- Energy Transition
- Fintech
- Food
- Future Mobility
- Life Sciences
- Nanotechnology and New Materials
- Resource Management
- Robotics and Automation
- Space
- Wellness

これは今回の要件と相性が良い。  
なぜなら、単一メディアの主観ではなく、**市場で実際に thematic fund として採用されている銘柄群の交差からテーマを定義している** からである。

#### 強み

- 信頼性が高い
- テーマ定義が index provider として明確
- 「テーマとして実際に運用商品に採用されているか」を反映しやすい
- 単なる概念語ではなく、米国株の構成銘柄へ落ちやすい

#### 弱み

- “今熱いランキング” をそのまま無料公開しているわけではない
- constituent の完全利用や日次自動再利用は license 前提になる可能性が高い
- 無料公開ページだけで daily automation を完結させるにはやや弱い

#### 評価

- 信頼性: `A`
- テーマ定義の明確さ: `A`
- 米国株適合性: `A`
- 自動取得しやすさ: `C`
- 日次の熱量シグナル: `B-`

#### 使いどころ

- **repo の external theme master の第一候補**
- 「このテーマは外部でも正式な thematic bucket として存在するか」の判定
- provider cross-reference の 1 票として使う

### 2.2 MSCI

- 公式:
  - [MSCI Thematic Indexes](https://www.msci.com/indexes/thematic-indexes)
  - [MSCI Thematic Exposure Standard](https://www.msci.com/data-and-analytics/index-data/thematic-exposure-standard)

#### 何があるか

MSCI は thematic indexes を広く展開している。  
加えて、`Thematic Exposure Standard` を公開しており、**テーマを keywords / concepts / subthemes / business activities に分解し、security-level で exposure を定義する枠組み** を持っている。

公式 thematic 紹介ページでも、MSCI は environment/resources、transformative technologies、health/healthcare、society/lifestyle などにまたがる **30 超のテーマ** を扱うとしている。

これは今回の repo でかなり参考になる。  
今の repo は `symbol + industry keyword + company keyword` の score で theme を付けているが、MSCI の考え方はそれをより formal にしたものに近い。

#### 強み

- 信頼性が非常に高い
- テーマ定義の粒度が高い
- security-level framework があり、repo taxonomy の設計思想と相性が良い
- single source ではなく標準化された thematic framework として使える

#### 弱み

- retail 向けに “今熱いテーマランキング” を見せるサービスではない
- constituent の無料取得導線は限定的
- 日次ランキング source として使うより、**定義ソース** として強い

#### 評価

- 信頼性: `A+`
- テーマ定義の明確さ: `A+`
- 米国株適合性: `A`
- 自動取得しやすさ: `C`
- 日次の熱量シグナル: `C+`

#### 使いどころ

- **repo theme taxonomy の外部妥当性確認**
- 「複数キーワードや事業露出で theme を判定する」設計の参照元
- provider cross-reference の 1 票

### 2.3 S&P Kensho

- 公式:
  - [S&P Kensho New Economies](https://www.spglobal.com/spdji/en/index-family/equity/kensho-new-economies/)
  - [S&P Kensho Indices Methodology](https://www.spglobal.com/spdji/en/documents/methodologies/methodology-sp-kensho-indices.pdf)

#### 何があるか

S&P Kensho は frontier / innovation / new economies テーマの指数群を持つ。  
`Space`, `Future Security`, `Clean Power`, `Autonomous Technology`, `Robotics` のように、ユーザーが見たい「テーマ投資らしいラベル」が多い。

公開 methodology では、business activity focus の判定に annual report / SEC filing の business description と search terms を使う流れが記載されており、単なる editorial pick よりルール化されている点が強い。

#### 強み

- テーマラベルが実務的でわかりやすい
- `Space` など、sector だけでは見えないテーマに強い
- S&P 系列なので信頼性が高い
- repo の `Space` `Defense Tech` `Power` 系テーマと相性が良い

#### 弱み

- provider 固有 taxonomy の色がやや強い
- index family ごとの constituent 利用は license 前提になりやすい
- breadth / “今熱いか” の日次 signal は別途計算が必要

#### 評価

- 信頼性: `A`
- テーマ定義の明確さ: `A`
- 米国株適合性: `A`
- 自動取得しやすさ: `C`
- 日次の熱量シグナル: `B-`

#### 使いどころ

- **`Space` `Defense` `Robotics` `Power transition` 系の外部確認**
- Morningstar / MSCI だけだと固すぎるテーマの補完

### 2.4 Nasdaq thematic / innovation indexes

- 公式:
  - [Nasdaq Thematic Indexes](https://www.nasdaq.com/solutions/indexes/thematic-indexes)

#### 何があるか

Nasdaq も thematic / innovation 系 index family を持つ。  
technology growth 寄りのテーマとの相性は良い。

公式ページでも、thematic indexes を `sector-agnostic` かつ `cross-sector inclusion` で扱うと説明しており、従来 sector に閉じないテーマ露出の考え方を明示している。

#### 強み

- 米国株との相性が良い
- technology / innovation 側のラベル補強に使いやすい
- provider としての信頼性は十分高い

#### 弱み

- MSCI / Morningstar と比べると、taxonomy 標準として使うにはやや弱い
- repo で必要な全テーマを網羅するとは限らない

#### 評価

- 信頼性: `A-`
- テーマ定義の明確さ: `B+`
- 米国株適合性: `A`
- 自動取得しやすさ: `C`
- 日次の熱量シグナル: `C+`

#### 使いどころ

- 半導体・AI・インフラ系テーマの補助確認
- 第一候補ではなく補助 provider

### 2.5 moomoo

- 公式:
  - [moomoo OpenAPI Quote Overview](https://openapi.moomoo.com/moomoo-api-doc/en/quote/quote.html)
  - [Get Plate List](https://openapi.moomoo.com/moomoo-api-doc/en/quote/get-plate-list.html)
  - [Get Plate Stock](https://openapi.moomoo.com/moomoo-api-doc/en/quote/get-plate-stock.html)
  - [Get Owner Plate](https://openapi.moomoo.com/moomoo-api-doc/en/quote/get-owner-plate.html)

#### 何があるか

moomoo には `INDUSTRY` `CONCEPT` `REGION` の plate 概念がある。  
API 上は

- plate 一覧を取る
- ある銘柄が属する owner plate を取る
- plate 構成銘柄を取る

ができる。

理想的には、ここから

- `Memory`
- `Space`
- `Power`
- `Quantum`
- `Data Center`

のような concept plate が US で十分取れれば強い。

#### 強み

- API 取得しやすさは最も高い
- 日次運用へ乗せやすい
- concept / plate があれば、そのまま breadth 計算ができる
- `owner plate` で individual stock への theme link を逆引きできる

#### 弱み

- **米国株の concept coverage が HK/CN ほど広い保証がない**
- provider の定義安定性は index provider より弱い
- “信頼できる正本” というより broker UI/分類である
- plate 名が変わったり、概念の粒度が統一されていない可能性がある

#### 評価

- 信頼性: `B`
- テーマ定義の明確さ: `B-`
- 米国株適合性: `B-`
- 自動取得しやすさ: `A`
- 日次の熱量シグナル: `A-`

#### 使いどころ

- **daily automation の補助シグナル**
- owner plate / concept plate が取れるテーマだけ breadth 補完
- external theme master の正本ではなく、加点 source の 1 票

## 3. 比較表

| ソース | 信頼性 | 米国株テーマ定義 | 日次自動化 | “今熱い” の近さ | 推奨役割 |
| --- | --- | --- | --- | --- | --- |
| Morningstar | 高い | 強い | 低〜中 | 中 | 外部テーマ正本の中核 |
| MSCI | 非常に高い | 非常に強い | 低〜中 | 低〜中 | taxonomy 妥当性の正本 |
| S&P Kensho | 高い | 強い | 低〜中 | 中 | frontier theme 補完 |
| Nasdaq | 高い | 中 | 低〜中 | 低〜中 | tech 系補助 |
| moomoo | 中 | 中 | 高い | 高い | daily signal / breadth 補助 |

## 4. “盛り上がっているテーマ” をどう作るか

重要なのは、**信頼できるテーマ定義** と **いま熱いか** を分けることである。

### 4.1 やってはいけない案

1. 1 つの外部サイトだけを正本にする
2. テーマ名をスクレイプして、そのまま repo レポートへ転載する
3. provider のテーマ構成銘柄を、そのまま自前の最終分類として使う

これらは、

- provider 依存が強すぎる
- 定義変更に弱い
- 権利/再利用リスクが高い
- repo の既存 Phase1/Phase2 と噛み合いにくい

ため非推奨。

### 4.2 推奨案

推奨は次の 4 ステップ。

1. `TradingView` で `Phase1 sector ranking`
2. repo 側 taxonomy で `Phase2 theme assignment`
3. 外部 provider 群で `theme confirmation`
4. 確認票数と market action を使って `theme heat score` を付ける

### 4.3 theme heat score の考え方

テーマごとに次のような score を持つ。

```text
theme_heat_score
  = phase1_sector_strength
  + repo_internal_theme_breadth
  + external_provider_confirmation
  + external_market_signal
```

#### 各要素

`phase1_sector_strength`

- 既存 `Phase1` のセクター順位
- 例: 上位 3 sector 内テーマだけ base point を持つ

`repo_internal_theme_breadth`

- そのテーマに分類された銘柄数
- そのテーマ群の平均 `Perf.3M` / `Perf.6M`
- 52w 高値近辺比率
- 出来高 support

`external_provider_confirmation`

- Morningstar に類似テーマあり: `+1`
- MSCI に類似テーマあり: `+1`
- S&P Kensho に類似テーマあり: `+1`
- Nasdaq に類似テーマあり: `+0.5`
- moomoo concept/owner plate あり: `+0.5`

`external_market_signal`

- 対応する thematic ETF / index の 1M, 3M relative strength
- moomoo plate breadth が strong
- 同じテーマが複数 provider で同時に採用されている

### 4.4 実務上の解釈

これなら、

- `Electronic Technology` が強い
- その中で repo 分類では `Memory` が breadth を持つ
- `Memory` に対して Morningstar / MSCI / Nasdaq の外部テーマ定義がある

なら、`Memory` を「外部確認付きの強いテーマ」として上位へ押し上げられる。

反対に、

- repo 内では一時的に銘柄数がある
- でも外部 provider では独立テーマとしてほぼ確認できない

なら、「局所的な cluster」として扱い、過信を下げられる。

## 5. 外部ソースの推奨順位

### Tier 1: 正本候補

1. `Morningstar`
2. `MSCI`
3. `S&P Kensho`

この 3 つで、外部 theme master の骨格を作るのが最も良い。

### Tier 2: 補助候補

4. `Nasdaq`
5. `moomoo`

Nasdaq は technology 側の補助。  
moomoo は daily automation / breadth 補助。

### Tier 3: 非推奨

- 無名のまとめサイト
- ブログ型テーマ株記事
- スクレイピング前提のテーマ一覧サイト

今回の要件は「信頼できるところ」なので、ここは避けるべきである。

## 6. repo への組み込み方針

### 6.1 既存フローは維持する

repo はすでに

- `TradingView sector ranking`
- `repo theme taxonomy`
- `theme summary / ranking`

を持っている。  
そのため、外部テーマ源のために `Phase1` を置換する必要はない。

### 6.2 足すべきレイヤー

次の新規レイヤーを足すのが自然。

`external-theme-reference-us.json`

- repo テーマ ID
- external provider 名
- provider 側テーマ名
- confidence
- optional ticker/index proxy

例:

```json
{
  "memory": {
    "providers": [
      { "source": "Morningstar", "label": "Semiconductor Memory / Data Infrastructure related thematic bucket", "confidence": 0.9 },
      { "source": "MSCI", "label": "Semiconductors / AI infrastructure related thematic exposure", "confidence": 0.8 },
      { "source": "Nasdaq", "label": "Semiconductor / AI infrastructure related index family", "confidence": 0.6 },
      { "source": "moomoo", "label": "Concept plate match if available", "confidence": 0.4 }
    ]
  }
}
```

### 6.3 ランキング表示の考え方

最終レポートでは、テーマごとに

- `Phase1 parent sector`
- `repo breadth`
- `external confirmation count`
- `external confirmed by`

を出すとよい。

例:

```text
Memory
  parent sector: Electronic Technology
  repo breadth: 6 names
  external confirmed by: Morningstar, MSCI, Nasdaq
  heat score: 8.4
```

## 7. 実現性判定

### 7.1 すぐできること

- 外部テーマ source の reference table を作る
- repo theme ごとに external confirmation を持たせる
- `confirmation count` ベースの加点を daily ranking に足す

### 7.2 少し重いが有益なこと

- thematic ETF / index proxy をテーマごとに持つ
- 1M / 3M relative strength で「外部市場でも走っているか」を点数化する

### 7.3 すぐには勧めにくいこと

- Morningstar / MSCI / S&P constituent を丸ごと daily scrape して primary source にする
- broker / media のテーマページを転載前提で使う

## 8. 最終提案

今回の用途に対する最終提案はこれである。

1. `Phase1` は今の `TradingView sector ranking` を維持する
2. repo 既存 taxonomy で `Memory / Space / Power / Optical / Defense` などへ再分類する
3. 外部テーマ源は `Morningstar + MSCI + S&P Kensho` を主軸にする
4. `moomoo` は concept / owner plate が取れるテーマのみ補助的に使う
5. “盛り上がり” は provider 名の数ではなく、`external confirmation + internal breadth + market action` の合成スコアで判断する

要するに、

- **定義の信頼性は index provider で担保**
- **日次運用のしやすさは moomoo と repo 計算で担保**
- **最終ランキングは repo 側で合成**

が最適である。

## 9. 実装に進むなら最小スコープ

実装に進むなら、最初の 1 手はこれがよい。

1. `external-theme-reference-us.json` を作る
2. 既存 repo theme に対して `Morningstar / MSCI / S&P Kensho / Nasdaq / moomoo` の対応表を入れる
3. `external_confirmation_count` を `theme ranking` に追加する
4. レポート上に `confirmed by` を表示する

この段階では、スクレイピングや license の重い話へ入らずに、

- テーマ定義の信頼性
- レポートの納得感
- manual taxonomy の恣意性低減

を先に改善できる。
