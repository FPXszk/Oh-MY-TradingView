# Incident: public tail35 rerun was first executed inside sandbox

## 概要

2026-04-21 の `public-top10-us-40-brosio-tail35` 再走時に、**TradingView Desktop の CDP に届かない sandbox 内で backtest を実行してしまい、実機 backtest が走っていないのに途中で失敗原因を誤認した**。

これは operator error であり、今後の過去トラとして残す。

---

## 何が起きたか

残り 35 本の `tv-public-brosio-break-and-retest` を再走する際、

- TradingView Desktop 自体は Windows 側で起動できていた
- しかし `run-long-campaign.mjs ... --host 172.31.144.1 --ports 9223` を **sandbox 内**で実行した
- その結果、child process は `172.31.144.1:9223` へ到達できず、実機 backtest ではなく接続不能のまま fail を積み上げた
- 途中で「実機未接続か、戦略 failure か」を切り分ける過程で、こちらの判断が一度ぶれた

最終的には、単発 CLI 実行で以下を確認して sandbox 起因と特定した。

- `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset ...`
- 結果:
  - `CDP connection failed after 5 attempts: fetch failed`
  - `Tried: http://172.31.144.1:9223/json/list`

その後、**sandbox 外**で同じ command を再実行し、今度は実際に chart symbol が `BATS:AAPL` まで動くことを確認した。  
この時点で、接続 failure と strategy compile error を正しく分離できた。

---

## 影響

- tail35 再走の途中結果のうち、sandbox 内で積まれた失敗は **実機 backtest 結果として扱えない**
- 一時的に「未接続 failure」と「strategy 自体の compile failure」が混ざって見えた
- ユーザーへの途中説明も一度不正確になった

---

## 最終的に確定した事実

1. sandbox 内実行分  
   - TradingView Desktop 実機の成績ではない
   - 接続不能に起因する失敗

2. sandbox 外実行分  
   - chart は実際に `TSLA -> ... -> AAPL` と切り替わった
   - `tv-public-brosio-break-and-retest` は compile error
   - error:
     - `The condition of the "if" statement must evaluate to a "bool" value.`

つまり **最終 failure の本体は strategy compile error** だが、そこに到達する前段で **sandbox 実行ミス** が混入していた。

---

## 原因

直接原因:

- TradingView CDP に触る command を、sandbox 制約の影響を受ける経路で実行したこと

判断ミス:

- 実機接続確認後でも、**実際の backtest command 自身が sandbox 外で走っているか** を即確認しなかったこと
- `FAIL` の初期連続を見て、connection / strategy / runtime の切り分けを十分に終える前に途中解釈を返したこと

---

## 再発防止

TradingView 実機に触る backtest / campaign 実行では、次を必須にする。

1. **実行経路確認**
   - TradingView Desktop を触る command は最初から sandbox 外で実行する

2. **接続確認の二段階化**
   - `tv_health_check`
   - その後に、同じ host/port を使う単発 CLI で到達確認

3. **途中 failure の扱い**
   - `FAIL` が出ても、connection failure / compile failure / tester read failure を分離するまで意味づけしない

4. **会話上の報告**
   - 実機起動済みと、backtest command が実機に到達していることは別物として報告する

---

## 恒久メモ

この件は「TradingView が起動している」だけでは不十分で、**backtest を叩く子プロセスがその CDP endpoint に届く経路で実行されているか** を必ず確認すべき、という過去トラ。

関連:

- `docs/reports/public-top10-us-40x10-final-400run.md`
- `docs/reports/public-top10-us40-full40-comparison.md`
