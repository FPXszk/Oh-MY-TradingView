# Next long-run US/JP 12×10 campaign registration handoff

- status: **REGISTERED / HANDOFF READY**
- scope: `next-long-run-us-12x10` + `next-long-run-jp-12x10` campaign registration
- 作成日時: 2026-04-14T00:09

---

## What changed

1. fine-tune 100x10 完走結果から **上位 10 戦略** を選定し、統一 preset set として確定した
2. US / JP 各 **12 銘柄（3 カテゴリ × 4 銘柄）** の universe を新規登録した
3. US / JP 各 **12×10 campaign** を新規登録した
4. `docs/research/current/` の世代を fine-tune complete results から 12×10 registration へ更新した

---

## Read this first

1. [`README.md`](./README.md)
2. [`next-long-run-us-jp-12x10-details_20260414_0009.md`](./next-long-run-us-jp-12x10-details_20260414_0009.md)
3. 前世代: `../next-long-run-finetune-complete-handoff_20260413_1623.md`

---

## 10 戦略の選定理由

fine-tune 100x10 の US full / JP full 完走結果（各 1000/1000 success）を基に、以下の方針で上位 10 を選定した：

- fine-tune 100x10 の **共通 preset** を中心に、US / JP 両方で安定したものを優先
- entry / exit / stop の各軸で代表的なバリアントを網羅
- regime threshold, hard-stop %, Donchian period の異なる組み合わせを維持

### 確定 10 preset IDs

| # | preset ID | 選定根拠 |
|---|-----------|----------|
| 1 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 本線 tight winner |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early` | regime 緩和 early variant |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | stop 拡張 deep-pullback |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier` | regime+stop 緩和 |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | strict regime control |
| 6 | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | strict + entry 早期化 |
| 7 | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | strict + entry 遅延化 |
| 8 | `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | exit 狭小化 |
| 9 | `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide` | exit 拡大化 |
| 10 | `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow` | stop 狭小化 |

---

## US 12 銘柄（3 カテゴリ構成）

| category | symbols | 選定根拠 |
|----------|---------|----------|
| winners | NVDA, AAPL, META, MSFT | 強トレンド代表 |
| mature-range | DIS, QCOM, CAT, XOM | レンジ～成熟期の代表 |
| defense-test | INTC, VZ, PFE, T | 防御的/低成長の代表 |

## JP 12 銘柄（3 カテゴリ構成）

| category | symbols | 選定根拠 |
|----------|---------|----------|
| winners | TSE:7203, TSE:8002, TSE:5802, TSE:8058 | 商社+製造強トレンド代表 |
| mature-range | TSE:9984, TSE:6857, TSE:9107, TSE:6506 | テック+海運の成長/変動代表 |
| defense-test | TSE:7201, TSE:4503, TSE:9432, TSE:7751 | 防御的/低成長の代表 |

---

## 期間

- from: `2000-01-01`
- to: `2099-12-31`（latest available bar まで）
- 理由: fine-tune 100x10 と同一期間で再検証し、比較可能性を維持する

---

## 次回実行対象

| item | ID |
|------|----|
| US campaign | `next-long-run-us-12x10` |
| JP campaign | `next-long-run-jp-12x10` |
| US universe | `next-long-run-us-12` |
| JP universe | `next-long-run-jp-12` |

---

## Phase 設計

| phase | symbols | matrix (×10 strategies) | カテゴリカバー |
|-------|--------:|------------------------:|---------------|
| smoke | 3 | 30 | winners×1, mature-range×1, defense-test×1 |
| pilot | 6 | 60 | winners×2, mature-range×2, defense-test×2 |
| full | 12 | 120 | winners×4, mature-range×4, defense-test×4 |

smoke と pilot では `phases.<phase>.symbols` で明示指定し、カテゴリ偏りを排除している。
