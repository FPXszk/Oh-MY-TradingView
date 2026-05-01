# explain-forhuman

> **README を読んだあとに、night batch の流れを人間向けに補足する文書**です。  
> repo 全体の一次入口は `../README.md`、docs の地図は `DOCUMENTATION_SYSTEM.md` を見てください。

> この文書では、**GitHub Actions / self-hosted runner を入口にした night batch の流れ**を中心に説明します。  
> この repo 自体はローカル実行もできますが、ここでは **「GitHub の画面から backtest を流すと何が起きるか」** に絞って整理します。

## まず一言でいうと

この repo には、似た言葉が 3 つあります。

| 言葉 | ざっくり言うと | 置き場所 |
| --- | --- | --- |
| strategy preset | 人間向けには 1個の売買戦略。実行時は用途に応じて strategy catalog と live preset 一覧を使い分ける | `config/backtest/strategy-catalog.json` / `config/backtest/strategy-presets.json` |
| universe | 対象銘柄のリスト | `config/backtest/universes/current/*.json` |
| campaign | どの universe に対して、どの preset 群を、どの phase で回すかの実行定義 | `config/backtest/campaigns/current/*.json` |

**つまり campaign は「戦略そのもの」ではありません。**  
campaign は、**戦略群をどう回すか決める実行パッケージ**です。

---

## 用語の違い

### 1. strategy preset

これは **1個の戦略ロジック** です。  
たとえば「Donchian を 55/20 にする」「hard stop を 8% にする」など、売買ルールの中身がここに入っています。

- strategy 全体の正本: `config/backtest/strategy-catalog.json`
- live preset 一覧と common defaults: `config/backtest/strategy-presets.json`
- 例: `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`

人間向けには、**「戦略」= preset** と考えるのが一番わかりやすいです。

### 2. universe

これは **どの銘柄を対象にするかのリスト** です。

- 例:
  - `config/backtest/universes/current/next-long-run-us-12.json`
  - `config/backtest/universes/current/next-long-run-jp-12.json`
  - `config/backtest/universes/archive/long-run-us-100.json`
  - `config/backtest/universes/archive/long-run-jp-100.json`

たとえば `next-long-run-us-12.json` は、US の 12 銘柄を  
`winners / mature-range / defense-test` の 3 種類に分けて持っています。

### 3. campaign

これは **どの universe に対して、どの preset を、どの phase で回すか** を定義するファイルです。

- 例:
  - `config/backtest/campaigns/current/next-long-run-us-12x10.json`
  - `config/backtest/campaigns/current/next-long-run-jp-12x10.json`
  - `config/backtest/campaigns/archive/next-long-run-us-finetune-100x10.json`
  - `config/backtest/campaigns/archive/next-long-run-jp-finetune-100x10.json`

campaign には主に次が入っています。

- 使う universe 名
- 使う preset の ID 一覧
- 期間（例: `2000-01-01` → `2099-12-31`）
- phase（smoke / pilot / full）
- 実行設定（checkpoint 間隔など）

人間向けには、**「campaign = バックテスト案件」** と考えるとイメージしやすいです。

---

## GitHub の画面から workflow を実行したときの流れ

手動実行の入口はこれです。

- `.github/workflows/night-batch-self-hosted.yml`

この workflow は、`workflow_dispatch` で `config_path` を受け取ります。  
その既定値は今、次です。

- `config/night_batch/bundle-foreground-reuse-config.json`

流れを簡単に書くとこうなります。

1. GitHub Actions で `Night Batch Self Hosted` を手動実行する
2. workflow が `config_path` を受け取る
3. Windows の self-hosted runner 上で `scripts/windows/run-night-batch-self-hosted.cmd` が呼ばれる
4. その中で `python/night_batch.py` が config を読んで、bundle 実行を組み立てる
5. さらに `scripts/backtest/run-finetune-bundle.mjs` → `scripts/backtest/run-long-campaign.mjs` が動き、最終的に preset × symbol の各 backtest が走る

要するに、**GitHub の画面から押しても、途中でちゃんと campaign を読んで backtest まで進む配線**になっています。  
ただし前提として、**self-hosted Windows runner / TradingView / CDP 接続** が正常に生きている必要があります。

---

## 実際にどこのファイルが読まれるか

実行時は、おおむね次の順で設定が読まれます。

| 順番 | 読まれるもの | 役割 |
| --- | --- | --- |
| 1 | `.github/workflows/night-batch-self-hosted.yml` | GitHub Actions の入口 |
| 2 | `config/night_batch/bundle-foreground-reuse-config.json` | night batch 全体設定 |
| 3 | `config/backtest/campaigns/current/*.json` など | どの campaign を回すか |
| 4 | `config/backtest/universes/current/*.json` など | campaign が指す銘柄群 |
| 5 | `config/backtest/strategy-catalog.json` | campaign が解決する実行対象戦略の定義 |
| 6 | `config/backtest/strategy-presets.json` | 共通 default 値や補助設定 |

コード上でも、`src/core/campaign.js` の `loadCampaign()` は次の順で読んでいます。

1. campaign JSON を読む
2. universe JSON を読む
3. `strategy-catalog.json` から実行対象戦略を解決する
4. `strategy-presets.json` から common defaults を読む

つまり、**campaign が実行対象として引く戦略定義の正本は `config/backtest/strategy-catalog.json`** です。  
一方で `config/backtest/strategy-presets.json` も、**live preset 一覧** と **common defaults** を持つ実運用ファイルです。campaign は catalog 側の戦略定義と、presets 側の default 値を組み合わせて「どの銘柄群にどう回すか」を決めています。

---

## 今の workflow 既定値で何が走るのか

ここは実行前に一番大事です。

今、workflow の既定 `config_path` は

- `config/night_batch/bundle-foreground-reuse-config.json`

で、その中身は今

- `us_campaign: next-long-run-us-12x10`
- `jp_campaign: next-long-run-jp-12x10`

です。

**つまり、GitHub 画面から何も変えずに今の workflow を実行すると、既定で走るのは 12×10 です。**

12×10 の campaign 定義は以下です。

- `config/backtest/campaigns/current/next-long-run-us-12x10.json`
- `config/backtest/campaigns/current/next-long-run-jp-12x10.json`

そしてその対象 universe は以下です。

- `config/backtest/universes/current/next-long-run-us-12.json`
- `config/backtest/universes/current/next-long-run-jp-12.json`

> 旧既定の fine-tune 100×10 campaign（`next-long-run-us-finetune-100x10` / `next-long-run-jp-finetune-100x10`）は `config/backtest/campaigns/archive/` に残っています。  
> これを night batch で流したい場合は、**既存の bundle config の campaign ID を差し替える** か、**その campaign ID を指す `config/night_batch/*.json` を別途用意して** `config_path` にその file を指定します。

---

## config の 2 層構造 ― night_batch と backtest

設定ファイルは **2 つの層** に分かれています。混同しやすいので整理します。

| 層 | ディレクトリ | 役割 |
| --- | --- | --- |
| **night-batch エントリ層** | `config/night_batch/` | night batch 固有の起動設定。どの campaign を組み合わせて回すか（bundle 定義）を決める。workflow_dispatch の既定値はここを指す |
| **共有実行定義層** | `config/backtest/` | campaign / universe / strategy catalog / live preset など、実際の戦略・銘柄・実行パラメータの定義。night batch とローカル手動実行の **両方** から読まれる |

つまり、`config/night_batch/` は **night batch 専用の入口設定** であり、`config/backtest/` は **night batch にもローカル手動実行にも共有される定義** です。

---

## よくある質問

### Q1. night batch には専用の設定ファイルがあるの？

**はい。** `config/night_batch/` ディレクトリに night batch 専用の bundle 設定があります。

workflow_dispatch の既定 config は

```
config/night_batch/bundle-foreground-reuse-config.json
```

で、この中で `us_campaign=next-long-run-us-12x10`、`jp_campaign=next-long-run-jp-12x10` が指定されています。

ただし、この bundle config が **参照する先**（campaign / universe / strategy catalog / live preset）は `config/backtest/` 以下にあり、手動実行と共有されています。

### Q2. ローカルで手動で戦略や campaign を切り替えて実行したら、night batch にも影響する？

**手動コマンドを実行するだけで、nightly workflow が参照する campaign 指定そのものは変わりません。**

night batch が何を実行するかは、以下の 2 つで決まります。

1. **night-batch config 自体を書き換えた場合** ― `config/night_batch/bundle-foreground-reuse-config.json` の `us_campaign` / `jp_campaign` を別の campaign ID に変更すると、次回の nightly 実行から変わります
2. **night-batch config が参照している共有定義を編集した場合** ― たとえば `config/backtest/campaigns/current/next-long-run-us-12x10.json` の中身（対象 preset や universe）を変えると、night batch もその変更を読みます

逆に、**別の campaign ID を指定してローカルで手動実行しただけ**なら、night-batch config は何も変わっていないので、nightly workflow には一切影響しません。

ただし例外として、**同じ night-batch config を使って `python3 python/night_batch.py smoke-prod ...` を手動実行した場合**は、`artifacts/night-batch/round*` や関連 checkpoint / manifest が更新されます。  
そのため、**次回 nightly が「何を回すか」ではなく「どこから再開するか」** には影響することがあります。

### Q3. config/backtest は手動実行専用？ night batch と共有されている？

**共有されています。**

`config/backtest/` 以下の campaign / universe / strategy catalog / live preset は、night batch からもローカル手動実行からも読まれます。  
night batch 専用なのは `config/night_batch/` のエントリ層だけです。

`loadCampaign()` は実行元（night batch / ローカル）に関係なく、同じ手順で設定を解決します。

1. campaign JSON を読む
2. campaign が指す universe JSON を読む
3. `strategy-catalog.json` から実行可能な戦略を解決する
4. `strategy-presets.json` から live preset 情報と common defaults を使う

### Q4. 手動で対象を切り替えて実行するにはどうすればいい？

以下は **repo root で実行する前提** の手順です。  
まず最初に、**「手動で試したいだけ」なのか、「night batch の対象自体を変えたい」のか** を分けて考えるのが大事です。

#### まず今の night batch 対象を確認する

```bash
rg -n '"us_campaign"|"jp_campaign"|"smoke_phases"|"production_phases"' config/night_batch/bundle-foreground-reuse-config.json
```

次に、実際にその campaign が何を回すかを見たいなら campaign 定義を確認します。

```bash
rg -n '"universe"|"preset_ids"' config/backtest/campaigns/current/next-long-run-us-12x10.json
rg -n '"universe"|"preset_ids"' config/backtest/campaigns/current/next-long-run-jp-12x10.json
```

#### 手順 1: 手動で試すだけなら、night-batch config は触らない

この場合は `config/night_batch/` を編集せず、下のコマンドを直接打てば十分です。  
**これだけなら nightly workflow の対象 campaign は変わりません。**

以下の 4 パターンがあります。目的に合わせて選んでください。

#### パターン A: 単一 campaign を手動実行

```bash
node scripts/backtest/run-long-campaign.mjs <campaignId> --phase <phase> [--host <host> --ports <ports>]
```

例:
```bash
node scripts/backtest/run-long-campaign.mjs next-long-run-us-12x10 --phase smoke
```

#### パターン B: bundle（US + JP をまとめて）実行

```bash
node scripts/backtest/run-finetune-bundle.mjs --us-campaign <us_campaign> --jp-campaign <jp_campaign> --phases <phases>
```

例:
```bash
node scripts/backtest/run-finetune-bundle.mjs --us-campaign next-long-run-us-12x10 --jp-campaign next-long-run-jp-12x10 --phases smoke
```

#### パターン C: 単一 preset × 銘柄で試す

```bash
node src/cli/index.js backtest preset <preset-id> --symbol <SYM> [--date-from <YYYY-MM-DD> --date-to <YYYY-MM-DD>]
```

例:
```bash
node src/cli/index.js backtest preset donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight --symbol AAPL
```

#### パターン D: night batch と同等の処理をローカルで実行

```bash
python3 python/night_batch.py smoke-prod --config config/night_batch/<file>.json --round-mode <mode>
```

例:
```bash
python3 python/night_batch.py smoke-prod --config config/night_batch/bundle-foreground-reuse-config.json --round-mode advance-next-round
```

`--round-mode` は今の実装では次の 2 つです。

- `advance-next-round`: 新しい round を作って走らせる
- `resume-current-round`: 直近 round を再利用して続きから走らせる

> `python/night_batch.py` は `smoke-prod` 以外にも `bundle`, `campaign`, `nightly`, `recover`, `report`, `archive-rounds` などのサブコマンドを持っています。

#### 手順 2: night batch の対象自体を変えたい場合

nightly workflow で走る内容を変えたいなら、次のどちらかです。

1. `config/night_batch/bundle-foreground-reuse-config.json` の `us_campaign` / `jp_campaign` を別の campaign ID に変える
2. その config が参照している `config/backtest/campaigns/...` の中身（`preset_ids` や `universe`）を変える

より安全なのは、**既定 config を直接上書きするのではなく、`config/night_batch/` に別 config を作って明示指定する** やり方です。

たとえば:

1. `config/backtest/campaigns/` 側で、使いたい campaign ID を用意する
2. `config/night_batch/` に、その campaign ID を指す bundle config を作る
3. ローカルなら次で実行する

```bash
python3 python/night_batch.py smoke-prod --config config/night_batch/<new-config>.json --round-mode advance-next-round
```

4. GitHub Actions から流すなら、`Night Batch Self Hosted` の `config_path` にその config を指定する

#### 手順 3: 元に戻すときの考え方

- **手動実行だけ**なら、何も戻すものはありません。night batch 側は変わっていません。
- **night batch 用 config や共有 campaign 定義を編集した**なら、そのファイルを元に戻さない限り次回 nightly にも反映されます。

#### 重要な注意

- **上記の手動コマンドを実行しても、nightly workflow が参照する campaign 指定自体は変わりません。**
- ただし **`smoke-prod` を同じ night-batch config で実行すると、`artifacts/night-batch/round*` の状態が更新され、次回 nightly の再開位置に影響することがあります。**
- nightly の実行内容を変えたい場合は、`config/night_batch/bundle-foreground-reuse-config.json` の campaign 指定を編集するか、そこから参照されている `config/backtest/` 以下の共有定義を編集してください。

---

## 人間向けドキュメントはどこを見るべきか

この repo には説明がいくつかありますが、役割が少し違います。

| ファイル | 役割 |
| --- | --- |
| `../README.md` | repo 全体の入口 |
| `docs/research/current/README.md` | 今の current 世代の研究・handoff の入口 |
| `docs/research/current/main-backtest-current-summary.md` | 最新 main backtest の要約 |
| `docs/research/strategy/README.md` | 戦略・銘柄を人間向けに整理した入口 |
| `docs/research/strategy/theme-momentum-definition.md` | テーマ投資で「モメンタムのある銘柄」をどう判断するかの安定参照先 |
| `docs/reports/README.md` | incident / postmortem archive |
| `docs/research/archive/next-long-run-us-jp-12x10-handoff_20260414_0009.md` | 12×10 の過去 handoff 要点まとめ |
| `docs/research/archive/next-long-run-us-jp-12x10-details_20260414_0009.md` | 12×10 の過去選定理由の詳細 |
| `docs/explain-forhuman.md` | 非エンジニア向けの最短説明 |

この `docs/explain-forhuman.md` は、**README を読んだあとに全体像をつかむための補助文書**です。  
細かい正本は、必ず上の元ファイル側を見てください。

---

## 実行前に読む最短ルート

時間をかけずに理解したいなら、次の順番がおすすめです。

1. **`../README.md`**  
   - 実際の入口と運用コマンドを確認する
2. **この `docs/explain-forhuman.md`**  
   - 用語と全体像をつかむ
3. **`docs/research/current/main-backtest-current-summary.md`**  
   - 最新の勝ち筋と注意点を最短で確認する
4. **`docs/research/archive/next-long-run-us-jp-12x10-handoff_20260414_0009.md`**  
   - 12×10 世代の handoff を後から追う
5. **`docs/research/archive/next-long-run-us-jp-12x10-details_20260414_0009.md`**  
   - 12×10 世代の 10戦略 / 12銘柄の選定理由を確認する
6. **`docs/research/strategy/README.md`**  
   - 実際にどの戦略・銘柄を見ているかを確認する
7. **`docs/research/strategy/theme-momentum-definition.md`**  
   - テーマ投資で「モメンタムのある銘柄」をどう定義していたかを確認する
8. **`.github/workflows/night-batch-self-hosted.yml`**  
   - 実際にどう起動するかを確認する

---

## 実行前の注意点

### 1. `current` と「最新 artifact」は別物

この repo では、少なくとも次の 2 つを分けて読む必要があります。

- current handoff generation = 今いちばん新しく説明している docs 世代（現在は **12×10**）
- current main backtest summary = 利用可能な最新 main artifact から再生成した summary（2026-04-15 時点では **finetune 100×10 smoke artifact**）

workflow 既定値は今 **12×10** ですが、main backtest summary の入力 artifact と常に同一とは限りません。

### 2. 正本は説明文ではなく、workflow / config / source

この文書はわかりやすくするための要約です。  
実際に何が動くかの正本は次です。

- workflow: `.github/workflows/night-batch-self-hosted.yml`
- night batch config: `config/night_batch/*.json`
- campaign: `config/backtest/campaigns/current/*.json`
- universe: `config/backtest/universes/current/*.json`
- strategy catalog / lifecycle source: `config/backtest/strategy-catalog.json`
- live preset list / common defaults: `config/backtest/strategy-presets.json`

### 3. 実行できるかどうかは runner 側の状態にも依存する

GitHub の画面から押せても、以下が死んでいると backtest は進みません。

- self-hosted Windows runner
- TradingView アプリ
- CDP 接続（9222 / 9223 周辺）

---

## 最後に

この repo を理解するときは、次の 1 行だけ覚えておけば十分です。

> **strategy catalog が実行対象戦略の正本、universe が銘柄群、campaign がその組み合わせ方、workflow はそれを夜間実行する入口。**

もし次に **別の campaign を GitHub 画面から実行したい場合**は、`workflow_dispatch` の `config_path` に別の config を指定するか、新しい bundle config を作成します。

---

## TradingView スクリーナー機能について

この repo には、TradingView の内部スキャナー API を利用したスクリーニング機能があります。  
backtest とは異なり、**CDP 不要・認証不要**で動作します。

### TradingView Scanner API とは

TradingView の Screener ページが内部で使っている HTTP エンドポイントです。

- **URL**: `POST https://scanner.tradingview.com/{market}/scan`
- **認証**: 遅延データは不要（ライブ/ストリームは cookies 必要）
- **対応市場**: `america` / `crypto` / `forex` / `global` 等
- **フィールド数**: 3,000+ （RSI / SMA / 時価総額 / 出来高 / MACD / 52週高値 等）

> これは **非公式 API** です。フィールド名変更・エンドポイント廃止のリスクがあります。

### ミネルビニ7条件スクリーナー

マーク・ミネルビニが提唱するモメンタム銘柄の選定条件をそのまま実装したスクリーナーです。

```bash
tv screener minervini           # 上位50件
tv screener minervini --limit 20
tv screener minervini --compact   # シンボルと価格のみ
```

| 条件 | 内容 |
|---|---|
| 市場 | 米国株のみ |
| RSI(14) | 60 以上 |
| 時価総額 | 10億ドル以上 |
| 直近出来高 | 平均の1.2倍以上 |
| 現在値 | 200日移動平均線より上 |
| 現在値 | 50日移動平均線より上 |
| 現在値 | 52週高値の75%以上 |

### CDP vs スキャナー API の使い分け

| 機能 | 手段 | CDP 必要? |
|---|---|---|
| ミネルビニスクリーニング | TradingView Scanner API | 不要 |
| quote / 指標取得 | Yahoo Finance API | 不要 |
| チャートのスクリーンショット | CDP | 必要 |
| バックテスト | CDP + Strategy Tester | 必要 |
| Pine スクリプト編集 | CDP + Pine エディタ | 必要 |

> スクリーニングは外部 API のみで完結します。backtest は CDP が必須です。

調査結果をまとめます：

---

## Scanner API 応用可能性の調査結果

### ✅ 現時点のデータ（今できること）

**セクターパフォーマンス集計が実際に動いた例（上の実行結果）:**
- `sector` / `industry` フィールドで絞り込み・集計可能
- `Perf.W` / `Perf.1M` / `Perf.3M` / `Perf.6M` / `Perf.Y` で期間別パフォーマンス取得可能
- 上位1000銘柄の3M平均パフォーマンスをセクター別に集計できた

**取得できる財務情報（確認済み）:**

| フィールド | 内容 |
|---|---|
| `sector` / `industry` | セクター・業種 |
| `price_earnings_ttm` | PER（TTM） |
| `price_book_fq` | PBR |
| `return_on_equity` | ROE |
| `earnings_per_share_diluted_ttm` | EPS |
| `dividends_yield_current` | 配当利回り |
| `Perf.W/1M/3M/6M/Y` | 期間別リターン |

**取得できないフィールド（エラーになった）:**
- `gross_profit_margin_ttm` / `current_ratio_annual` など（命名規則が違うと思われる）

---

### ❌ 過去時点のデータ（できないこと）

**「3ヶ月前にどのセクターが熱かったか」は Scanner API では不可能です。**
Scanner API は常に「今」のスナップショットしか返しません。

過去時点のセクター分析には CDP 経由でチャートデータを取得するか、外部の株価 API（yfinance 等）が必要です。

---

### 実現可能な応用例

| 応用 | 実現可能? | 概要 |
|---|---|---|
| セクター別強さランキング（現在） | ✅ | sector × Perf.3M 集計で即座に実現可能 |
| ファンダメンタルスクリーナー（PER/ROE/EPS） | ✅ | フィールド確認済み |
| モメンタム×財務品質スクリーナー | ✅ | RSI + ROE + EPS 組み合わせ |
| 業種内トップ銘柄フィルタ | ✅ | `sector=XX` filter + Perf.3M sort |
| 過去時点のセクターの盛り上がり | ❌ | Scanner API は現時点のみ |
| バックテスト形式での検証 | ❌ | CDP + TV Desktop が必要 |

---

実装したいものがあれば言ってください。特に「**セクター別強さランキング**」は今すぐ実装できる状態です。

---

## 次回バックテスト戦略設計メモ（2026-05-01）

> この章は **run79（ema-breakout-winrate-stopout-us40-50pack）の結果を踏まえた次の 50 戦略の設計メモ**です。  
> 人間向けに、各戦略が「何を試しているのか」「なぜその設計なのか」をまとめています。

---

### 前提と目標

| 項目 | 内容 |
|---|---|
| ベース戦略 | EMA(9/20) + MACD(12/26/9) + RSI(14)。どれか 1 本がクロスし、他 2 本が方向一致で買いエントリー |
| 現在の問題 | 騙しシグナルが多く、上位戦略でも勝率が 8〜17% 程度と低い |
| 目標勝率 | **約 35%**（現在の約 2〜3 倍に引き上げる） |
| 方針 | 利益最大化も捨てない。**攻撃的な性格を維持しながら、騙しに引っかかる頻度を下げる** |

**核心的なトレードオフ**：  
- 厳しい入場条件 → 取引数が減り、勝率は下がるがPF（利益効率）は上がる  
- 広いストップ → 切られにくくなり勝率は上がるが、PFが下がりやすい  
- **35% 勝率 + PF ≥ 1.7 の両立**が今回の設計目標

**run79 から見えた 3 つの課題**：

1. **volume confirm の閾値感度** — rank1（×1.0）と rank4（×1.5）で PF が逆転。最適点が 1.0〜1.5 の間にある可能性
2. **stop 拡大系の除外基準** — ATR/swinglow 系は win_rate が 32〜36% に達するが PF < 1.5 で除外候補。どこで線を引くか？
3. **stop-until 系（rank 8〜9）の継続観察** — breakout-high / plus2pct はPF 2.5〜2.6 で安定しているが、まだ 1 run のみ

---

### Group A｜Volume確認フィルタの閾値感度 9戦略

**目的**：run79 で rank1（volume20×1.0、PF=2.72）と rank4（volume20×1.5、PF=3.70）のPF逆転を確認した。  
最適な閾値が 1.0〜1.5 の間にあるはず。1.0 から 2.0 まで 9 段階で検証する。

| # | preset ID 候補 | volume 閾値 | 概要 | 狙い |
|---|---|---|---|---|
| A1 | `emr-next-vol20x05` | 20日平均×0.5 | ほぼフィルタなし（50%以上ならOK） | フィルタ無しとの比較基準 |
| A2 | `emr-next-vol20x08` | 20日平均×0.8 | 平均の 80% 以上 | やや緩め |
| A3 | `emr-next-vol20x10` | 20日平均×1.0 | **run79 rank1 の再確認** | 現状ベースライン確認 |
| A4 | `emr-next-vol20x11` | 20日平均×1.1 | 平均の 10% 超え | 最適点探索（序盤） |
| A5 | `emr-next-vol20x12` | 20日平均×1.2 | 平均の 20% 超え | 最適点探索（中盤） |
| A6 | `emr-next-vol20x13` | 20日平均×1.3 | 平均の 30% 超え | 最適点探索（中盤） |
| A7 | `emr-next-vol20x14` | 20日平均×1.4 | 平均の 40% 超え | 最適点探索（終盤） |
| A8 | `emr-next-vol20x15` | 20日平均×1.5 | **run79 rank4 の再確認** | 現状 rank4 ベースライン確認 |
| A9 | `emr-next-vol20x20` | 20日平均×2.0 | 平均の 2 倍を超えた爆発的な出来高のみ | 超厳格フィルタ、PF上限の確認 |

> **読み方の例**：A5（×1.2）が A3（×1.0）より PF が高くなれば、最適点は 1.2 以上にある。  
> A5 と A8 の中間に PF ピークがあれば 1.3 or 1.4 が最適候補。

---

### Group B｜stop-until 系の深掘り 8戦略

**目的**：rank8（stop-until-breakout-high、PF=2.65）と rank9（stop-until-plus2pct、PF=2.59）は  
entry confirm 系ではなく「一定条件が揃うまでストップを動かさない」stop 操作系のバリアント。  
run79 の 1 run だけでは判断できないため、パラメータ範囲を広げて再検証する。

| # | preset ID 候補 | stop-until 条件 | 概要 | 狙い |
|---|---|---|---|---|
| B1 | `emr-next-stop-until-bkhigh` | ブレイクアウト高値更新まで | **rank8 の再確認** | 2 run 目で安定性を確かめる |
| B2 | `emr-next-stop-until-plus1pct` | +1% に達するまで | rank9（+2%）より早期に移動 | 閾値を狭めた版 |
| B3 | `emr-next-stop-until-plus2pct` | +2% に達するまで | **rank9 の再確認** | 2 run 目で安定性を確かめる |
| B4 | `emr-next-stop-until-plus3pct` | +3% に達するまで | rank9 より引き延ばし | 許容範囲の上限確認 |
| B5 | `emr-next-stop-until-plus4pct` | +4% に達するまで | さらに引き延ばし | 過剰にストップを動かさない場合の影響 |
| B6 | `emr-next-stop-until-bkhigh-vol10` | ブレイクアウト高値 + volume×1.0 | rank8 + volume 確認フィルタを組み合わせ | エントリー精度を上げた版 |
| B7 | `emr-next-stop-until-plus2-vol10` | +2% + volume×1.0 | rank9 + volume 確認フィルタを組み合わせ | エントリー精度を上げた版 |
| B8 | `emr-next-stop-until-plus2-rsi60` | +2% + RSI > 60 でのみ入場 | rank9 + RSI レベルフィルタ | モメンタムが強い局面に絞る |

> **判断基準**：2 run 連続で rank 10 以内・PF ≥ 2.5 なら採用候補に格上げ。

---

### Group C｜stop 拡大系バリアントの除外基準確認 8戦略

**目的**：run79 の rank28〜37（ATR stop、swinglow stop 系）は勝率が 32〜36% に達するものの、  
PF < 1.5 or DD > 7,000 で除外候補となった。  
「どのストップ幅ならPFが許容ライン（1.7以上）を保ちながら勝率35%に近づけるか」を検証する。

| # | preset ID 候補 | ストップ設定 | 概要 | 狙い |
|---|---|---|---|---|
| C1 | `emr-next-stop-fixed10pct` | 固定 -10%（現行 -8%より緩め） | 切られにくくして勝率向上を確認 | 最小限の緩和で勝率がどう変わるか |
| C2 | `emr-next-stop-fixed12pct` | 固定 -12% | さらに緩め | PF と勝率のトレードオフを測定 |
| C3 | `emr-next-stop-fixed15pct` | 固定 -15% | 大幅に緩め | stop-swinglow の勝率36%に近づくか確認 |
| C4 | `emr-next-stop-atr15x` | 1.5倍 ATR | 価格変動に応じた動的ストップ（小さめ） | ATR 系の最軽量版 |
| C5 | `emr-next-stop-atr20x` | 2.0倍 ATR | run79 除外候補の再評価（絞り込み版） | run79 atr20-grace5 との比較 |
| C6 | `emr-next-stop-atr25x` | 2.5倍 ATR | 大きめ ATR ストップ | DD が 7,000 を超えるかどうかの境界線確認 |
| C7 | `emr-next-stop-swinglow-2bar` | 直近 2 本のスイングロー | 反応速度の高い自然なストップ | swinglow-atr05 より DD を抑えられるか |
| C8 | `emr-next-stop-swinglow-5bar` | 直近 5 本のスイングロー | やや長い目でスイングを計測 | run79 swinglow-atr05 との比較対象 |

> **除外の線引き**：PF < 1.5 or avg_max_drawdown > 7,000 は即除外。  
> PF 1.5〜1.7 / DD 5,000〜7,000 は「許容ライン」として継続観察候補。

---

### Group D｜エントリー精度向上・騙し対策 10戦略

**目的**：現状の問題の根本。「EMA or MACD or RSI のクロス 1 本 + 他 2 本が方向一致」という緩い条件が、  
トレンドの転換点ではない場所でも多数エントリーしてしまっている。  
追加フィルタで「本当に動き出した局面」だけに絞り込む。

| # | preset ID 候補 | 追加フィルタ | 概要 | 狙い |
|---|---|---|---|---|
| D1 | `emr-next-entry-all3-crossover` | 3 本同時クロス必須 | EMA・MACD・RSI のすべてが同時にクロスした瞬間だけ入場 | 超厳格フィルタ、取引数は激減するが騙しをほぼ排除 |
| D2 | `emr-next-entry-ema200-above` | 株価が EMA(200) より上 | 長期トレンドが上向きの銘柄に限定 | 下降トレンド中の逆張りシグナルを除去 |
| D3 | `emr-next-entry-ema50-200-stack` | EMA50 > EMA200 | 中長期トレンドの方向一致を確認 | 「上昇傾向の株だけに乗る」ことを徹底 |
| D4 | `emr-next-entry-rsi55` | RSI > 55 が必須 | RSI が 55 を超えているときだけ入場（現行は EMA 超えのみ） | 弱いモメンタムのシグナルを除去 |
| D5 | `emr-next-entry-rsi60` | RSI > 60 が必須 | RSI 60 超えに絞る。run79 rank6 の再確認も兼ねる | さらに厳格なモメンタム確認 |
| D6 | `emr-next-entry-macd-hist-grow` | MACD ヒストグラムが正かつ拡大中 | MACD が強まっているときだけ入場 | 勢いのある局面に限定 |
| D7 | `emr-next-entry-prev-high-break` | 前日高値を終値で上回る | 「高値更新を確認してから入場」 | run79 rank3（20d-high confirm）を短期化した版 |
| D8 | `emr-next-entry-2bar-confirm` | シグナル後 1 本待ってから入場 | シグナルバーの翌足で確認 | run79 rank20（delay-1bar）の再確認 |
| D9 | `emr-next-entry-rsi-slope-up` | RSI の EMA が上向き | RSI が勢いよく上がっているときだけ入場 | ゆっくり上がる RSI を除外 |
| D10 | `emr-next-entry-adx-above20` | ADX > 20（トレンド強度） | トレンドが明確に発生しているときだけ入場 | レンジ相場での騙しシグナルを大幅削減 |

---

### Group E｜出口最適化・勝率の底上げ 8戦略

**目的**：エントリー条件を厳しくするだけでは勝率が下がる。  
「小さな利確を早めに取る（TP）＋残りをトレールで伸ばす」という分割出口は、  
勝率を上げながら利益最大化も維持できる可能性がある。

| # | preset ID 候補 | 出口設計 | 概要 | 狙い |
|---|---|---|---|---|
| E1 | `emr-next-exit-trail3pct-from3` | +3% から 3% トレール | 小さく利益が出たらすぐトレール開始 | 勝率を上げながら早期損切りを防ぐ |
| E2 | `emr-next-exit-trail5pct-from5` | +5% から 5% トレール | ある程度伸びてからトレール | run79 rank10 系列の改善版 |
| E3 | `emr-next-exit-half-tp5-trail5` | +5% で半分利確 + 残り 5% トレール | 分割出口の最小構成 | 最初の半分を早期に回収して心理的安定 |
| E4 | `emr-next-exit-half-tp8-trail-atr` | +8% で半分利確 + 残りを ATR トレール | run79 rank14（exit-half-tp8-ema20）の ATR 版 | EMA ではなく ATR でトレールする比較 |
| E5 | `emr-next-exit-half-tp10-trail8` | +10% で半分利確 + 残り 8% トレール | やや大きめの TP を設定 | run79 rank14 のTP拡大版 |
| E6 | `emr-next-exit-chandelier-3atr` | 最高値 - 3×ATR のシャンデリアエグジット | 高値から大きく離れたら利確 | 大きな上昇トレンドに乗り続けるための出口 |
| E7 | `emr-next-exit-ema20-after5` | +5% 到達後、EMA20 を下回ったら出口 | run79 rank14・16 系の確認 | EMA 系トレール出口の最適点を探る |
| E8 | `emr-next-exit-rsi-bear-after8` | +8% 後に RSI が RSI-EMA を下回ったら出口 | RSI が弱くなったら手仕舞い | run79 rank42（exit-rsi-loss55-after-plus8）の validation-error 解決版 |

---

### Group F｜複合改善・勝率×PF 両立を狙う 7戦略

**目的**：上記 A〜E 各グループで有効なものを組み合わせる。  
「厳しいエントリー + 賢いストップ + 分割出口」の組み合わせで  
**勝率 35% + PF ≥ 1.7** の同時達成を狙う。

| # | preset ID 候補 | 組み合わせ | 概要 | 狙い |
|---|---|---|---|---|
| F1 | `emr-next-combo-vol12-bkhigh` | volume×1.2 + stop-until-breakout-high | 出来高 20% 超えの日だけ入場 + ブレイクアウト高値まで stop を動かさない | A5 + B1 の合わせ技。PF向上と勝率向上の両立 |
| F2 | `emr-next-combo-vol12-plus2` | volume×1.2 + stop-until-plus2pct | 出来高 20% 超え + +2% まで stop を保持 | A5 + B3 の合わせ技 |
| F3 | `emr-next-combo-20dhigh-vol10-trail5` | 20日高値更新確認 + volume×1.0 + +5% トレール | run79 上位の entry confirm に出口最適化を追加 | run79 rank3（close-above-20d-high）＋出口改善 |
| F4 | `emr-next-combo-ema200-vol12-stop12` | EMA200 上 + volume×1.2 + 固定 -12% stop | 長期上昇トレンド + 出来高確認 + 広めの stop | D2 + A5 + C2 の合わせ技。stop を広げて勝率 35% 狙い |
| F5 | `emr-next-combo-rsi60-vol10-bkhigh` | RSI>60 + volume×1.0 + stop-until-breakout-high | 強いモメンタム確認 + ストップを守る | D5 + A3 + B1 の合わせ技 |
| F6 | `emr-next-combo-ema200-rsi55-trail5` | EMA200 上 + RSI>55 + +3% からトレール | トレンド方向確認 + モメンタム確認 + 早めのトレール | D2 + D4 + E1 の合わせ技 |
| F7 | `emr-next-combo-ultimate` | EMA200 上 + 20日高値更新 + volume×1.2 + stop-until-plus2 | 使える条件をフルに組み合わせた最厳格版 | 取引数は激減するが PF 最大化を狙う。除外基準の上限確認 |

---

### 50 戦略の全体サマリー

| グループ | 戦略数 | 主な目的 | 勝率へのアプローチ |
|---|---|---|---|
| A: volume 閾値感度 | 9 | 最適な出来高フィルタ閾値の特定 | 取引品質の向上 |
| B: stop-until 深掘り | 8 | rank8〜9 の安定性確認とパラメータ探索 | stop を守ることで不意の損切りを防ぐ |
| C: stop 拡大系の除外基準 | 8 | PF と DD の境界線を明確化 | ストップを広げて切られにくくする |
| D: エントリー精度向上 | 10 | 騙しシグナルの削減 | 精度を上げて負けトレードを減らす |
| E: 出口最適化 | 8 | 勝率の底上げ | 分割利確で小さな勝ちを積み上げる |
| F: 複合改善 | 7 | 35% 勝率 + PF ≥ 1.7 の両立 | 各グループのベストを組み合わせる |
| **合計** | **50** | | |

---

### 優先順位と観察ポイント

1. **最初に見るべき**：Group B（stop-until 再確認）と Group A（volume 最適閾値）  
   → run79 の上位戦略の再現性があるかを 2 run 目で確認する

2. **次に見るべき**：Group F（複合改善）の F1・F2・F3  
   → 35% 勝率 + PF ≥ 1.7 の両立が実現できているかを確認

3. **除外確認**：Group C で ATR 系・swinglow 系が PF < 1.5 に固まるなら除外確定  
   → 固定 stop 幅（C1〜C3）が 35% 勝率に近づけるならその幅が採用ライン

4. **騙し対策の効果確認**：Group D の D2（EMA200）と D5（RSI60）を優先  
   → run79 の rank6（rsi60-price-above-ema200）が再現するか確認

> **35% 勝率は stop を広げるだけでは達成できない**（PFが崩れる）。  
> エントリー精度を上げながら stop を適切に配置し、分割出口で勝ちカウントを増やすことが現実的な道。
