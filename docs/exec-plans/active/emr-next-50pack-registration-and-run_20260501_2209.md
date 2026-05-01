# emr-next-50pack registration and run

**作成日時**: 2026-05-01 22:09  
**目的**: 次回バックテスト 50 戦略（emr-next-50pack）を night batch ワークフローに登録し、smoke 確認後に GHA ワークフローを実行する。

---

## 背景と前提

- ベース戦略: EMA(9/20) + MACD(12,26,9) + RSI(14) + -8% stop
- 前回 run79（ema-breakout-winrate-stopout-us40-50pack）の結果を受けて設計した 50 戦略を登録
- 目標: 勝率 ~35%・利益最大化維持・騙しシグナル削減
- Pine ファイルはすべて `raw_source` builder（既存テンプレートのパラメータ変更のみ）

---

## 変更・作成するファイル

| 操作 | ファイル |
|---|---|
| 作成 | `docs/references/pine/emr-next-50pack-us40/` (46 pine files) |
| 更新 | `config/backtest/strategy-catalog.json` (+46 entries) |
| 更新 | `config/backtest/strategy-presets.json` (+46 entries) |
| 更新 | `tests/strategy-catalog.test.js` (count 174→220, EXPECTED_LIVE_IDS +46) |
| 作成 | `config/backtest/campaigns/emr-next-50pack-us40.json` |
| 作成 | `config/night_batch/emr-next-50pack-us40-config.json` |
| 作成 | `docs/research/emr-next-50pack-setup_20260501.md` (session log) |

---

## 50 戦略の定義（パラメータ変更一覧）

**ベーステンプレートパラメータ**（全戦略共通の固定値）:

```
emaFastLen=9, emaSlowLen=20, macdFast=12, macdSlow=26, macdSignal=9
rsiLen=14, rsiEmaLen=14, rsiLevel=50
breakoutCloseLen=10, breakoutIntradayLen=0, breakoutCloseAtrBufferMult=0
trendMode="price_above_ema200"
signalLowBufferStop=false, breakevenTriggerPct=0, breakevenLockPct=0
reentryMode="none", reentryWindowBars=0, reentryBreakoutLen=0
reentryRequireTrend=false, reentryUseHalfSize=false
initialStopLookback=5
```

**変更対象パラメータ（デフォルト = 以下のとおり）**:

```
stopPct=8, breakoutVolumeRatio=0, requirePrevHighBreak=false
delayBars=0, delayRequireSignalHigh=false, delayRequireFastEma=false, delayRequireHistRising=false
trendMode="price_above_ema200"
stopActivationBars=0, stopActivationProfitPct=0, stopActivationUntilBreakoutHigh=false
initialStopMode="fixed_pct", initialStopAtrMult=0
tp1Pct=0, tp1Qty=0
trailMode="none", trailActivationPct=0, trailAtrPeriod=14, trailAtrMult=0
trailChandelierLen=22, trailChandelierMult=0
profitProtectMode="none", profitProtectTriggerPct=0, profitProtectRsiThreshold=55
strengthRsiMin=0, strengthHistPositive=false, strengthHist3=false
strengthCloseAboveFastEma=false, strengthBreakoutLen=0
```

### Group A: Volume 閾値感度 (9戦略)

| ID | 新規/再利用 | 変更パラメータ |
|---|---|---|
| `emr-next-vol20x05` | 新規 | breakoutVolumeRatio=0.5 |
| `emr-next-vol20x08` | 新規 | breakoutVolumeRatio=0.8 |
| `emr-breakout-winrate-stopout-entry-confirm-volume20x10` | **再利用** | (既存) |
| `emr-next-vol20x11` | 新規 | breakoutVolumeRatio=1.1 |
| `emr-next-vol20x12` | 新規 | breakoutVolumeRatio=1.2 |
| `emr-next-vol20x13` | 新規 | breakoutVolumeRatio=1.3 |
| `emr-next-vol20x14` | 新規 | breakoutVolumeRatio=1.4 |
| `emr-breakout-winrate-stopout-entry-confirm-volume20x15` | **再利用** | (既存) |
| `emr-next-vol20x20` | 新規 | breakoutVolumeRatio=2.0 |

### Group B: Stop-until 深掘り (8戦略)

| ID | 新規/再利用 | 変更パラメータ |
|---|---|---|
| `emr-breakout-winrate-stopout-stop-until-breakout-high` | **再利用** | (既存) |
| `emr-next-stop-until-plus1pct` | 新規 | stopActivationProfitPct=1 |
| `emr-breakout-winrate-stopout-stop-until-plus2pct` | **再利用** | (既存) |
| `emr-next-stop-until-plus3pct` | 新規 | stopActivationProfitPct=3 |
| `emr-next-stop-until-plus4pct` | 新規 | stopActivationProfitPct=4 |
| `emr-next-stop-until-bkhigh-vol10` | 新規 | stopActivationUntilBreakoutHigh=true, breakoutVolumeRatio=1.0 |
| `emr-next-stop-until-plus2-vol10` | 新規 | stopActivationProfitPct=2, breakoutVolumeRatio=1.0 |
| `emr-next-stop-until-plus2-rsi60` | 新規 | stopActivationProfitPct=2, strengthRsiMin=60 |

### Group C: Stop 拡大系除外基準確認 (8戦略)

| ID | 変更パラメータ |
|---|---|
| `emr-next-stop-fixed10pct` | stopPct=10 |
| `emr-next-stop-fixed12pct` | stopPct=12 |
| `emr-next-stop-fixed15pct` | stopPct=15 |
| `emr-next-stop-atr15x` | initialStopMode="atr_from_entry", initialStopAtrMult=1.5 |
| `emr-next-stop-atr20x` | initialStopMode="atr_from_entry", initialStopAtrMult=2.0 |
| `emr-next-stop-atr25x` | initialStopMode="atr_from_entry", initialStopAtrMult=2.5 |
| `emr-next-stop-swinglow-2bar` | initialStopMode="swing_low_atr", initialStopLookback=2, initialStopAtrMult=0 |
| `emr-next-stop-swinglow-5bar` | initialStopMode="swing_low_atr", initialStopLookback=5, initialStopAtrMult=0 |

### Group D: エントリー精度向上 (10戦略)

| ID | 変更パラメータ |
|---|---|
| `emr-next-entry-hist3-closefa` | strengthHist3=true, strengthCloseAboveFastEma=true |
| `emr-next-entry-ema50-200-vol10` | trendMode="ema50_above_ema200", breakoutVolumeRatio=1.0 |
| `emr-next-entry-rsi55-vol12` | strengthRsiMin=55, breakoutVolumeRatio=1.2 |
| `emr-next-entry-rsi55-prevhigh` | strengthRsiMin=55, requirePrevHighBreak=true |
| `emr-next-entry-rsi60-vol12` | strengthRsiMin=60, breakoutVolumeRatio=1.2 |
| `emr-next-entry-hist-rsi55-vol10` | strengthHistPositive=true, strengthRsiMin=55, breakoutVolumeRatio=1.0 |
| `emr-next-entry-delay1-prevhigh` | delayBars=1, requirePrevHighBreak=true, delayRequireSignalHigh=true |
| `emr-next-entry-closeefa-vol12` | strengthCloseAboveFastEma=true, breakoutVolumeRatio=1.2 |
| `emr-next-entry-20dhigh-rsi55` | breakoutCloseLen=20, strengthRsiMin=55 |
| `emr-next-entry-hist3-rsi55-vol10` | strengthHist3=true, strengthRsiMin=55, breakoutVolumeRatio=1.0 |

### Group E: 出口最適化 (8戦略)

| ID | 変更パラメータ |
|---|---|
| `emr-next-exit-trail-atr15-from3` | trailMode="atr", trailAtrMult=1.5, trailActivationPct=3 |
| `emr-next-exit-trail-atr25-from5` | trailMode="atr", trailAtrMult=2.5, trailActivationPct=5 |
| `emr-next-exit-tp5-trail-atr15` | tp1Pct=5, tp1Qty=50, trailMode="atr", trailAtrMult=1.5, trailActivationPct=5 |
| `emr-next-exit-tp8-trail-atr25` | tp1Pct=8, tp1Qty=50, trailMode="atr", trailAtrMult=2.5, trailActivationPct=8 |
| `emr-next-exit-tp10-trail-ema20` | tp1Pct=10, tp1Qty=50, trailMode="ema20", trailActivationPct=10 |
| `emr-next-exit-chandelier22-3atr` | trailMode="chandelier", trailChandelierLen=22, trailChandelierMult=3.0 |
| `emr-next-exit-ema20-after5` | profitProtectMode="ema20", profitProtectTriggerPct=5 |
| `emr-next-exit-rsi-loss-after8` | profitProtectMode="rsi_loss", profitProtectTriggerPct=8, profitProtectRsiThreshold=55 |

### Group F: 複合改善 (7戦略)

| ID | 変更パラメータ |
|---|---|
| `emr-next-combo-vol12-bkhigh` | breakoutVolumeRatio=1.2, stopActivationUntilBreakoutHigh=true |
| `emr-next-combo-vol12-plus2` | breakoutVolumeRatio=1.2, stopActivationProfitPct=2 |
| `emr-next-combo-20dhigh-vol10-trail25` | breakoutCloseLen=20, breakoutVolumeRatio=1.0, trailMode="atr", trailAtrMult=2.5, trailActivationPct=5 |
| `emr-next-combo-ema50200-vol12-stop12` | trendMode="ema50_above_ema200", breakoutVolumeRatio=1.2, stopPct=12 |
| `emr-next-combo-rsi60-vol10-bkhigh` | strengthRsiMin=60, breakoutVolumeRatio=1.0, stopActivationUntilBreakoutHigh=true |
| `emr-next-combo-rsi55-vol10-trail-ema20` | strengthRsiMin=55, breakoutVolumeRatio=1.0, trailMode="ema20", profitProtectMode="ema20", profitProtectTriggerPct=5 |
| `emr-next-combo-ultimate` | breakoutCloseLen=20, breakoutVolumeRatio=1.2, strengthRsiMin=60, stopActivationProfitPct=2 |

---

## 実装ステップ（チェックボックス形式）

- [ ] **Step 1**: `docs/references/pine/emr-next-50pack-us40/` ディレクトリ作成＋Python ジェネレータで 46 pine 生成
- [ ] **Step 2**: `strategy-catalog.json` に 46 エントリ追加（末尾に追記）
- [ ] **Step 3**: `strategy-presets.json` に 46 エントリ追加（catalog と同順序）
- [ ] **Step 4**: `tests/strategy-catalog.test.js` を更新（count 174→220、EXPECTED_LIVE_IDS に 46 ID 追記）
- [ ] **Step 5**: `config/backtest/campaigns/emr-next-50pack-us40.json` 作成
- [ ] **Step 6**: `config/night_batch/emr-next-50pack-us40-config.json` 作成
- [ ] **Step 7**: `npm test` で全テストがパスすることを確認
- [ ] **Step 8**: smoke フェーズ確認（SPY 単体で 1 戦略試し打ち）
- [ ] **Step 9**: GHA ワークフロートリガー（`gh workflow run`）
- [ ] **Step 10**: セッションログ作成・push

---

## スコープ外

- 新しい Pine エンジン機能追加（ADX フィルタ等）
- JP 市場向け設定
- 既存の night batch 既定 config（bundle-foreground-reuse-config.json）の変更

---

## リスクと注意事項

1. **テスト制約**: `strategy-catalog.test.js` が live count と EXPECTED_LIVE_IDS を厳密にチェック。更新必須
2. **strategy-presets.json との同期**: catalog と presets の ID 順序が完全一致している必要がある
3. **Pine ファイルの `variantId` フィールド**: 各ファイルの `variantId` 変数が実際の strategy ID と一致していること
4. **smoke テストの対象**: SPY 1 銘柄で全 50 戦略が validation error なく完走すること（前回 run79 では 10 戦略が validation error）
5. **workflow trigger**: self-hosted runner / TradingView / CDP が正常稼働していることが前提

---

## 検証コマンド

```bash
# テスト
npm test

# smoke 単体確認
node src/cli/index.js backtest preset emr-next-vol20x05 --symbol SPY

# ワークフロートリガー
gh workflow run night-batch-self-hosted.yml --field config_path=config/night_batch/emr-next-50pack-us40-config.json
```
