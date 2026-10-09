# TradingView to Moomoo Watchlist Migration Handoff

作成日: 2026-09-02

## 目的

TradingView のウォッチリストを Moomoo OpenAPI のウォッチリストへ移行する。

登録作業は別AIへ引き継ぐ前提のため、本資料では以下を固定する。

- TradingView から取得できたリスト名と銘柄
- Moomoo に直接登録する銘柄
- TradingView 銘柄の代替として Moomoo に登録する銘柄
- 代替なしとして除外する銘柄
- 登録時の注意点

## 前提

- Moomoo OpenD は起動済みで、直接 Python adapter から `qot_logined=true`, `trd_logined=true`, `program_status_type=READY` を確認済み。
- Moomoo OpenAPI には `modify_user_security(group_name, op, code_list)` があり、カスタムウォッチリストに銘柄を追加できる。
- システムグループは変更不可。登録先はカスタムグループにする。
- API制限は公式ドキュメント上、30秒あたり10リクエスト。
- TradingView の `NASDAQ`, `NYSE`, `AMEX`, `CBOE` は Moomoo の `US.` へ変換する。
- TradingView の `TSE` は Moomoo の `JP.` へ変換する。
- TradingView の `SSE` は Moomoo の `SH.` へ変換する。
- TradingView の指数、先物、CFD、暗号資産ペアは原則そのまま登録せず、最適なETF/暗号資産単体へ代替する。
- 代替が弱いもの、または代替なしのものは除外する。

## 取得リスト概要

TradingView の「リストを開く」ダイアログで確認した作成済みリストは以下。

| TradingView リスト | 表示件数 | 移行方針 |
|---|---:|---|
| `!Index` | 30 | 直接登録 + 代替登録 + 一部除外 |
| `AI` | 46 | 取得済み銘柄は直接登録 |
| `ATH` | 53 | 取得済み銘柄は直接登録、一部代替 |
| `commodity` | 24 | 取得済み銘柄は直接登録 |
| `DRAM&` | 13 | 直接登録 + 韓国株代替 |
| `Fintec` | 13 | 取得済み銘柄は直接登録 |
| `Health` | 0 | 登録なし |
| `MLCC` | 11 | 直接登録 |
| `Nuclear&Quan` | 12 | 取得済み銘柄は直接登録 |
| `photons` | 35 | 直接登録 + 一部除外 |
| `Power US Infra` | 14 | 直接登録 |
| `Rare earths` | 9 | 直接登録 + 一部代替 |
| `Robotics` | 22 | 取得済み銘柄は直接登録 |
| `Space` | 14 | 取得済み銘柄は直接登録 |
| `Tier1 JP` | 78 | 直接登録 |

Note: TradingView の表示件数と DOM から取得できた件数が一部一致しないリストがある。`Tier1 JP` は78件すべて取得済み。その他リストは画面上取得できた銘柄を登録対象にする。

## 登録先グループ設計

TradingView と同名の Moomoo カスタムグループを作り、以下のコードを追加する。

既に Moomoo 側に存在確認できたカスタムグループ:

- `ATH`
- `JP`
- `BTC`

存在しないグループは Moomoo UI または API/手動で事前作成してから追加する。

推奨グループ名:

- `!Index`
- `AI`
- `ATH`
- `commodity`
- `DRAM&`
- `Fintec`
- `MLCC`
- `Nuclear&Quan`
- `photons`
- `Power US Infra`
- `Rare earths`
- `Robotics`
- `Space`
- `Tier1 JP`

`Health` は空リストのため作成不要。

## リスト別 登録内容

### !Index

直接登録:

```text
FX.USDJPY
US.SPXL
US.TQQQ
JP.1475
JP.1329
JP.200A
US.SOXL
US.SOXS
US.CRAK
US.XLV
```

代替登録:

| TradingView | Moomoo 登録コード | 理由 |
|---|---|---|
| `VANTAGE:SP500` | `US.SPY` | S&P 500 ETFとして最も代表的 |
| `NASDAQ:NDX` | `US.QQQ` | Nasdaq 100連動ETF |
| `ICEUS:NYFANG` | `US.FNGS` | NYSE FANG+系の非レバレッジETN |
| `TSE:TOPIX` | `JP.1306` | TOPIX連動ETF |
| `TVC:NI225` | `JP.1321` | 日経225連動ETF |
| `OSE:NK2251!` | `JP.1321` | 日経225先物の代替としてETF |
| `KRX:KOSPI` | `US.EWY` | 韓国株ETF |
| `BINANCE:BTCUSD` | `CC.BTC` | BTC単体 |
| `TVC:GOLD` | `US.GLD` | 金ETFとして代表的 |
| `TVC:SILVER` | `US.SLV` | 銀ETFとして代表的 |
| `CAPITALCOM:COPPER` | `US.CPER` | 銅ETF |
| `NASDAQ:SOX` | `US.SMH` | 半導体ETF |
| `BLACKBULL:WTI` | `US.USO` | WTI原油ETF |
| `NYMEX:RB1!` | `US.UGA` | ガソリン先物の代替ETF |
| `CBOT:ZW1!` | `US.WEAT` | 小麦ETF |
| `TVC:VIX` | `US.VXX` | VIX短期先物ETN |
| `TVC:US10Y` | `US.IEF` | 7-10年米国債ETF。利回りとは逆方向になりやすい点に注意 |

除外:

```text
OSE:NKVI1!
TVC:JP10Y
```

### AI

直接登録:

```text
US.NVDA
US.GOOG
US.AAPL
US.MSFT
US.AMZN
US.SPCX
US.TSM
US.AVGO
US.TSLA
US.META
US.ASML
US.INTC
US.ORCL
US.AMD
US.ARM
US.NFLX
US.KLAC
US.PLTR
US.DELL
US.PANW
US.ANET
US.CRWD
US.APP
US.ISRG
US.SHOP
US.NET
US.DDOG
US.ALAB
US.CBRS
US.CRDO
US.DOCN
US.MOD
US.TEM
US.SPHR
US.ZETA
US.INOD
US.OKTA
US.TENB
US.RBRK
US.JMIA
US.NBIS
US.CRWV
US.IREN
US.CLSK
```

代替登録: なし

除外: なし

### ATH

直接登録:

```text
SH.688825
JP.285A
JP.4004
JP.6981
JP.6723
JP.4062
JP.6963
JP.6976
JP.3436
JP.278A
JP.7832
JP.5801
JP.5803
JP.5985
JP.6532
JP.3697
JP.7014
JP.6862
JP.7003
JP.7974
JP.8136
US.AVGO
US.AMAT
US.LLY
US.MU
US.INTC
US.ABBV
US.UNH
US.KLAC
US.PANW
US.DELL
US.SNDK
US.STX
US.CRWD
US.WDC
US.MRVL
US.FTNT
US.DDOG
US.ALAB
US.NBIS
US.HUM
US.CRDO
US.RPRX
US.CNC
US.DOCN
US.SIMO
US.DRAM
```

代替登録:

| TradingView | Moomoo 登録コード | 理由 |
|---|---|---|
| `KRX:005930` | `US.EWY` | Samsung本株の直接登録不可。韓国株ETFで代替 |
| `KRX:000660` | `US.SMH` | SK Hynixはメモリ/半導体テーマとしてSMHで代替 |

除外: なし

### commodity

直接登録:

```text
US.NEM
US.AU
US.WPM
US.PAAS
US.BHP
US.SCCO
US.CCJ
US.GDX
US.SIL
US.COPX
US.URA
JP.5016
JP.5713
JP.5706
JP.5711
JP.5714
JP.6278
JP.7826
```

代替登録: なし

除外: なし

### DRAM&

直接登録:

```text
JP.285A
US.MU
US.SNDK
US.LRCX
US.AMAT
US.STX
US.WDC
US.SIMO
US.MUU
US.MUD
US.EWY
```

代替登録:

| TradingView | Moomoo 登録コード | 理由 |
|---|---|---|
| `KRX:005930` | `US.EWY` | Samsung本株の直接登録不可。韓国株ETFで代替 |
| `KRX:000660` | `US.SMH` | SK Hynixはメモリ/半導体テーマとしてSMHで代替 |

除外: なし

### Fintec

直接登録:

```text
JP.8306
JP.8316
US.HOOD
US.SOFI
US.PAYP
JP.3350
US.MSTR
US.CRCL
US.CIFR
US.RIOT
US.MARA
US.VTR
```

代替登録: なし

除外: なし

### MLCC

直接登録:

```text
JP.6981
JP.6762
JP.6971
JP.6976
JP.5331
JP.3101
JP.4078
JP.4092
JP.4027
JP.5367
JP.4100
```

代替登録: なし

除外: なし

### Nuclear&Quan

直接登録:

```text
US.OKLO
US.SMR
US.NNE
US.LTBR
US.IBM
US.IONQ
US.RGTI
US.INFQ
US.LAES
US.ARQQ
JP.3687
```

代替登録: なし

除外: なし

### photons

直接登録:

```text
US.MRVL
US.GLW
US.ASX
US.COHR
US.LITE
US.CIEN
US.FIX
US.TER
US.KEYS
US.MTSI
US.TSEM
US.FN
US.SITM
US.AAOI
US.VICR
US.VIAV
US.FORM
US.AXTI
US.AEHR
US.POET
JP.5802
JP.5803
JP.6971
JP.5801
JP.6965
JP.4980
JP.6754
JP.6777
JP.6834
JP.6613
JP.6741
JP.6941
JP.6961
```

代替登録: なし

除外:

```text
OMXSTO:SIVE
```

### Power US Infra

直接登録:

```text
US.TXN
US.GEV
US.VRT
US.BE
US.VICR
US.AEIS
US.APLD
US.VMI
US.POWL
US.VSH
US.XE
US.NVTS
US.AMSC
US.PLPC
```

代替登録: なし

除外: なし

### Rare earths

直接登録:

```text
US.MP
US.TMC
US.USAR
US.LAC
JP.6269
JP.6330
JP.5724
```

代替登録:

| TradingView | Moomoo 登録コード | 理由 |
|---|---|---|
| `ASX:LYC` | `AU.LYC` | Moomoo basicinfo で `AU.LYC` は返る。ただし名称が `Unknown stock.` のため、登録後にUI確認推奨 |

除外: なし

### Robotics

直接登録:

```text
US.TSLA
US.LMT
US.TER
US.LHX
US.ROK
US.SYM
US.CGNX
US.AVAV
US.MBLY
US.ONDS
US.OII
US.OUST
US.RCAT
US.AEVA
US.SERV
US.RR
US.PDYN
JP.6954
JP.6506
JP.6323
JP.6324
```

代替登録: なし

除外: なし

### Space

直接登録:

```text
US.RKLB
US.ASTS
US.PL
US.LUNR
US.RDW
US.SATL
US.FLY
US.SIDU
JP.9412
JP.290A
JP.186A
JP.464A
JP.9348
```

代替登録: なし

除外: なし

### Tier1 JP

直接登録:

```text
JP.8035
JP.9984
JP.7203
JP.9983
JP.6857
JP.6981
JP.6501
JP.6758
JP.8058
JP.8001
JP.4063
JP.7011
JP.9433
JP.6146
JP.6723
JP.7974
JP.8053
JP.6762
JP.4062
JP.6702
JP.2802
JP.6701
JP.6902
JP.6920
JP.6594
JP.7013
JP.1812
JP.6525
JP.6976
JP.7012
JP.3407
JP.6963
JP.6504
JP.9104
JP.8473
JP.3402
JP.9107
JP.5201
JP.8136
JP.7911
JP.4911
JP.4182
JP.3110
JP.4704
JP.5406
JP.6302
JP.268A
JP.3635
JP.4368
JP.7003
JP.6622
JP.6703
JP.4107
JP.485A
JP.4971
JP.9509
JP.6235
JP.6997
JP.6227
JP.2760
JP.6855
JP.6387
JP.3905
JP.6999
JP.4022
JP.6779
JP.5074
JP.6140
JP.5985
JP.3692
JP.7711
JP.7746
JP.6072
JP.7794
JP.6167
JP.6590
JP.4661
JP.7014
```

代替登録: なし

除外: なし

## 全体の除外リスト

代替が弱い、またはMoomooで意味の近い登録対象を決めにくいため除外する。

```text
OSE:NKVI1!
TVC:JP10Y
OMXSTO:SIVE
```

## 登録実行例

Python SDK の例:

```python
from moomoo import OpenQuoteContext, ModifyUserSecurityOp, RET_OK

quote_ctx = OpenQuoteContext(host="127.0.0.1", port=11111)
try:
    ret, data = quote_ctx.modify_user_security(
        "AI",
        ModifyUserSecurityOp.ADD,
        ["US.NVDA", "US.GOOG", "US.AAPL"],
    )
    if ret != RET_OK:
        raise RuntimeError(data)
finally:
    quote_ctx.close()
```

実行時は、1グループごとに30秒あたり10リクエスト以下になるように分割する。

## 推奨登録順

1. 空ではないカスタムグループをMoomoo側に作成する。
2. 各リストの「直接登録」を追加する。
3. 各リストの「代替登録」を追加する。
4. 登録後に `get_user_security(group_name)` で件数を確認する。
5. `!Index` は代替ETFが多いため、最後に目視確認する。

## 注意

- 同じMoomooコードが複数リストに出る場合は、各リストに重複して登録してよい。
- `US.IEF` は米10年利回りそのものではなく債券ETFなので、価格の向きが利回りと逆方向になりやすい。
- `US.VXX` はVIX指数そのものではなくVIX短期先物ETN。
- `US.FNGS` はNYSE FANG+指数そのものではなくETN。
- `AU.LYC` は basicinfo 上は存在するが、名称が `Unknown stock.` と返ったため、登録後にMoomoo UIで確認する。
- `SH.688825` は basicinfo では存在確認できたが、quote snapshot は権限不足になる可能性がある。ウォッチリスト登録自体とは別問題として扱う。
