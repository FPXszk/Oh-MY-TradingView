---
name: trade-decision-gate
description: "購入、追加購入、保有継続、売却、利確、損切り、決算跨ぎ、ポジション縮小、ポートフォリオリスクについて、ティッカー、チャート画像、保有画像、ポートフォリオ画像、ポジション情報から具体的な判断を求められたときに使用する。"
---

# trade-decision-gate

このスキルは、売買判断とポートフォリオリスク判断のための上位 gate です。新しい売買戦略、チャート認識エンジン、MCP tool、CLI command、注文 routing、自動売買 flow は作りません。

ユーザーが次のような具体的な判断を求めたときに使用します。

- 「この銘柄は今買うべき？」
- 「今から入っていい？」
- 「この位置はエントリーポイント？」
- 「追加購入していい？」
- 「買い増ししていい？」
- 「ナンピンした方がいい？」
- 「今持っているけどどうしたらいい？」
- 「含み損だけどまだ持つべき？」
- 「売った方がいい？」
- 「利確した方がいい？」
- 「決算を跨いでいい？」
- 「現金比率が少なすぎる？」
- 「ポジションを持ちすぎている？」
- 「このポートフォリオのリスクは高すぎる？」
- 「同一テーマへ偏りすぎている？」
- 「どのポジションを減らすべき？」

入力は、ティッカーだけ、会社名、自然文の質問、チャート画像、保有画像、ポートフォリオ画像、複数銘柄一覧、平均取得価格・数量・現在値・損益を含むポジション情報を対象にします。

## 起動対象外

次の依頼だけの場合は、このスキルを使いません。

- 会社概要だけの説明
- PER、EPS、ATR などの用語説明
- 株価上昇理由だけの調査
- Pine Script 作成
- screener 実装変更
- backtest 分析
- Dr.K 戦略の一般的な説明

ただし、ユーザーが「それで今買っていい？」のような売買判断を加えた場合は、このスキルを使います。

## 正本

判断を出す前に、必ず `docs/strategy/Trade-rule.md` を読みます。このファイルが売買ルール、ハード停止条件、資金管理、固定出力形式の正本です。

最新価格、市場データ、ニュース、Moomoo data、TradingView chart state、reach data、X/Reddit observation、screener 情報の取得方法を選ぶときは `.agents/skills/tradingview-operator-playbook/SKILL.md` を使います。このスキル内に operator skill の command table を重複コピーしません。

`docs/strategy/dr-k-chart-strategy-quantification-report_20260707.md` などの Dr.K reports は補助資料です。Trade Rule の正本として扱わず、毎回必須ではありません。pivot 選定、N/U pattern、absorption、failed breakout、pullback、leader-stock price-action comparison など、chart state の解釈が曖昧なときだけ参照します。

## 判断モード

すべての依頼を次のいずれかに分類します。

- `NEW_ENTRY`: 新規購入、初回 entry の判断。
- `ADD_POSITION`: 追加購入、買い増し、pyramid、average-up、averaging-down の相談。ナンピンは `docs/strategy/Trade-rule.md` で禁止されていますが、相談自体は起動対象です。
- `HOLD_OR_EXIT`: 既存 position の保有継続、縮小、売却、損切り、利確、trail、決算跨ぎ判断。
- `PORTFOLIO_RISK`: portfolio 全体、現金比率、gross exposure、theme concentration、correlated-position、max-loss、position-reduction の判断。

判断モードが曖昧な場合は、ユーザー文面と入力内容から推定します。判定できない場合は、推測で進めず `STAY` とし、不足情報と再判定に必要な情報を返します。

## 判定優先順位

判定は次の順番で行います。これにより、情報不足が確認済みの撤退条件を隠さないようにします。

1. 確認済みの `STOP` 条件がある場合は `STOP`。
2. 確認済みの `STOP` 条件はないが、`GO` に必要な情報が不足している場合は `STAY`。
3. その判断モードに必要な項目がすべて確認でき、`GO` 条件を満たす場合だけ `GO`。

例:

- `SETUP_BROKEN` が確認済みで、次回決算日が未確認 -> `STOP`。
- 損切りライン割れが確認済みで、最新 screener rank が未確認 -> `STOP`。
- chart は維持しているが最新ニュースが未確認 -> `STAY`。
- 新規購入で有効 pivot がない -> `STAY`。
- 新規購入で市場が明確な `RISK_OFF` -> `STOP`。
- averaging-down / ナンピン相談 -> `STOP`。

観測していない `STOP` 条件を推測しません。証拠がない項目は `未確認` と表示します。

## モード別ワークフロー

### NEW_ENTRY

新規購入では次を確認します。

- 銘柄と市場。
- 最新価格。
- 会社発表と regulator filings。
- 最新ニュース。
- 次回決算日と重要イベント。
- 市場レジーム。
- セクター強度。
- 最新 screener。
- Industry rank、stock rank、score。
- leader-stock judgment。
- chart state。
- setup。
- 有効 pivot。
- pivot からの乖離率。
- entry candidate。
- stop price。
- stop width。
- risk/reward。
- position sizing。
- portfolio overlap。

### ADD_POSITION

追加購入では、`NEW_ENTRY` の全項目に加えて次を確認します。

- 現在の平均取得価格。
- 現在数量。
- 含み損益。
- core position と add-on lot の区別。
- 追加後の平均取得価格。
- 追加後の position value。
- 追加後の 1 trade expected loss。
- 追加後の total portfolio expected loss。
- same-theme または same-price-action overlap。
- 含み損状態での averaging down ではないこと。

ナンピン / averaging-down の相談は起動対象ですが、`docs/strategy/Trade-rule.md` に従い原則 `STOP` です。

### HOLD_OR_EXIT

保有継続、縮小、売却、損切り、利確、決算跨ぎでは次を確認します。

- 最新価格。
- 平均取得価格。
- 数量。
- 含み損益率。
- 現在の stop または invalidation line。
- 会社固有ニュース。
- 決算と重要イベント。
- 市場レジーム。
- セクターと主要 leader の状態。
- `FAILED_BREAKOUT`。
- `SETUP_BROKEN`。
- 重要支持線、直近安値、主要 moving averages。
- 10 日線、25 日線、新しい pivot による利益管理。
- 決算を跨げる利益 cushion。
- portfolio 内の重要度と overlap。

`HOLD_OR_EXIT` では、次の新規購入用条件を無条件必須にしません。

- 初期 risk/reward が 2 以上。
- 新規 entry zone。
- 最新 pivot から 5% 以内。
- 最新 screener top rank。

ユーザーが追加購入も同時に聞いた場合だけ、その追加判断へ `ADD_POSITION` 条件を適用します。

### PORTFOLIO_RISK

portfolio level の判断では次を重視します。

- 総資産。
- 現金残高。
- 現金比率。
- gross position value。
- gross exposure multiple。
- 各 position の market value。
- 各 position の stop location。
- 各 position の expected loss。
- すべての stop が発動した場合の total expected loss。
- largest single-position concentration。
- largest sector concentration。
- Industry と theme overlap。
- correlated-position overlap。
- US / JP / currency bias。
- earnings と重要イベントの集中。
- reduction priority candidates。
- 新しい risk を取る余地。

`PORTFOLIO_RISK` では、次の単一銘柄 checks を無条件必須にしません。

- 単一対象銘柄。
- 単一銘柄の有効 pivot。
- 単一銘柄の entry zone。
- 単一銘柄の初期 risk/reward。
- 全保有銘柄の次回決算日の完全確認。
- 全保有銘柄の screener rank。

縮小候補を選ぶ段階で重要な position だけ、個別 chart や event を追加確認します。

## 情報源の優先順位

情報源は次の優先順位で使います。

1. 会社発表、SEC、EDINET、取引所、regulator などの一次情報。
2. 信頼できる最新 market news。
3. 最新の Oh-MY-TradingView screener reports。
4. Moomoo quote、fundamentals、snapshot、OHLCV。
5. TradingView chart view。
6. 保有情報には Moomoo、SBI、unified portfolio reports。
7. SNS、X、Reddit など community sources は補足だけ。

SNS、X、Reddit、community sentiment だけを理由に `GO` を出しません。

## 最新成功スクリーナーrun

米国株では次を使います。

- `.github/workflows/daily-screener.yml`
- `docs/reports/screener/daily-ranking.md`
- `docs/reports/screener/daily-ranking-run.json`

日本株では次を使います。

- `.github/workflows/daily-screener-japan.yml`
- `docs/reports/screener/daily-ranking-jp.md`
- `docs/reports/screener/daily-ranking-jp-run.json`

run metadata だけで鮮度を判断しません。次の順番で確認します。

1. 利用可能な GitHub connector / GitHub API tool。
2. `gh` CLI。
3. Repository run metadata and report body。

GitHub connector が使える場合は、対象 workflow の最新成功 run を特定します。

`gh` CLI が使える場合は次を使います。

```powershell
gh run list --workflow daily-screener.yml --branch main --status success --limit 1 --json databaseId,headSha,createdAt,updatedAt,status,conclusion,url
gh run list --workflow daily-screener-japan.yml --branch main --status success --limit 1 --json databaseId,headSha,createdAt,updatedAt,status,conclusion,url
gh run view <run-id>
```

GitHub connector も `gh` CLI も使えない場合は、repository metadata と report body の日付・更新時刻を照合します。metadata と report body が古い、または不一致で current success を確定できない場合は、鮮度を主張せず、新規判断など fresh screener が必要な判断では `STAY` とします。

具体的な GitHub Actions failure や run investigation が必要な場合だけ `.agents/skills/github-actions-failure-debugging/SKILL.md` を参照します。すべての売買判断で必須ではありません。

## TradingViewの利用方針

OHLCV と market data だけで足りる場合は、非 CDP の market、reach、screener、Moomoo route を優先します。

CDP または TradingView chart state は次が必要な場合だけ使います。

- 添付 chart image との比較。
- visual pivot confirmation。
- candle と volume position の確認。
- multiple-timeframe checks。
- visual setup classification。
- current TradingView chart state。

TradingView Desktop を無条件に起動しません。

## 画像入力

chart image では、見えている symbol、timeframe、price area、volume、pivot candidates、setup candidates、support/resistance だけを抽出します。完全自動 chart recognition が存在するように扱いません。

holdings screenshot では、見えている symbol、quantity、average cost、current price、P/L、currency、account type を抽出します。

portfolio screenshot では、見えている balance、cash、positions、unrealized P/L、diversification、theme overlap、concentration を抽出します。

画像だけで必要情報が揃わない場合は、暫定 `STAY`、確認済み facts、不足 facts、再判定に必要な情報を返します。画像が `STOP` 条件を確認できる場合は、一部の非必須情報が未確認でも `STOP` を使います。

## 情報不足時の扱い

不明な情報を楽観的に補完しません。不明値は `未確認` と書きます。

`NEW_ENTRY` と `ADD_POSITION` では、確認済みの `STOP` 条件がなく、`GO` に必要な情報を確認できない場合、原則 `STAY` とします。

`HOLD_OR_EXIT` では、新規購入専用の data を無条件には要求しません。損切りライン割れ、`FAILED_BREAKOUT`、`SETUP_BROKEN`、投資仮説を壊す news、許容できない event risk が確認済みなら、一部の非必須情報が未確認でも `STOP` とします。

`PORTFOLIO_RISK` では、単一対象銘柄、単一 pivot、全保有銘柄の完全な screener rank を要求しません。exposure、concentration、correlation、expected-loss breach が確認済みなら `STOP`、risk capacity を確認できない場合は `STAY` とします。

## ラベルの意味

- `NEW_ENTRY + GO`: Trade Rule の全条件を満たす場合だけ、新規 entry を許可する。
- `NEW_ENTRY + STAY`: 待つ。まだ entry しない。
- `NEW_ENTRY + STOP`: entry しない。hard stop または no-trade 条件が確認済み。
- `ADD_POSITION + GO`: 追加条件をすべて満たし、ナンピンではない場合だけ追加を許可する。
- `ADD_POSITION + STAY`: 現在 size を維持する。追加する根拠はまだ不足。
- `ADD_POSITION + STOP`: 追加しない。ナンピンまたは risk 過大なら no-add / reduction を優先する。
- `HOLD_OR_EXIT + GO`: 使用しない。
- `HOLD_OR_EXIT + STAY`: 現在の position を保有継続する。追加購入を許可する意味ではない。
- `HOLD_OR_EXIT + STOP`: 縮小、売却、損切り、撤退、部分利確、stop 引き上げ、trailing 強化を優先する。
- `PORTFOLIO_RISK + GO`: 新しい risk を取る余地がある。特定銘柄の購入許可ではない。
- `PORTFOLIO_RISK + STAY`: 現在の exposure を維持する。新規追加を急がない。
- `PORTFOLIO_RISK + STOP`: exposure、concentration、correlation、expected loss を減らす。

`PORTFOLIO_RISK` では、`対象市場` を `US`、`JP`、または `MIXED` にします。米国株と日本株の保有が両方ある場合は `MIXED` を使います。

## 読み取り専用制約

このスキルは読み取り専用です。次の操作を禁止します。

- 注文発注は禁止。
- 注文変更は禁止。
- 注文取消は禁止。
- 自動売買は禁止。
- 自動損切りは禁止。
- ポジションの自動縮小は禁止。
- 取引ロック解除は禁止。
- Moomooでの取引操作は禁止。
- 証券口座への書き込み操作は禁止。

agent が注文を発注、変更、取消、送信、取引ロック解除できるように説明しません。alert 作成も、ユーザーが明示的に alert を依頼しない限り行いません。

出力できるのは意思決定支援に限ります。売買判定、entry candidate、size candidate、stop candidate、profit-taking または trailing candidate、re-check condition、portfolio reduction candidate までです。

## 出力形式

metadata より先に判定を置きます。

```markdown
# 判定: GO / STAY / STOP

確認時刻:
判断モード: NEW_ENTRY / ADD_POSITION / HOLD_OR_EXIT / PORTFOLIO_RISK
対象市場: US / JP / MIXED
対象銘柄:
入力形式: テキスト / チャート画像 / 保有画像 / ポートフォリオ画像
データ完全性: COMPLETE / PARTIAL / INSUFFICIENT
```

### NEW_ENTRY / ADD_POSITION の出力

Trade Rule の section structure を使います。

```text
1. 結論
2. 最新ニュース・イベント
3. スクリーナー
4. 市場・セクター・リーダー判定
5. チャート
6. 資金管理
7. ハード停止チェック
8. 最終アクション
```

### HOLD_OR_EXIT の出力

次を使います。

```text
1. 結論
2. 最新ニュース・イベント
3. 保有状況
4. 市場・セクター・リーダー判定
5. チャート崩れ・利益管理
6. 決算・イベントリスク
7. STOP条件チェック
8. 最終アクション
```

最低限、次を含めます。

```text
平均取得価格:
現在価格:
含み損益率:
現在の無効化ライン:
チャート状態:
保有継続条件:
縮小条件:
売却・損切り条件:
利益管理:
```

### PORTFOLIO_RISK の出力

次を使います。

```text
1. 結論
2. ポートフォリオ概要
3. 現金・建玉
4. 集中・相関リスク
5. 最大想定損失
6. 市場レジーム
7. リスク上限チェック
8. 最終アクション
```

最低限、次を含めます。

```text
総資産:
現金残高:
現金比率:
建玉総額:
建玉倍率:
全ストップ発動時の想定損失:
最大銘柄比率:
最大セクター比率:
テーマ重複:
相関リスク:
イベント集中:
縮小優先候補:
新規リスク余地:
```
