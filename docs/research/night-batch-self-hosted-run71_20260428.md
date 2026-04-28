---

## ヘッダー

- run_id: `20260428_010338`
- status: `FAILED`
- 対象市場: `US`
- 目的: `run70 の改善点を 50 strategies × 40 symbols の US40 campaign で深掘りし、SMA parity / confirm slicing / DD suppression / RSI2x10 ablation を一括比較する`

---

## 結論

- **総合首位**: `取得不可（full strategy-ranking.json 未生成）` / composite_score `取得不可` / avg_net_profit `取得不可` / avg_profit_factor `取得不可`
- **US 本命**: `取得不可（full strategy-ranking.json 未生成）` / avg_net_profit `取得不可` / avg_profit_factor `取得不可`
- **JP 本命**: `対象なし` / avg_net_profit `対象なし` / avg_profit_factor `対象なし`
- **ざっくり判断**: 最新 workflow run `25005861669` は `start-night-batch` job が 2026-04-28 01:03:38 JST から 6時間実行された後に GitHub Actions 側で `cancelled` となり、`night-batch-25005861669-1` artifact は生成されなかった。`config/night_batch/strongest-plus-recovery-reversal-us40-50pack.json` は production を `28800` 秒まで許容している一方、workflow 側は `jobs.<job_id>.timeout-minutes` 未設定で既定 `360` 分に止められていた。GitHub Docs でも `jobs.<job_id>.timeout-minutes` の既定値は `360` 分、self-hosted runner の job 実行上限は `5 days` とされているため、今回の停止は strategy ranking 未生成のまま job timeout に到達したことが主因と判断する。参考として直近成功 run70 (`24976536910`) は 10戦略 × 40銘柄の full `400 runs` を `1h21m49s` で完走しており、同じ単一 worker 前提の 50pack `2000 runs` は単純比例で約 `6h49m35s` と見積もられ、6時間打ち切りと整合する。  

出典:
- GitHub Docs, workflow syntax: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- GitHub Docs, Actions limits: https://docs.github.com/en/actions/reference/usage-limits-for-self-hosted-runners

---

## 判断基準（固定値 — AIは変更しないこと）

| 指標 | 優秀 | 許容 | 要注意 | 即除外 |
|---|---|---|---|---|
| avg_profit_factor | ≥ 2.0 | 1.7〜2.0 | 1.5〜1.7 | < 1.5 |
| avg_max_drawdown | < 5,000 | 5,000〜6,200 | 6,200〜7,000 | > 7,000 |
| avg_win_rate | ≥ 45% | 40〜45% | 35〜40% | < 35% |
| 銘柄集中度 | 最大1銘柄 < 30% | 30〜50% | 50〜70% | ≥ 70% |

**市場別 平均値（比較の基準として使う）**

| 市場 | 戦略数 | avg_net_profit 平均 | avg_profit_factor 平均 | avg_max_drawdown 平均 |
|---|---|---|---|---|
| US 専用 | 50 | 取得不可（artifact未生成） | 取得不可（artifact未生成） | 取得不可（artifact未生成） |
| JP 専用 | 0 | 対象なし | 対象なし | 対象なし |
| US+JP 両対応 | 0 | 対象なし | 対象なし | 対象なし |

---

## 全戦略スコア一覧

| rank | presetId | composite_score | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | markets |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| — | `artifact未生成` | — | — | — | — | — | `US` |

---

## Top 3 戦略

### 1位: `算出不可`

- composite_score: `算出不可` / markets: `US`
- avg_net_profit: `算出不可` / avg_profit_factor: `算出不可` / avg_max_drawdown: `算出不可`

**他と比べて強かった点（同一市場平均との差で書く）**

- `full strategy-ranking.json が未生成のため算出不可`
- `workflow run 25005861669 は artifact 未生成のまま cancelled で終了した`
- `campaign 定義上は US 50戦略 × 40銘柄 = 2000 runs で、単一 worker 9223 を使用する`
- `直近成功 run70 の 400 runs / 1h21m49s を基準にすると、今回の full は約 +1600 runs (+400%) の追加負荷となる`

---

### 2位: `算出不可`

- composite_score: `算出不可` / markets: `US`
- avg_net_profit: `算出不可` / avg_profit_factor: `算出不可` / avg_max_drawdown: `算出不可`

**他と比べて強かった点（同一市場平均との差で書く）**

- `full strategy-ranking.json が未生成のため算出不可`
- `GitHub Actions job は 6時間で停止したが、night batch config は production_timeout_sec=28800 (8時間) を要求していた`
- `workflow と runtime config の許容時間が +120分 ずれていた`
- `run70 では full checkpoint-400.json まで到達して artifact upload されたのに対し、run71 は upload step が skipped となった`

---

### 3位: `算出不可`

- composite_score: `算出不可` / markets: `US`
- avg_net_profit: `算出不可` / avg_profit_factor: `算出不可` / avg_max_drawdown: `算出不可`

**他と比べて強かった点（同一市場平均との差で書く）**

- `full strategy-ranking.json が未生成のため算出不可`
- `Readiness gate と preflight は通過しており、停止原因は接続待ちではなく長時間実行側に寄っている`
- `run71 の job step 内訳では setup から gate 完了まで 1分未満、残りのほぼ全時間を foreground production step が消費した`
- `今回の停止は strategy quality の優劣ではなく、workflow 実行枠の不足で比較不能になったケースとして扱う`

---

## 除外候補

| presetId | 分類 | 弱かった指標（平均との差） | 判断 |
|---|---|---|---|
| `算出不可` | `未判定` | `full strategy-ranking.json が未生成のため平均との差を算出不可` | `継続観察` |

---

## 銘柄集中チェック

| presetId | 最大利益銘柄 | 集中度(%) | 判断基準分類 |
|---|---|---|---|
| `算出不可` | `算出不可` | `算出不可` | `artifact未生成` |

---

## 改善点と次回バックテスト確認事項

1. **workflow timeout と runtime timeout の整合**
   `今回の config は production_timeout_sec=28800 (8時間) を要求していたのに、workflow job は既定 360分で打ち切られた。まず jobs.start-night-batch.timeout-minutes を 540 に固定し、同一 config を再実行して artifact upload まで完走できるか確認する。完了条件は summary json / strategy-ranking.json / upload artifact が生成されること。`

2. **50pack の単一 worker 継続可否の判断**
   `run70 の実績は 400 runs / 1h21m49s で、1 run あたり約 12.29 秒だった。50pack full 2000 runs は同条件なら約 6h49m35s と見積もられるため、timeout 修正後も wall-clock が長すぎる可能性がある。次回は同じ 50pack を 1 worker のまま再実行し、checkpoint の進行速度と総所要時間を記録する。8時間を超えるなら worker 追加または campaign 分割へ移る。`

3. **partial artifact 不在時の観測性補強**
   `今回の run71 は cancel 後に upload step が skipped となり、TEMPLATE.md の主要数値が回収できなかった。次回は timeout 修正後の挙動を見たうえで、必要なら checkpoint / summary をより早い段階で round dir に flush して pickup できるかを検討する。完了条件は cancel 時でも latest checkpoint と campaign 成果物の所在が workflow summary から追えること。`

4. **run70 改善仮説の再開条件**
   `run70 で残っていた改善テーマは SMA20/SMA25 parity、confirm slicing、DD suppression、RSI2x10 ablation の4群だった。run71 は比較不能で終わったため、次回はまず full ranking を回収し、Top 3 / 除外候補 / 集中度を TEMPLATE.md の全欄で埋められる状態まで到達した時点で run70 との差分検証を再開する。`
