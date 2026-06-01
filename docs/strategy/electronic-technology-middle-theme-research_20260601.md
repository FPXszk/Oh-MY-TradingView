# Electronic Technology 中テーマ調査

調査日: 2026-06-01

## 結論

`Electronic Technology` の配下にある「中テーマ」は、外部でひとつの共通標準として固定されているわけではない。  
外部で比較的標準化されているのは

1. `GICS` や `ICB` のような **業種分類**
2. `Morningstar / MSCI / Nasdaq / S&P Kensho / moomoo` のような **投資テーマ分類**

の 2 系統である。

今回の repo は、

- 上位: TradingView の broad sector `Electronic Technology`
- 中位: repo 独自の `middle theme`
- 下位: repo 独自の `subtheme`

という構造になっており、これは外部分類の実態とも整合的である。

つまり、「エレクトロニックテクノロジーの中テーマ」は外部に 1 個の正解があるというより、

- 標準分類では `Semiconductors / Communications Equipment / Electronic Components` のように切られ
- テーマ分類では `AI / Memory / Defense / Hyperconnectivity / Robotics` のように切られ
- 実戦運用では、その 2 つを重ねて repo 独自に `中テーマ` を持つ

のが自然。

## 1. repo 現行での Electronic Technology 配下の中テーマ

現行 `config/screener/theme-taxonomy-us.json` で `Electronic Technology` に紐づく中テーマは次の 11 個。

1. `AI Compute`
2. `Memory`
3. `Optical / Photonics`
4. `Space`
5. `Power & Grid`
6. `Defense Tech`
7. `Semiconductor Equipment`
8. `Connectivity Silicon`
9. `Network Infrastructure`
10. `Industrial Automation`
11. `Electronic Components`

### 小テーマ

`AI Compute`

- `AI Servers`
- `AI Accelerators`

`Memory`

- `HBM/DRAM`
- `NAND/Storage`
- `Memory Controllers`

`Optical / Photonics`

- `Optical Transceivers`
- `Laser / Photonics`
- `Coherent Optics`

`Space`

- `Satellite`
- `Launch`
- `Space Communications`

`Power & Grid`

- `Independent Power`
- `Grid Equipment`
- `Power Cooling`

`Defense Tech`

- `Defense Platforms`
- `Drone & Autonomy`
- `Secure Comms & Sensors`

`Semiconductor Equipment`

- `Wafer Fab Equipment`
- `Test & Metrology`
- `Packaging / Advanced Assembly`

`Connectivity Silicon`

- `High-Speed Connectivity`
- `RF / Mobile Connectivity`

`Network Infrastructure`

- `Ethernet Switching`
- `Carrier / Optical Networking`
- `Wireless Infrastructure`

`Industrial Automation`

- `Factory Automation`
- `Motion Control & Robotics`
- `Industrial Electrification`

`Electronic Components`

- `MLCC & Passives`
- `Connectors & Interconnect`
- `Sensing & Precision Components`

## 2. 2026-06-01 時点の実際のランキング上位

`docs/reports/screener/daily-ranking.md` では、`Electronic Technology` は Phase1 で 1 位。  
その上で Phase2 テーマランキングでは、ET に強く関係する上位テーマは次の順。

1. `Memory`
2. `Network Infrastructure`
3. `Semiconductor Equipment`
4. `Electronic Components`
5. `Optical / Photonics`
6. `AI Compute`
7. `Defense Tech`
8. `Space`
9. `Power & Grid`
10. `Connectivity Silicon`
11. `Industrial Automation`

ユーザーの感覚でいう「今は半導体が強い」は、現行結果ではかなり当たっていて、

- `Memory`
- `Semiconductor Equipment`
- `AI Compute`
- `Connectivity Silicon`

が ET 内の半導体系の中心になっている。

## 3. 外部ではどこに定義があるか

## 3.1 標準業種分類

### GICS

GICS は 4 層で、

- `Sector`
- `Industry Group`
- `Industry`
- `Sub-Industry`

を持つ。

Information Technology 配下では、今回に近い粒度として

- `Communications Equipment`
- `Technology Hardware, Storage & Peripherals`
- `Electronic Equipment, Instruments & Components`
- `Semiconductors & Semiconductor Equipment`

がある。

ただし GICS は `HBM/DRAM` や `Coherent Optics` までは切らない。  
つまり GICS は「大分類の骨格」には使えるが、「中テーマ」そのものではない。

### ICB

ICB も 4 層で、

- `Industry`
- `Supersector`
- `Sector`
- `Subsector`

を持つ。

Technology 配下では

- `Computer Hardware`
- `Semiconductors`
- `Telecommunications Equipment`

のような粒度がある。  
こちらも broad な整理には使えるが、投資テーマの熱量を見るにはまだ粗い。

## 3.2 テーマ分類

### Morningstar

Morningstar の thematic funds taxonomy では、Technology broad theme の下に

- `Artificial Intelligence + Big Data`
- `Cybersecurity`
- `Future Mobility`
- `Electronics`
- `Next-Gen Communications`
- `Robotics + Automation`
- `Space`

などがある。

これは今回の repo の

- `AI Compute`
- `Network Infrastructure`
- `Electronic Components`
- `Industrial Automation`
- `Space`

とかなり相性がいい。

### MSCI

MSCI は GICS と別に thematic exposure / thematic index の体系を持っていて、broad bucket として

- `Transformative technologies`
- `Digital economy`
- `Robotics`
- `Energy efficiency`

などを使う。  
また個別テーマ指数では `Smart Security & Defense` のような実務的テーマもある。

ただし MSCI の強みは「広いテーマ exposure を測ること」で、repo の中テーマのような daily ranking 用の細分にはそのままは使いにくい。

### Nasdaq

Nasdaq は semiconductor 系の index family がかなり強く、

- `PHLX Semiconductor Sector`
- `PHLX US AI Semiconductor`
- `Nasdaq Global Semiconductor`
- `Nasdaq US Smart Semiconductor`

のような切り方がある。  
このため、ET の中でも特に

- `AI Compute`
- `Memory`
- `Semiconductor Equipment`
- `Connectivity Silicon`

の補助根拠として相性がいい。

### S&P Kensho

S&P Kensho は実戦テーマの粒度が細かく、

- `Future Security`
- `Global Future Defense`
- `Smart Grids`

のような指数ファミリーがある。  
このため repo の

- `Defense Tech`
- `Power & Grid`
- `Space`
- `Industrial Automation`

の外部裏取りとして使いやすい。

### moomoo

moomoo OpenAPI には `get_plate_list` や `get_plate_stock` があり、`concept plate` や `industry plate` を取得できる。  
ただしこれは「運用補助や breadth 確認」には便利でも、taxonomy の正本にするには provider 依存が強い。

## 4. ユーザー感覚に近い切り方

ユーザーが言っていた

- 半導体
- 食品
- 防衛

のような感覚でいうと、`Electronic Technology` の中に自然に入るのは次。

### ET の中に自然に入るもの

1. 半導体
2. 半導体製造装置
3. メモリ
4. 通信・光通信
5. 電子部品
6. ネットワーク機器
7. 防衛電子
8. 産業オートメーション
9. 電力インフラ向け電子機器
10. 宇宙通信・衛星電子

### ET には基本入らないもの

1. 食品
2. 生活必需品一般
3. 小売一般
4. 銀行や保険

つまり `食品` は「テーマ」の一種としては存在しうるが、`Electronic Technology` 配下の中テーマとしては普通は入らない。

## 5. 実務的に一番自然な中テーマ案

現行 11 個はやや広めなので、ET を人間が理解しやすくまとめ直すなら、まずは次の 8 分割が自然。

1. `AI Compute`
2. `Memory`
3. `Semiconductor Equipment`
4. `Connectivity / Networking`
5. `Optical / Photonics`
6. `Electronic Components`
7. `Defense / Space Electronics`
8. `Industrial / Power Electronics`

この 8 分割に対して現行 taxonomy を重ねると次の対応になる。

| まとめ直し案 | 現行中テーマ |
| --- | --- |
| AI Compute | AI Compute |
| Memory | Memory |
| Semiconductor Equipment | Semiconductor Equipment |
| Connectivity / Networking | Connectivity Silicon, Network Infrastructure |
| Optical / Photonics | Optical / Photonics |
| Electronic Components | Electronic Components |
| Defense / Space Electronics | Defense Tech, Space |
| Industrial / Power Electronics | Industrial Automation, Power & Grid |

## 6. 次の論点

今回の調査から、次に詰めるべき論点はこの 3 つ。

1. `AI Compute` と `Connectivity Silicon` と `Network Infrastructure` の境界をどこまで分けるか
2. `Defense Tech` と `Space` を ET の独立中テーマに残すか、それとも「防衛電子 / 宇宙電子」に寄せるか
3. Heat をかける単位を現行 11 個のままにするか、上の 8 分割に寄せるか

## 7. 今回の一言まとめ

`Electronic Technology` の中テーマは、外部に 1 本化された定義があるというより、

- `GICS / ICB` が大分類の骨格
- `Morningstar / MSCI / Nasdaq / S&P Kensho / moomoo` がテーマの外部裏取り
- 実際の運用単位は repo 独自中テーマ

という三層で考えるのが一番自然。  
その前提で見ると、今の ET の中心はかなり明確に **半導体周辺** で、特に `Memory` が最前列に来ている。
