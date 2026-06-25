# TradingView industryとPhase3/Phase4テーマ分類の整合性調査

調査日: 2026-06-26 JST

## 結論

現在のPhase3/Phase4は、TradingViewや外部ベンダーの公式分類を直接取得しているのではなく、
`theme-taxonomy-us.json`に定義したrepo独自テーマを、`sector`、`industry`文字列、
symbol allowlist、会社名keywordで判定している。

今後の推奨構造は次のとおり。

1. **Phase3の公式下位分類はTradingView scannerのraw `industry`を正本にする。**
2. **現在の中テーマ・小テーマは、公式industryとは別のrepo custom thematic layerとして維持する。**
3. Phase4はcustom small themeを使い続ける。ただし各テーマに
   `TradingView industry / symbol / company or business evidence / external reference / confidence`
   を明記する。
4. GICS、ICB、NAICS、SICへ移行しない。TradingView sectorと体系が異なるため、
   比較・検証用の補助情報に留める。
5. TradingView公式が明記する分類元は
   **FactSet Industries and Economic Sectors**である。
   RBICSはFactSetの別の詳細分類製品であり、scanner `industry`がRBICSそのものだと確認できる
   根拠はない。

つまり、将来の表示階層は概念的に次が明確である。

```text
Phase1  TradingView sector
Phase2  sector別screening profile
Phase3  TradingView industry
Phase4  repo custom middle/small theme + stock ranking
```

現行Phase3はcustom middle themeランキングなので、上記への変更は表示・集計の意味を変える。
今回は調査のみとし、taxonomy、ランキング、スコアリングは変更していない。

## 現在のPhase3 / Phase4

### データの流れ

`src/core/theme-taxonomy.js`は次を読み込む。

| File | Role |
|---|---|
| `config/screener/theme-taxonomy-us.json` | 中テーマ、各小テーマ、判定条件 |
| `config/screener/theme-hierarchy-us.json` | focus sectorで表示可能な中・小テーマ |
| `config/screener/external-theme-reference-us.json` | 分類後に添付する外部参照メタデータ |

`primaryTheme`と`subThemes`の正本は`theme-taxonomy-us.json`である。
`external-theme-reference-us.json`は分類スコアに影響せず、根拠表示用の付帯情報である。

### 分類スコア

各descriptorはsectorが一致する場合だけ評価され、次を加点する。

| Condition | Score |
|---|---:|
| exact symbol match | +100 |
| `industry`が`industry_keywords`を含む | +40 |
| `companyName`が`company_keywords`を含む | +20 |
| `allow_sector_only` | +10 |

score 0は非該当。各中テーマでは小テーマを同じ方法で評価し、
中テーマ自身のscoreと最上位小テーマscoreの大きい方を中テーマscoreにする。
全中テーマをscore降順、同点ならJSON記載順で並べ、先頭が`primaryTheme`になる。
`subThemes`は選択された`primaryTheme`内の該当小テーマ一覧である。

現行US taxonomyに`allow_sector_only`はない。
したがって実際の分類根拠はsymbol、industry、company nameのいずれかである。
またsymbolの+100が強いため、allowlist登録銘柄はindustryより優先される。

### ランキングスコアとの関係

この+100/+40/+20は**テーマ名を選ぶ分類スコア**であり、銘柄ランキングの
`rankScore`には加算されない。

- Phase3中テーマ: `primaryTheme`でgroup化し、既存`rankScore`平均で順位付け
- Phase3小テーマ: `subThemes[0]`だけを代表小テーマとしてgroup化
- Phase4: 選択テーマで銘柄を絞り、既存`rankScore`で順位付け

### hierarchyの制約

`theme-hierarchy-us.json`に中テーマが登録されているsectorは次の2つだけである。

- Electronic Technology: 8中テーマ
- Technology Services: 3中テーマ

Producer ManufacturingとCommunicationsはsector定義があるが`middle_themes`は空。
またtaxonomyに存在するConnected Mobilityはhierarchyにない。
そのため分類自体は成立しても、focus sectorのPhase3/Phase4階層候補として使えない場合がある。

## TradingView scanner industry snapshot

2026-06-26 00:57 JSTに、america marketのstockを全ページ取得し、
NASDAQ/NYSE、時価総額10億ドル超へ絞った。

| Metric | Result |
|---|---:|
| scanner raw total | 4,030 |
| scoped stocks | 2,661 |
| sectors | 20 |
| industries | 126 |

成果物:

- `config/screener/tradingview-sector-industry-snapshot-us.json`
- `docs/research/tradingview-us-sector-industry-snapshot.md`

TradingView公式は、sector/industryをFactSet Industries and Economic Sectorsモデルで分類し、
企業の売上の中心となる事業を基準にすると説明している。

## Heatmapの下位分類

Stock Heatmapの実画面でGroup byメニューを確認したところ、選択肢は次の2つだけだった。

- No group
- Sector

TradingView公式ガイドも「sectorをクリックすると、その中のsymbolsのheatmapを開く」と説明する。
つまりsectorの次にindustry groupを表示するのではなく、個別銘柄へdrill downする。

一方、Heatmapが使用するscanner requestでは`industry`列を要求でき、各銘柄のindustry値も返る。
したがって判定は次のとおり。

| Question | Result |
|---|---|
| scannerからindustryを取得できるか | Yes |
| Heatmap responseの銘柄にindustryを含められるか | Yes |
| Heatmap UIがsector -> industryでgroup表示するか | No |
| Heatmapの下位公式分類としてindustryを利用できるか | scanner値をrepo側で利用可能 |

Heatmap bundle/endpointは公開安定APIとして保証されていないため、repoの取得経路は既存の
america scannerを使い、raw `industry`を保存するのが単純である。

## current themeとTradingView industryの対応

confidenceの基準:

- High: industryがテーマの主要な公式anchorになり、symbolで細分化できる
- Medium: industryは有効だが、複数テーマと共有されsymbol/company evidenceが必須
- Low: industryだけでは意味が広すぎる、または現行rule/evidenceに不整合がある

| TradingView sector | TradingView industry anchor | Current middle theme | Current small theme | Classification basis | Confidence | Recommended action |
|---|---|---|---|---|---|---|
| Electronic Technology | Computer Processing Hardware; Computer Communications | AI Compute | AI Servers / Systems | industry + symbol + company | Medium | industryをPhase3表示、AI用途はcustom tag維持 |
| Electronic Technology | Semiconductors | AI Compute | AI Accelerators | industry + symbol + company | Medium | Semiconductors全体をAI扱いせずsymbol根拠必須 |
| Electronic Technology | Semiconductors; Computer Communications | AI Compute | AI Interconnect / CXL / Data Center Fabric | industry + symbol + company | Medium | custom tag維持 |
| Technology Services | なし | AI Compute | AI Cloud / Neocloud | symbol + company | Low | business descriptionまたは外部membership根拠を追加 |
| Electronic Technology | Semiconductors | Memory | HBM / DRAM | industry + symbol + company | Medium | custom tag維持 |
| Electronic Technology | Computer Peripherals; Semiconductors | Memory | NAND / Storage | industry + symbol + company | Medium | storageとmemoryをsymbolで分離 |
| Electronic Technology | Semiconductors | Memory | Memory Controllers / Interface IP | industry + symbol + company | Medium | custom tag維持 |
| Electronic Technology | Telecommunications Equipment; Electronic Production Equipment; Computer Communications | Optical / Photonics | Optical Transceivers | industry + symbol + company | Medium | industryはanchor、光用途はcustom |
| Electronic Technology | Electronic Production Equipment | Optical / Photonics | Laser / Photonics | industry + symbol + company | Medium | semiconductor equipmentとの衝突に注意 |
| Electronic Technology | Telecommunications Equipment; Computer Communications | Optical / Photonics | Coherent Optics / Fiber | industry + symbol + company | Medium | custom tag維持 |
| Electronic Technology | Aerospace & Defense; Electronic Equipment/Instruments | Defense / Space Electronics | Secure Comms / Sensors | industry + symbol + company | Medium | custom tag維持 |
| Electronic Technology | Aerospace & Defense | Defense / Space Electronics | Drone / Autonomy Electronics | industry + symbol + company | Medium | aerospace全体をdrone扱いしない |
| Electronic Technology; Communications | Aerospace & Defense; Telecommunications Equipment; Wireless Telecommunications | Defense / Space Electronics | Satellite / Space Communications | industry + symbol + company | Medium | cross-sector custom tag維持 |
| Producer Manufacturing; Electronic Technology | Industrial Machinery; Electronic Production Equipment; Electronic Equipment/Instruments | Industrial / Power Electronics | Factory Automation / Motion Control | industry + symbol + company | Medium | hierarchy空欄を将来整理 |
| Producer Manufacturing | Electrical Products; Industrial Machinery | Industrial / Power Electronics | Industrial Electrification | industry + symbol + company | Medium | custom tag維持 |
| Producer Manufacturing; Industrial Services | Electrical Products; Engineering & Construction | Industrial / Power Electronics | Grid Equipment / Power Conversion | industry + symbol + company | Medium | cross-sector custom tag維持 |
| Electronic Technology; Producer Manufacturing | Electronic Production Equipment; Industrial Machinery | Industrial / Power Electronics | Power Cooling / Thermal Management | industry + symbol + company | Medium | custom tag維持 |
| Electronic Technology | Electronic Production Equipment | Semiconductor Equipment | Wafer Fab Equipment | industry + symbol + company | High | Phase3 industry + Phase4 custom細分化 |
| Electronic Technology | Electronic Production Equipment | Semiconductor Equipment | Test / Metrology / Inspection | industry + symbol + company | High | Phase3 industry + Phase4 custom細分化 |
| Electronic Technology | Electronic Production Equipment | Semiconductor Equipment | Advanced Packaging / Assembly | industry + symbol + company | High | Phase3 industry + Phase4 custom細分化 |
| Electronic Technology | Computer Communications; Telecommunications Equipment | Connectivity / Networking | Ethernet Switching / Routing | industry + symbol + company | Medium | custom tag維持 |
| Electronic Technology | Semiconductors | Connectivity / Networking | RF / Mobile Connectivity | industry + symbol + company | Medium | semiconductor用途をsymbolで限定 |
| Electronic Technology | Telecommunications Equipment | Connectivity / Networking | Carrier / Optical Networking | industry + symbol + company | Medium | optical themeとの重複を明示 |
| Electronic Technology | Telecommunications Equipment | Connectivity / Networking | Wireless Infrastructure | industry + symbol + company | Low | CAMTはindustry/事業との整合を再確認 |
| Communications | Specialty Telecommunications; Wireless Telecommunications | Connected Mobility | Telematics / Connected Mobility | industry + symbol + company | Low | hierarchy未登録を明示、外部根拠追加 |
| Technology Services | Packaged Software; Internet Software/Services | Cloud Software | Cloud Platforms | industry + symbol + company | Medium | industryだけではCybersecurityと分離不能 |
| Technology Services | Packaged Software; Internet Software/Services | Cloud Software | Data Infrastructure Software | industry + symbol + company | Medium | custom tag維持 |
| Technology Services | Packaged Software; Internet Software/Services | Cloud Software | Developer Tooling | industry + symbol + company | Medium | custom tag維持 |
| Technology Services | Packaged Software; Internet Software/Services | Cybersecurity | Endpoint Security | industry + symbol + company | Medium | official industry + custom exposure併記 |
| Technology Services | Packaged Software; Internet Software/Services | Cybersecurity | Identity Security | industry + symbol + company | Medium | custom tag維持 |
| Technology Services | Packaged Software; Internet Software/Services | Cybersecurity | Network Security | industry + symbol + company | Medium | custom tag維持 |
| Electronic Technology | Electronic Components; Electronic Equipment/Instruments | Electronic Components | MLCC / Passive Components | industry + symbol + company | High | Electronic ComponentsをPhase3 anchor化 |
| Electronic Technology | Electronic Components; Computer Communications | Electronic Components | Connectors / Interconnect | industry + symbol + company | Low | `AMPH`は`APH`の可能性を確認 |
| Electronic Technology | Electronic Components; Electronic Equipment/Instruments | Electronic Components | Sensors / Precision Components | industry + symbol + company | Medium | passive componentsとのsymbol重複を整理 |

## 分類可能性の整理

### industryだけで安定して表現できるもの

完全な小テーマまでindustryだけで表現できるものはない。
最も近いのは次である。

- Semiconductor Equipmentの上位anchor: Electronic Production Equipment
- Electronic Componentsの上位anchor: Electronic Components

ただし前者には光学・産業機器も含まれ、後者も部品用途の細分化はできない。

### symbol allowlistが必要なもの

ほぼ全小テーマで必要である。特に次のindustryは複数custom themeへ広く共有される。

| Industry | Competing custom themes |
|---|---|
| Semiconductors | AI Accelerators; AI Interconnect; Memory; RF |
| Electronic Production Equipment | Optical; Factory Automation; Cooling; Semiconductor Equipment |
| Telecommunications Equipment | Optical; Networking; Space Communications |
| Packaged Software / Internet Software/Services | Cloud Software; Cybersecurity |
| Aerospace & Defense | Secure Comms; Drone; Satellite/Space |

### company keywordが必要なもの

現行実装は会社説明文ではなく`companyName`だけを検索する。
そのため`cloud`、`security`、`laser`などが法人名に含まれない企業には効かず、
symbol allowlistより弱い補助条件である。

将来改善するならcompany nameではなく、TradingView/SEC等のbusiness descriptionを
別の根拠として扱うべきだが、今回は実装しない。

### 根拠が弱い、または確認が必要なもの

- AI Cloud / Neocloud: industry keywordがなくsymbol/company name依存
- Connected Mobility: hierarchy未登録
- Wireless InfrastructureのCAMT: 通信設備テーマとの事業整合を再確認
- Connectors / InterconnectのAMPH: Amphenolのticker `APH`との表記確認
- SensorsとMLCC: 同じsymbol集合を共有しており、小テーマ分離の根拠が弱い
- external referenceの`industrial-automation`: taxonomyの
  `industrial-power-electronics`とidが一致せず、自動添付されない

## 外部分類候補

| Candidate | Nature | Phase3 source of truth | Phase4 support | Decision |
|---|---|:---:|:---:|---|
| FactSet Industries and Economic Sectors | TradingViewが明記するsector/industry元 | Yes, TradingView raw値経由 | Limited | TradingView snapshotのsourceとして記録 |
| FactSet RBICS | 6階層、製品・サービスや売上を用いる詳細taxonomy | No | Strong if licensed | TradingView industryとの同一性は未確認。補助候補 |
| GICS | 4階層、11 sectors、単一principal business | No | Limited | TradingView 20 sectorsと非互換。比較用 |
| ICB | 4階層、11 industries等のrules-based分類 | No | Limited | TradingView体系と非互換。比較用 |
| NAICS | 生産工程ベースの政府統計分類 | No | Low | establishment統計向け。投資theme正本に不適 |
| SEC SIC | EDGAR会社のtype of business / review担当分類 | No | Low | 粗く古い。SEC照合用の補助属性 |
| Morningstar thematic | analyst score、fund consensus等のtheme exposure | No | High | custom themeの外部検証に有用。多くはlicensed |
| MSCI thematic | economic linkage / relevance score | No | High | custom theme evidenceとして有用 |
| Nasdaq thematic indexes | indexごとのrules / partner data | No | Medium | 該当indexの構成・methodologyを個別参照 |
| S&P Kensho | filings等をNLPで解析するNew Economies taxonomy | No | High | Phase4テーマ検証に有力 |

### FactSetとRBICS

TradingViewが明記する名称はFactSet Industries and Economic Sectorsである。
RBICSはFactSet Revereの別製品で、14×6 matrix、1,700超のsector group、
revenueやtradenamesを使う詳細分類を提供する。

両者は同じFactSet製でも同一taxonomyとは確認できない。
したがって「TradingView industryはRBICS由来」と断定せず、
TradingView公式表記をそのままsource metadataへ残す。

### GICS / ICB

GICSはSector -> Industry Group -> Industry -> Sub-Industry、
ICBはIndustry -> Supersector -> Sector -> Subsectorの4階層である。
どちらも企業比較には優れるが、TradingViewの20 sector名称とは一致しない。
Phase1/2をTradingView基準で統一した方針を崩してまで移行する利点はない。

### NAICS / SIC

NAICSは類似した生産工程を持つ事業所をまとめる政府統計用分類である。
SEC SICはEDGARで会社のtype of businessと審査担当割当に使われる。
いずれもAI Cloud、HBM、Coherent Opticsなどの投資テーマを表現する分類ではない。

### thematic providers

Morningstar、MSCI、Nasdaq、S&P Kenshoは、traditional industryを越えるテーマ露出の
検証に適している。ただしtaxonomy、構成銘柄、scoreはprovider固有で、更新・利用条件も異なる。
repoの正本にコピーするのではなく、custom themeごとの外部reference/evidenceに使う。

## 推奨方針

### 1. official classificationとcustom themeを分離する

1つの`primaryTheme`へ公式industryと投資テーマの両方を背負わせない。

```text
official:
  sector = TradingView sector
  industry = TradingView industry

custom:
  middleTheme = repo thematic group
  smallThemes = repo thematic tags
```

### 2. Phase3はTradingView industryを正本にする

Phase3で客観的な下位分類ランキングを作るなら、scannerから既に取得できる
`industry`をそのままgroup keyにするのが最小で再現可能である。

### 3. Phase4はcustom themeを維持する

AI infrastructure、HBM、coherent optics、cybersecurityなどは単一industryでは表現できない。
Phase4の銘柄選抜では、custom small themeを維持する合理性がある。

### 4. custom themeの根拠を構造化する

将来のtaxonomy改訂時は、各小テーマに最低限次を持たせる。

- accepted TradingView sectors
- accepted TradingView industries
- explicit symbolsと確認日
- business description keywordまたは公式事業根拠
- external thematic reference
- confidence
- manual review note

### 5. 現行不整合は別タスクで修正する

今回確認したCAMT、AMPH、hierarchy未登録、external reference id不一致は、
分類変更になるため本調査では直していない。修正時は個別銘柄の公式事業情報を確認し、
taxonomy変更と回帰テストを別exec-planで行う。

## 参照

- [TradingView Sector & Industry](https://www.tradingview.com/support/solutions/43000724300-sector-industry/)
- [TradingView Stock Heatmap](https://www.tradingview.com/heatmap/stock/)
- [TradingView Heatmap guide](https://www.tradingview.com/support/solutions/43000766446-tradingview-heatmaps-from-global-trends-to-details/)
- [FactSet RBICS overview](https://insight.factset.com/resources/factset-revere-business-industry-classifications-datafeed)
- [MSCI GICS](https://www.msci.com/indexes/index-resources/gics)
- [FTSE Russell ICB](https://www.lseg.com/en/ftse-russell/industry-classification-benchmark-icb)
- [US Census NAICS](https://www.census.gov/naics)
- [SEC SIC code list](https://www.sec.gov/search-filings/standard-industrial-classification-sic-code-list)
- [Morningstar Thematic Consensus Indexes](https://indexes.morningstar.com/api/docs/6930bbb552940c1af4c7052f)
- [MSCI Thematic Indexes](https://www.msci.com/indexes/category/thematic-indexes)
- [Nasdaq thematic methodology example](https://indexes.nasdaq.com/docs/NQROBO%20Thematic%20Revenue%20Overview%20%E2%80%93%20April%202024.pdf)
- [S&P Kensho New Economies](https://www.spglobal.com/spdji/en/index-family/equity/kensho-new-economies/)

## 変更範囲

この調査では次を変更していない。

- `theme-taxonomy-us.json`
- `theme-hierarchy-us.json`
- `external-theme-reference-us.json`
- runtime classification logic
- ranking / scoring logic
- daily ranking report
