# バックテスト結果まとめテンプレート
<!--
【このテンプレートの使い方 — AIへの指示】

入力ファイル:
  - 戦略別集計: artifacts/campaigns/{campaign_name}/full/strategy-ranking.json
  - 銘柄別生データ: artifacts/campaigns/{campaign_name}/full/recovered-results.json

記入方針:
  1. baseline / control 戦略を最初に特定する。
     - 明示的な baseline がある場合はそれを使う。
     - baseline がない場合は「baselineなし」と書き、比較対象にした control / 既存代表戦略を明記する。
  2. 以降の評価は composite score ではなく、baseline にどれだけ追随・改善できたかで書く。
  3. DD は固定金額ではなく、利益に対する DD 比率を見る。
     - dd_to_profit = avg_max_drawdown / avg_net_profit
     - avg_net_profit <= 0 の戦略は dd_to_profit を n/a とし、原則除外候補にする。
  4. Top 戦略は「利益は baseline にどれだけ届いたか」「PF は改善したか」「DD対利益比率は改善したか」「勝率はどう変わったか」を数値で説明する。
  5. 銘柄集中チェックは標準セクションとしては不要。必要な場合だけ観察メモに書く。

注意:
  - セクション内にサンプル値を残さないこと。
  - 「強い」「弱い」だけで終わらせず、baseline 差分を数値で書くこと。
  - baseline が raw profit で強い場合、それを無理に否定しない。目的が利益最大化か、低DD・高PF化かを分けて結論を書くこと。
-->

---

## ヘッダー

- run_id: `...`
- GHA run_number: `...`
- GHA run_id: `...`
- status: `SUCCESS / FAILED`
- 実行日時: `...`
- 対象市場: `US / JP / US+JP`
- campaign_id: `...`
- 目的: `...`
- 戦略数: `...`
- 実行件数: `...`
- compile/apply 成功: `... / ...`
- metrics 読み取り成功: `... / ...`
- metrics_unreadable: `... / ...`

---

## 結論

- **baseline / control**: `presetId` / avg_net_profit `...` / avg_profit_factor `...` / dd_to_profit `...%` / avg_win_rate `...%`
- **raw profit 最有力**: `presetId` / baseline比 `...%` / avg_net_profit `...`
- **risk/reward 最有力**: `presetId` / PF `...` / dd_to_profit `...%`
- **除外基準にかかった主なグループ**: `...`
- **ざっくり判断**: `利益最大化なら...。低DD・高PF化を優先するなら...。次は...を検証する。`

---

## 判断基準

| 指標 | 優秀 | 許容 | 要注意 | 即除外 |
|---|---|---|---|---|
| avg_profit_factor | >= 2.0 | 1.7〜2.0 | 1.5〜1.7 | < 1.5 |
| dd_to_profit | < 15% | 15〜30% | 30〜50% | >= 50% |
| avg_win_rate | >= 40% | 35〜40% | 30〜35% | < 30% |
| profit_follow_rate | >= 80% | 50〜80% | 25〜50% | < 25% |

**指標定義**

- `profit_follow_rate = avg_net_profit / baseline avg_net_profit`
- `dd_to_profit = avg_max_drawdown / avg_net_profit`
- `avg_net_profit <= 0` の場合、`dd_to_profit` は `n/a` とする。
- `profit_follow_rate` は baseline が存在する場合のみ使う。baseline がない場合は control 戦略またはユーザー指定の比較対象を明記する。

---

## Baseline 結果（比較の大前提）

<!--
【AIへの指示】
  - baseline / control 戦略を recovered-results.json から銘柄別に確認する。
  - baseline が今回の8銘柄・対象市場でどれだけ稼ぎ、どれだけDDを出したかを書く。
  - 以降の戦略評価は、この baseline に対する追随率・改善点・悪化点として書く。
  - 下の数値は run94 の `ema-macd-rsi-sl-baseline`（composite 134位）を使った実例。新しい run を書くときは必ず置き換える。
-->

| presetId | avg_net_profit | avg_profit_factor | avg_max_drawdown | dd_to_profit | avg_win_rate | run_count | success_count |
|---|---:|---:|---:|---:|---:|---:|---:|
| `ema-macd-rsi-sl-baseline` | 534,109.93 | 1.905 | 184,211.31 | 34.5% | 36.99% | 8 | 8 |

**Baseline 銘柄別成績**

| 銘柄 | net_profit | profit_factor | max_drawdown | dd_to_profit | win_rate | trades |
|---|---:|---:|---:|---:|---:|---:|
| `BTCUSD` | 3,618,443.02 | 1.934 | 1,167,801.68 | 32.3% | 43.94% | 66 |
| `NVDA` | 328,029.39 | 1.947 | 125,726.33 | 38.3% | 37.04% | 54 |
| `MSTR` | 133,365.61 | 2.209 | 46,974.17 | 35.2% | 27.42% | 62 |
| `TSLA` | 122,888.86 | 1.570 | 110,243.02 | 89.7% | 29.09% | 55 |
| `AAPL` | 39,824.70 | 1.917 | 10,391.54 | 26.1% | 49.02% | 51 |
| `QQQ` | 16,802.90 | 2.054 | 5,580.25 | 33.2% | 43.14% | 51 |
| `SPY` | 9,494.65 | 2.319 | 2,120.83 | 22.3% | 47.06% | 51 |
| `PLTR` | 4,030.34 | 1.289 | 4,852.66 | 120.4% | 19.23% | 26 |

**Baseline の読み方**

- raw profit の強さ: `run94 の baseline は avg_net_profit 534,109.93 と raw profit が突出しており、特に BTCUSD が平均値を大きく押し上げている。`
- DD対利益比率の評価: `aggregate の dd_to_profit は 34.5% で「要注意」寄り。TSLA 89.7%、PLTR 120.4% のように銘柄単位では悪化もあるため、baseline 超えは利益だけでなく DD 比率改善もセットで見る。`
- 派生戦略が超えるべき最低ライン: `baseline を比較対象にするなら、avg_net_profit の追随率に加えて PF 1.905 超え、dd_to_profit 34.5% 未満、avg_win_rate 36.99% 前後をどこまで改善したかを並べて判断する。`

---

## 全戦略一覧（baseline 比較）

<!--
【AIへの指示】
  - 原則として avg_net_profit 降順で並べる。
  - baseline と比較して、利益追随率・PF差分・DD対利益比率差分・勝率差分を書く。
  - composite_score は使わない。
-->

| rank | presetId | avg_net_profit | profit_follow_rate | avg_profit_factor | PF vs baseline | avg_max_drawdown | dd_to_profit | DD ratio vs baseline | avg_win_rate | win_rate vs baseline | 判断 |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | `<presetId>` | 0.00 | 0.0% | 0.000 | +0.000 | 0.00 | 0.0% | -0.0pt | 0.00% | +0.00pt | `...` |

---

## Top 戦略

<!--
【AIへの指示】
  - Top は目的別に選ぶ。raw profit上位、risk/reward上位、baseline改善候補など。
  - 「他と比べて」ではなく、baseline と比べて何が勝っていて何が負けているかを書く。
-->

### 1位: `presetId`

- 選定理由: `raw profit / risk-reward / PF改善 / DD改善 / その他`
- avg_net_profit: `...` / baseline比: `...%`
- avg_profit_factor: `...` / baseline差: `+/-...`
- avg_max_drawdown: `...` / dd_to_profit: `...%` / baseline差: `+/-...pt`
- avg_win_rate: `...%` / baseline差: `+/-...pt`

**baseline と比べて優秀だった点**

- `...`

**baseline と比べて弱かった点**

- `...`

**採用判断**

- `利益最大化候補 / risk-reward候補 / 継続観察 / 除外候補`

---

### 2位: `presetId`

- 選定理由: `...`
- avg_net_profit: `...` / baseline比: `...%`
- avg_profit_factor: `...` / baseline差: `+/-...`
- avg_max_drawdown: `...` / dd_to_profit: `...%` / baseline差: `+/-...pt`
- avg_win_rate: `...%` / baseline差: `+/-...pt`

**baseline と比べて優秀だった点**

- `...`

**baseline と比べて弱かった点**

- `...`

**採用判断**

- `...`

---

### 3位: `presetId`

- 選定理由: `...`
- avg_net_profit: `...` / baseline比: `...%`
- avg_profit_factor: `...` / baseline差: `+/-...`
- avg_max_drawdown: `...` / dd_to_profit: `...%` / baseline差: `+/-...pt`
- avg_win_rate: `...%` / baseline差: `+/-...pt`

**baseline と比べて優秀だった点**

- `...`

**baseline と比べて弱かった点**

- `...`

**採用判断**

- `...`

---

## 除外候補

<!--
【AIへの指示】
  - baseline に対して弱すぎる戦略を除外候補にする。
  - 典型パターン:
    - profit_follow_rate < 25%
    - avg_profit_factor < 1.5
    - dd_to_profit >= 50%
    - avg_net_profit <= 0
  - win_rate は補助指標。win_rate 単独で除外しない。
-->

| presetId | 除外理由 | baseline比 | PF | dd_to_profit | 判断 |
|---|---|---:|---:|---:|---|
| `<presetId>` | `利益追随率が低い / PF不足 / DD対利益比率が過大 / net_profit <= 0` | 0.0% | 0.000 | 0.0% | `除外候補 / 継続観察` |

---

## 今回の振り返り

<!--
【次のAIへの指示】
  - 今回の戦略群を振り返って、何が有効だったか、何が意味が薄かったかを書く。
  - baseline を上回れなかった場合は、単に「失敗」とせず、何を犠牲にして何が改善したかを書く。
  - 低利益でもPFやDDが改善した戦略は、銘柄限定・条件合成の材料として残せるか判断する。
-->

### わかったこと

1. `...`

### 意味が薄かったこと

1. `...`

### もう少し確認したいこと

1. `...`

---

## 次回バックテスト確認事項

<!--
【次のAIへの指示】
  - 次に何を変えて、何と比較して、何が分かれば完了かを書く。
  - baseline を継続比較対象にする。
  - 最後に「今後どの方針で進めるのがよいか」を明記する。
-->

1. **検証タスク名**
   `何を変える / 何と比較する / 完了条件`

2. **検証タスク名**
   `何を変える / 何と比較する / 完了条件`

3. **今後の方針**
   `利益最大化を優先するのか、低DD・高PF化を優先するのか、銘柄別採用に寄せるのかを書く。`
