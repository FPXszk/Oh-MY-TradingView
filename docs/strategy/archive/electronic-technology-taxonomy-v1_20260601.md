# Electronic Technology taxonomy v1

## 目的

`Electronic Technology` セクターの中で、`中テーマ -> 小テーマ -> 代表銘柄` を実装可能な粒度まで落とす。  
この文書は、Phase2 / Phase3 の hierarchy 実装へ進む前に、**何を中テーマとして独立させ、何を小テーマとしてぶら下げるか**を固定するための v1 ドキュメントである。

## v1 方針

今回の v1 では、次の 5 中テーマを実装対象にする。

1. `AI Compute`
2. `Memory`
3. `Semiconductor Equipment`
4. `Optical / Photonics`
5. `Connectivity Silicon`

`Defense Electronics` は将来候補として有望だが、現時点では breadth が薄く cross-sector でもあるため、v1 の primary tree からは外す。

## 中テーマ一覧

| 中テーマ | 狙い | breadth 期待 | v1 実装 |
| --- | --- | --- | --- |
| AI Compute | AI サイクルの中核。accelerator と interconnect の熱を捉える | 中 | 実装 |
| Memory | HBM/DRAM と NAND を分けて memory cycle を読む | 中 | 実装 |
| Semiconductor Equipment | 半導体設備投資の熱を読む | 中 | 実装 |
| Optical / Photonics | データセンター / 通信の光接続・フォトニクス需要を読む | 中 | 実装 |
| Connectivity Silicon | 高速接続・RF 接続の横展開を読む | 中 | 実装 |
| Defense Electronics | 電子・センサー・secure comms を分離したい | 低〜中 | 将来候補 |

## 小テーマ定義

| 中テーマ | 小テーマ | 代表銘柄 | 主判定ルール | 補助判定ルール |
| --- | --- | --- | --- | --- |
| AI Compute | AI Accelerators | `NVDA`, `AMD`, `AVGO`, `MRVL` | `symbol` / `industry ~ semiconductors` | `company keyword ~ gpu, accelerator, ai` |
| Memory | HBM / DRAM | `MU`, `RMBS` | `symbol` / `industry ~ semiconductors` | `company keyword ~ hbm, dram, memory` |
| Memory | NAND / Storage | `WDC`, `STX`, `SNDK` | `symbol` / `industry ~ computer peripherals or semiconductors` | `company keyword ~ nand, flash, storage, ssd` |
| Memory | Memory Controllers / Interfaces | `SIMO`, `RMBS` | `symbol` / `industry ~ semiconductors` | `company keyword ~ controller, memory interface` |
| Semiconductor Equipment | Wafer Fab Equipment | `AMAT`, `LRCX`, `ASML`, `ACLS` | `symbol` / `industry ~ electronic production equipment` | `company keyword ~ wafer, deposition, etch` |
| Semiconductor Equipment | Test & Metrology | `KLAC`, `TER`, `COHU`, `KEYS` | `symbol` / `industry ~ electronic production equipment` | `company keyword ~ metrology, test, inspection` |
| Semiconductor Equipment | Packaging / Advanced Assembly | `ONTO`, `CAMT` | `symbol` / `industry ~ electronic production equipment` | `company keyword ~ packaging, assembly, panel` |
| Optical / Photonics | Optical Transceivers | `LITE`, `AAOI`, `FN`, `INFN` | `symbol` / `industry ~ telecom equipment or electronic production equipment` | `company keyword ~ transceiver, optical` |
| Optical / Photonics | Coherent Optics | `CIEN`, `INFN`, `GLW` | `symbol` / `industry ~ telecom equipment or computer communications` | `company keyword ~ coherent, fiber, optic` |
| Optical / Photonics | Laser / Photonics | `COHR`, `IPGP`, `LITE` | `symbol` / `industry ~ electronic production equipment` | `company keyword ~ laser, photonics, lightwave` |
| Connectivity Silicon | High-Speed Connectivity | `CRDO`, `ALAB` | `symbol` / `industry ~ semiconductors` | `company keyword ~ connectivity, interconnect, retimer, dsp, cxl` |
| Connectivity Silicon | RF / Mobile Connectivity | `QRVO`, `SWKS`, `MTSI` | `symbol` / `industry ~ semiconductors` | `company keyword ~ rf, wireless, front-end, connectivity` |

## 実装上の判断

### 1. `Memory` は中テーマにする

`Semiconductors` に全部まとめると、`HBM/DRAM` と `NAND/Storage` の差が埋もれる。  
一方で `HBM` 単体まで上げると狭すぎる。  
そのため `Memory` を中テーマにして、その下に

- `HBM / DRAM`
- `NAND / Storage`
- `Memory Controllers / Interfaces`

を置くのが最も自然である。

### 2. `Optical / Photonics` は独立中テーマにする

`Electronic Technology` の中で、光通信・coherent optics・laser/photonics は値動きのドライバーが微妙に違う。  
しかし全部 `Communications` や `networking` に混ぜると、ET 側のデータセンター光部材の熱が見えにくい。  
したがって、v1 では ET 観点で独立中テーマにする。

### 3. `Connectivity Silicon` は narrow だが作る

これは `AI Compute` や `Network Infrastructure` と重なる部分がある。  
ただし、`高速度接続 ASIC / retimer / RF connectivity` を独立して追いたい需要があるため、v1 では中テーマとして先に置く。

注意点:

- overlap の強い銘柄は完全分離できない
- v1 では symbol 優先で primary theme を寄せる
- 後続で multi-match score の扱いを改善する余地がある

### 4. `Defense Electronics` は今回は見送る

`LHX`, `TDY`, `AVAV` のような候補はあるが、現時点では

- breadth が薄い
- `Producer Manufacturing` / `Industrial Services` と cross しやすい
- ET セクターの primary tree としてはまだ弱い

ため、v1 では主対象から外す。

## 実装ルール

v1 の classification は次の優先順で行う。

1. `sector`
2. `symbol`
3. `industry keyword`
4. `company keyword`

`symbol` は brittle だが、v1 では誤分類を減らすために有効である。  
ただし、将来は revenue exposure や product-line 情報が増えたら `symbol` 依存を下げていく。

## v1 の限界

1. `MRVL`, `AVGO`, `CRDO`, `ALAB` のような多面性の強い銘柄は、単一小テーマへきれいに落ちない
2. `AI Compute` と `Connectivity Silicon` は一部重なりがある
3. `Optical / Photonics` と `Communications` 側の network theme は境界がある

そのため v1 は **primary classification の固定化** を優先し、multi-theme exposure の完全表現は次段階に回す。

## 次にやるべきこと

1. この v1 を config へ反映する
2. 代表銘柄テストを固定する
3. 次段で `Electronic Technology` の hierarchy ranking prototype を作る
