# ディープリサーチ指示: モメンタム × ファンダメンタル スクリーニング指標の完全調査

## タスクの目的

このタスクの目的は「**今まさにモメンタムがあり、ファンダメンタルが最強の銘柄**」を
スクリーニングするために使うべき指標を、学術論文・実証研究・実務的知見をもとに
**隅から隅まで調査・整理**することです。

10バガーを探すのではなく、
「現時点で最も強いモメンタムを持ち、ファンダメンタルが優れた銘柄」を
毎日スクリーニングするためのベスト指標セットを確立するための調査です。

---

## 調査の進め方・ルール
- まずはこのプロジェクトでどんなスクリーニングをしているか把握すること。
- **1〜2時間かけて徹底的に調査すること。途中で止めない。**
- Web検索・論文データベース・Reddit・Twitter(X)・GitHub・Substack等、
  使えるソースは全て使うこと。
- 各指標について必ず以下をセットで出すこと:
  1. 指標の定義・計算式
  2. 何を測っているか（経済的な意味）
  3. 根拠となる論文または実証研究（著者・年・掲載誌・結論を明記）
  4. モメンタムスクリーニングにおける有効性評価（◎/○/△/✕）
  5. 実装上の注意点（TradingView Scanner APIで取得可能かどうか含む）
- 情報源がRedditやTwitterの場合は、なぜ信頼できるかの根拠も添えること
- 「一般的に言われている」ではなく、**必ず根拠を示すこと**
- 調査の途中で新しい指標が見つかったら、そのまま追加すること
- 最終的な調査結果は\\wsl.localhost\Ubuntu\home\fpxszk\code\Oh-MY-TradingView\docs\strategy　配下に適切な名前をつけてマークダウン形式でまとめること。

---

## 現在スクリーナーで使っている指標（現状の棚卸し）

以下の指標は既に実装済み。それぞれについて「本当に有効か」を論文で検証すること。

| 指標 | 現在の閾値 | 要検証ポイント |
|:---|:---|:---|
| RSI(14) | > 60 | 株式モメンタムスクリーニングとして有効か |
| Perf.3M | > 10% | Jegadeesh-Titman以外の裏付けはあるか |
| 相対出来高 | > 1.0〜1.2x | 高出来高後の超過リターム証拠 |
| 52週高値比率 | ≥ 75% | George-Hwang(2004)以外の検証 |
| ROE | > 15〜20% | 負債依存ROEの問題・ROICとの比較 |
| 粗利率 | > 30〜40% | Novy-Marx(2013)の再確認 |
| FCFマージン | > 5〜15% | 10バガー研究での最強指標の詳細 |
| EPS(TTM) | > 0 | 冗長かどうか・代替指標の検討 |
| P/FCF | < 50〜100 | セクター別有効性 |
| 売上成長率YoY | > 20% | Yartseva(2025)と矛盾する可能性 |
| Close > SMA200 | - | トレンドフォローの根拠 |
| Close > SMA50 | - | 短期トレンド確認として有効か |
| 時価総額 | > $1B | 流動性フィルターとしての妥当性 |

---

## 追加候補指標（これらを全て調査・検証すること）

### A. モメンタム系指標

1. **Perf.1M（1ヶ月リターン）**
   - 短期リバーサル効果との関係（Jegadeesh 1990）
   - モメンタム計算から1ヶ月除外すべきかどうか

2. **Perf.6M / Perf.12M（6・12ヶ月リターン）**
   - Jegadeesh-Titmanの元論文は3〜12ヶ月。3Mだけで十分か？

3. **12-1モメンタム（12ヶ月リターン − 直近1ヶ月除外）**
   - AQR・Asness et al.が推奨する標準的モメンタム計算法
   - なぜ1ヶ月を除外するのかの理由を論文で確認

4. **Industry Momentum（セクターモメンタム）**
   - Moskowitz & Grinblatt (1999) の業種モメンタム効果
   - 個別銘柄モメンタムとどちらが強いか

5. **52週高値突破（New High）**
   - 52週高値を更新した直後の銘柄のリターン
   - George-Hwang(2004)の延長研究

6. **Price Acceleration（価格加速度）**
   - 1Mリターン > 3Mリターン/3 という加速の有無
   - モメンタムの「加速」が持続性の予測因子かどうか

7. **Residual Momentum（残差モメンタム）**
   - 市場ファクターを除いた個別銘柄固有のモメンタム
   - Blitz et al. (2011) の研究

8. **Time-Series Momentum（絶対モメンタム）**
   - Moskowitz, Ooi, Pedersen (2012) の時系列モメンタム
   - 相対モメンタムとの違いと補完性

### B. ファンダメンタル系指標（収益性）

9. **ROIC（投下資本利益率）**
   - ROEとの違い・ROICの方が優れる理由
   - Joel Greenblatt「Magic Formula」との関係
   - Fama-French 5ファクターの投資ファクターとの関係

10. **ROCE（使用資本利益率）**
    - ROEとROICの中間的指標
    - 英国・欧州機関投資家での使用実績

11. **Gross Profitability（粗利 ÷ 総資産）**
    - Novy-Marx(2013)の正確な定義の確認
    - 粗利率（÷売上）との違い

12. **Operating Profitability（営業収益性）**
    - Fama-French 5ファクターのRMW（Robust Minus Weak）
    - 粗利率・FCFマージンとどう違うか

13. **Net Profit Margin（純利益率）**
    - 粗利率と比べた場合の情報の追加価値はあるか

14. **Cash Conversion Ratio（CCR = FCF ÷ 純利益）**
    - 利益の「現金化率」。1に近いほど質の高い利益
    - 10バガー研究でのエビデンス

15. **Asset Turnover（資産回転率 = 売上 ÷ 総資産）**
    - ROEのDuPont分解の一部
    - 単独でのモメンタムとの組み合わせ効果

### C. ファンダメンタル系指標（成長）

16. **Earnings Acceleration（EPS加速度）**
    - 前期比EPS成長率が加速しているかどうか
    - IBD/CAN SLIM法の「A」の要素
    - 論文での有効性（SUE研究）

17. **Revenue Acceleration（売上加速度）**
    - 売上成長率自体より「加速しているか」が重要か
    - 四半期ごとの加速パターンの分析

18. **Operating Leverage（営業レバレッジ）**
    - 固定費が高い企業は売上増加時に利益が大きく伸びる
    - Novy-Marx (2010) の研究

19. **Earnings Surprise（決算サプライズ / SUE）**
    - コンセンサス予想を上回った際の株価反応
    - Post-Earnings Announcement Drift（PEAD）の文献
    - Ball & Brown (1968)、Bernard & Thomas (1989)

20. **Forward EPS Growth Rate（予想EPS成長率）**
    - アナリスト予想ベース。Forward PEと組み合わせ
    - 有効性と限界（アナリストのバイアス）

### D. バリュエーション系指標

21. **EV/EBITDA**
    - P/FCFとの違い・セクター横断での比較優位
    - 設備投資重型セクターでのP/FCF代替として有効か

22. **PEG Ratio（PE ÷ EPS成長率）**
    - Peter Lynch が提唱。成長込みの割安感
    - 論文での有効性（過熱感検知 vs 割安検知）

23. **Price-to-Sales（PS比）**
    - FCFが出ない成長初期企業への対応
    - Anderson & Brooks (2006)等の研究

24. **EV/FCF**
    - P/FCFより負債を考慮したバリュエーション
    - セクター横断での比較優位

25. **Forward PE（予想PER）**
    - 現在PERより将来を反映。過熱感チェックに有効か
    - 成長株を早く切りすぎる副作用の根拠

### E. テクニカル系指標

26. **SMA200乖離率（現在値 ÷ SMA200 − 1）**
    - 単なるClose > SMA200より詳細な強さを測れるか

27. **ADX（平均方向性指数）> 25**
    - トレンドの強さを測る。RSIより「トレンド確認」に向くか
    - Wilder (1978) と実証研究

28. **MACD（シグナルライン上抜け）**
    - モメンタムの転換点検知として有効か
    - RSIとの冗長性の評価

29. **Bollinger Band（上部突破）**
    - ブレイクアウトシグナルとしての有効性
    - モメンタム継続か反転かの判断

30. **ATR（Average True Range）による ボラティリティ調整**
    - 高ボラ銘柄のモメンタムは継続しやすいか
    - リスク調整後リターンとの関係

31. **出来高プロファイル（VWAP乖離）**
    - VWAP上抜けの機関買いシグナルとしての証拠

### F. クオリティ系指標

32. **Piotroski F-Score（1〜9点）**
    - 9つの財務健全性指標の合算スコア
    - Piotroski (2000, Journal of Accounting Research)
    - モメンタムと組み合わせた場合の有効性

33. **Altman Z-Score（財務健全性）**
    - 倒産確率モデル。財務リスクフィルターとして
    - モメンタムと組み合わせた場合の研究

34. **Accruals（発生主義会計の質）**
    - Sloan (1996)「利益の質」研究。低アクルーアルが優位
    - FCFマージンとの重複確認

35. **Debt-to-Equity（D/E、負債資本比率）**
    - 高ROEが負債によるものか実力によるものかの判別
    - Leverage factorの研究

36. **Interest Coverage Ratio（インタレスト・カバレッジ）**
    - 借入コストをどれだけ余裕を持って払えるか
    - 財務安全性フィルターとして有効か

### G. マクロ・市場環境系

37. **Beta（市場感応度）**
    - 低ベータ株のアノマリー（Low Volatility Effect）
    - Baker, Bradley, Wurgler (2011)

38. **Sector Relative Strength**
    - セクターETFのモメンタムと個別銘柄の組み合わせ
    - Moskowitz & Grinblatt (1999) の業種モメンタム

39. **Short Interest Ratio（空売り比率）**
    - 高空売り銘柄のショートスクイーズ可能性
    - 逆張りvs順張りの研究

40. **Institutional Ownership Change（機関投資家の持分変化）**
    - 機関投資家の新規買いがシグナルになるか
    - 13F filing分析の研究

---

## 特に調査してほしい論文・手法

以下は特に重点的に調査・要約してほしい文献リスト。
これ以外にも関連論文が見つかれば積極的に追加すること。

### モメンタム系
- Jegadeesh & Titman (1993) 「Returns to Buying Winners」 ← 基礎
- Jegadeesh & Titman (2001) 「Profitability of Momentum Strategies」
- Moskowitz & Grinblatt (1999) 「Do Industries Explain Momentum?」
- Asness, Moskowitz & Pedersen (2013) 「Value and Momentum Everywhere」
- Blitz, Huij & Martens (2011) 「Residual Momentum」
- Moskowitz, Ooi & Pedersen (2012) 「Time Series Momentum」
- George & Hwang (2004) 「The 52-Week High and Momentum Investing」
- Daniel & Moskowitz (2016) 「Momentum Crashes」← クラッシュリスクの回避方法

### ファンダメンタル系
- Novy-Marx (2013) 「The Other Side of Value: Gross Profitability Premium」
- Fama & French (2015) 「A Five-Factor Asset Pricing Model」
- Piotroski (2000) 「Value Investing: The Use of Historical Financial Information」
- Sloan (1996) 「Do Stock Prices Fully Reflect Information in Accruals?」
- Ball & Brown (1968) + Bernard & Thomas (1989) 「PEAD（決算サプライズドリフト）」
- Greenblatt (2005) 「The Little Book That Beats the Market」（Magic Formula）

### FCF・キャッシュフロー系
- Yartseva (2025) 「The Alchemy of Multibagger Stocks」← FCFイールドが最強
- Dechow, Sloan & Sweeney (1995) 「Detecting Earnings Management」

### 複合ファクター系
- Carhart (1997) 「On Persistence in Mutual Fund Performance」← 4ファクターモデル
- AQR Capital Management の各種ホワイトペーパー（公開されているもの）

---

## 調査ソース一覧（全て使うこと）

| ソース種別 | 具体的な場所 |
|:---|:---|
| 学術論文 | Google Scholar, SSRN, arXiv, NBER, ResearchGate |
| 金融DB | Semantic Scholar, JSTOR |
| 実務・ブログ | Alpha Architect, AQR Insights, Robeco Insights, Verdad Capital |
| Reddit | r/algotrading, r/SecurityAnalysis, r/investing, r/quant |
| Twitter/X | @quantpedia, @alphaarchitect, @jesselivermore_x 等の著名クオントアカウント |
| Substack | Quant系Substack（検索して見つけること）|
| GitHub | 関連するバックテストリポジトリ |
| ファクター辞書 | AQR Factor Library, Kenneth French Data Library |

---

## 最終アウトプット形式

調査完了後、以下の形式で出力すること。

### セクション1: 指標別詳細レポート
各指標について以下を必ず含めること：
- 定義・計算式
- 経済的意味
- 根拠論文（著者・年・掲載誌・主要結論）
- モメンタムスクリーニングへの有効性評価（◎/○/△/✕）
- TradingView Scanner APIまたはYahoo Financeで取得可能か
- 現スクリーナーへの追加推奨度と優先順位

### セクション2: 推奨指標セット
調査結果を踏まえ、以下を提示すること：
- **必須指標（外してはいけない）**：論文で強く支持されているもの
- **追加推奨指標（優先度高）**：現状から追加すべき上位5つ
- **削除推奨指標（冗長または無効）**：現状から外してよいもの
- **セクター別調整が必要な指標**

### セクション3: 参考文献リスト
調査で参照した全ての論文・URL・ソースのリスト

---

## 重要な注意事項

1. **この指示文を鵜呑みにしないこと。** 上記の「追加候補指標」は仮説にすぎない。
   論文で有効性が確認できなかった指標は、そのように正直に報告すること。

2. **コンテキストを忘れないこと。** 目的は「毎日動かす自動スクリーナー」であり、
   長期保有のバリュー投資スクリーナーではない。指標の有効期間（モメンタムは
   3〜12ヶ月、バリューは数年）を考慮して評価すること。

3. **データ取得可能性を常に意識すること。** いくら有効な指標でも、
   TradingView Scanner API・Yahoo Finance・無料APIで取得できなければ
   実装できない。取得可否を必ず確認すること。

4. **日本株への適用可能性も確認すること。** 米国で有効な指標が日本市場でも
   同様に機能するかを調査した論文があれば、それも含めること。

5. **調査は止めずに続けること。** 1〜2時間かけて徹底的に調査し、
   見つかった情報を全て網羅すること。「調査が終わった」と思っても、
   さらに深く掘り下げること。
