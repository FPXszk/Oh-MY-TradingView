# Next long-run US/JP 12×10 campaign registration details

- status: **REGISTERED / LATEST**
- style: detailed Japanese operator report
- date range: 2000-01-01 → 2099-12-31
- 作成日時: 2026-04-14T00:09

---

## 背景

fine-tune 100x10 campaign（US / JP 各 100 銘柄 × 10 戦略）の完走結果を受け、次の実行候補として **代表 12 銘柄 × 上位 10 戦略** の focused campaign を登録した。

100 銘柄のフルスキャンは完了しており、12 銘柄 campaign の目的は：
- 代表銘柄での高速検証サイクル（full で 120 run、100x10 の 1/8 強）
- 3 カテゴリ（winners / mature-range / defense-test）の偏りなき検証
- 新戦略追加時や parameter 微調整時の quick validation base

---

## 10 戦略の構成と選定詳細

### 本線グループ（#1–#4）

これらは fine-tune 100x10 で US / JP 両方で上位に位置した deep-pullback 系の中核戦略。

1. **donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight**
   - 本線 tight winner。US / JP とも安定した net profit と moderate drawdown。

2. **donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early**
   - regime threshold を 48 に緩和した early variant。エントリ頻度が上がり trade count が増加。

3. **donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback**
   - hard-stop を 10% に拡張。drawdown 許容度が高い代わりに回復余地を残す。

4. **donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier**
   - #3 の regime を 50 に緩和。エントリ早期化 + stop 拡張の組み合わせ。

### Strict control グループ（#5–#7）

regime 60 の strict filter を使い、entry timing で切り分ける 3 点セット。

5. **donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict**
   - strict 基準線。

6. **donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early**
   - Donchian 50 で entry を早期化。strict regime との組み合わせ。

7. **donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late**
   - Donchian 60 で entry を遅延化。ノイズ排除だがエントリ機会は減少。

### Exit / Stop 変動グループ（#8–#10）

exit period と hard-stop % の軸で比較する 3 点セット。

8. **donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight**
   - exit 18 で早期撤退。profit lock 効果。

9. **donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide**
   - exit 22 で延長保有。トレンド追従力の比較用。

10. **donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow**
    - hard-stop 6% で最小リスク設定。drawdown 限定だが stop-out 頻度は高い。

---

## US 12 銘柄の選定詳細

### winners（強トレンド代表）
| symbol | label | 選定根拠 |
|--------|-------|----------|
| NVDA | NVIDIA | AI/GPU 需要で近年最強トレンド |
| AAPL | Apple | 長期安定成長の代表格 |
| META | Meta Platforms | SNS/VR で高成長を維持 |
| MSFT | Microsoft | クラウド+AI で持続的成長 |

### mature-range（レンジ～成熟期代表）
| symbol | label | 選定根拠 |
|--------|-------|----------|
| DIS | Walt Disney | メディア巨大企業、レンジ相場が多い |
| QCOM | Qualcomm | 半導体だが成熟フェーズ |
| CAT | Caterpillar | 景気循環型の代表 |
| XOM | Exxon Mobil | エネルギー大手、コモディティ連動 |

### defense-test（防御的/低成長代表）
| symbol | label | 選定根拠 |
|--------|-------|----------|
| INTC | Intel | 成長鈍化した半導体 |
| VZ | Verizon | 高配当・低成長の通信 |
| PFE | Pfizer | ヘルスケア大手、レンジ傾向 |
| T | AT&T | 防御的通信の代表 |

---

## JP 12 銘柄の選定詳細

### winners（商社+製造強トレンド代表）
| symbol | label | 選定根拠 |
|--------|-------|----------|
| TSE:7203 | Toyota Motor | JP 最大時価総額、グローバル製造業 |
| TSE:8002 | Marubeni | 商社セクター代表、近年強トレンド |
| TSE:5802 | Sumitomo Electric Industries | 電線+自動車部品で堅調成長 |
| TSE:8058 | Mitsubishi Corp. | 総合商社最大手 |

### mature-range（テック+海運の成長/変動代表）
| symbol | label | 選定根拠 |
|--------|-------|----------|
| TSE:9984 | SoftBank Group | ボラティリティの高い投資会社 |
| TSE:6857 | Advantest | 半導体テスト装置、景気循環型 |
| TSE:9107 | Kawasaki Kisen Kaisha | 海運大手、変動大 |
| TSE:6506 | Yaskawa Electric | ロボット/FA で成長だが循環性あり |

### defense-test（防御的/低成長代表）
| symbol | label | 選定根拠 |
|--------|-------|----------|
| TSE:7201 | Nissan Motor | 業績低迷の自動車 |
| TSE:4503 | Astellas Pharma | ヘルスケア大手、ディフェンシブ |
| TSE:9432 | NTT | 高配当・低成長の通信 |
| TSE:7751 | Canon | 成熟した精密機器 |

---

## Phase 設計の詳細

12 銘柄 universe では、従来の `symbol_count` のみだと先頭から取得するためカテゴリ偏りが生じる。
そこで `phases.<phase>.symbols` を使い、各 phase で 3 カテゴリすべてをカバーする明示指定を行った。

### US phase symbols

| phase | count | symbols | カテゴリカバー |
|-------|------:|---------|---------------|
| smoke | 3 | NVDA, DIS, INTC | winners×1, mature-range×1, defense-test×1 |
| pilot | 6 | NVDA, AAPL, DIS, QCOM, INTC, VZ | winners×2, mature-range×2, defense-test×2 |
| full | 12 | (全銘柄) | winners×4, mature-range×4, defense-test×4 |

### JP phase symbols

| phase | count | symbols | カテゴリカバー |
|-------|------:|---------|---------------|
| smoke | 3 | TSE:7203, TSE:9984, TSE:7201 | winners×1, mature-range×1, defense-test×1 |
| pilot | 6 | TSE:7203, TSE:8002, TSE:9984, TSE:6857, TSE:7201, TSE:4503 | winners×2, mature-range×2, defense-test×2 |
| full | 12 | (全銘柄) | winners×4, mature-range×4, defense-test×4 |

---

## Config ファイル一覧

| file | type | 内容 |
|------|------|------|
| `config/backtest/universes/next-long-run-us-12.json` | universe | US 12 銘柄（3 カテゴリ × 4） |
| `config/backtest/universes/next-long-run-jp-12.json` | universe | JP 12 銘柄（3 カテゴリ × 4） |
| `config/backtest/campaigns/next-long-run-us-12x10.json` | campaign | US 12×10（120 run） |
| `config/backtest/campaigns/next-long-run-jp-12x10.json` | campaign | JP 12×10（120 run） |

---

## 前世代との関係

| 世代 | 文書 | 位置 |
|------|------|------|
| current (12×10 registration) | この文書 + handoff | `docs/research/latest/` |
| previous (fine-tune complete) | handoff + results | `docs/research/next-long-run-finetune-complete-*_20260413_1623.md` |
| partial | handoff + results | `docs/research/next-long-run-finetune-partial-*_20260410_1503.md` |
