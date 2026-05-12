# Night Batch Run Preparation — emr-next-50pack-us40 (2026-05-01)

**セッション**: 2026-05-01  
**担当**: Copilot CLI  
**目的**: run79 結果を受けた次世代 50 戦略の登録・ワークフロートリガー  
**GitHub Actions Run ID**: 25216039478

---

## セッション概要

### 背景

run79（ema-breakout-winrate-stopout-us40-50pack）の結果分析から以下の課題を抽出：
- 大半の戦略で勝率 7〜17%（目標 35% に対して大幅不足）
- Stop 拡大系（ATR/swinglow）は勝率 32〜36% だが PF < 1.5 で収益性に課題
- volume20x10（PF=2.72）・volume20x15（PF=3.70）が上位安定
- stop-until-breakout-high（rank8, PF=2.65）・stop-until-plus2pct（rank9, PF=2.59）が有望

### 設計方針

- 攻撃的戦略は維持（騙しシグナル削減で勝率改善）
- 目標勝率 ~35%・利益最大化は捨てない
- 既存 Pine エンジンはノータッチ（raw_source builder のみ）
- パラメータ変更のみで 46 本生成

---

## 実施内容

### 生成した戦略（50本 = 再利用4本 + 新規46本）

| グループ | 戦略数 | 目的 |
|---|---|---|
| A: Volume 閾値感度 | 9 (新規7) | vol×0.5〜2.0 スイープ |
| B: Stop-until 深掘り | 8 (新規6) | +1〜+4%, breakout-high との組み合わせ |
| C: Stop 拡大除外確認 | 8 (全新規) | 10/12/15%固定, ATR 1.5/2.0/2.5x, swinglow |
| D: エントリー精度向上 | 10 (全新規) | hist3, RSI55/60, prevHigh, delay 組み合わせ |
| E: 出口最適化 | 8 (全新規) | trail ATR/EMA20/chandelier, partial TP |
| F: 複合改善 | 7 (全新規) | 上記ベストパラメータの組み合わせ |

### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `docs/references/pine/emr-next-50pack-us40/` (46本) | Python ジェネレータで volume20x10 テンプレートからパラメータ置換生成 |
| `config/backtest/strategy-catalog.json` | 176 → 222 エントリ (+46 live) |
| `config/backtest/strategy-presets.json` | 174 → 220 エントリ (+46) |
| `config/backtest/campaigns/emr-next-50pack-us40.json` | 50 戦略キャンペーン（universe=public-top10-us-40） |
| `config/night_batch/emr-next-50pack-us40-config.json` | Night batch config |
| `tests/strategy-catalog.test.js` | live count 174→220, EXPECTED_LIVE_IDS に 46 ID 追加 |
| `tests/repo-layout.test.js` | presets count 174→220, catalog count 176→222 |
| `scripts/generate-emr-next-50pack.py` | Pine ジェネレータスクリプト |
| `scripts/update-catalog-emr-next-50pack.py` | catalog/presets 更新スクリプト |

### テスト結果

```
node --test tests/strategy-catalog.test.js tests/repo-layout.test.js
tests 46 / pass 46 / fail 0
```

### バリデーション結果

- campaign strategy_ids (50本) → 全てプリセットに存在 ✅
- 46本 Pine ファイル → 全て存在 ✅
- catalog → presets 同期 ✅
- night batch config → 正しいキャンペーン ID を参照 ✅

---

## コミット履歴

| コミット | 内容 |
|---|---|
| `6765b07` | docs: emr-next-50pack exec-plan 作成 |
| `94cdd70` | feat: emr-next-50pack-us40 - 46 new strategies registered for phase-17 |

---

## ワークフロートリガー

```bash
gh workflow run night-batch-self-hosted.yml \
  --field config_path=config/night_batch/emr-next-50pack-us40-config.json
```

- **Run ID**: 25216039478  
- **Status**: 起動中（トリガー直後）  
- **Config**: `config/night_batch/emr-next-50pack-us40-config.json`  
- **Campaign**: `emr-next-50pack-us40`  
- **Universe**: `public-top10-us-40`（40銘柄）  
- **Smoke symbols**: SPY のみ → 通過後 40 銘柄フル実行

---

## 観察ポイント（結果分析時に注目）

1. **Group A volume スイープ**: PF と勝率の相関。vol×1.0 を下回ると勝率が落ちるか？ vol×1.5 が引き続き最優秀か？
2. **Group B stop-until 深掘り**: +1/+2/+3/+4% の中で最も PF・勝率バランスが良いのはどこか？ +2% が引き続きベストか確認
3. **Group C stop 拡大**: ATR stop や swinglow の PF が本当に < 1.5 で確定するか。前回との再現性確認
4. **Group D エントリー精度**: RSI55/60 + volume の組み合わせが勝率向上に寄与するか
5. **Group E 出口最適化**: partial TP + trail の組み合わせが PF を伸ばせるか
6. **Group F 複合**: `emr-next-combo-ultimate`（20D高値 + vol1.2 + RSI60 + stop-until+2%）が最高 PF を出せるか

---

## 次のステップ（結果待ち）

1. GitHub Actions run 完了後、artifacts から結果 CSV を取得
2. `docs/research/` に run83 分析レポート作成
3. Group F の結果に基づき phase-18 計画を検討
