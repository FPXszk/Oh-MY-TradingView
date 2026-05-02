# EMR A+E 30-Pack スモーク調査 過去トラ

- session date: `2026-05-02`
- campaign: `emr-ae-30pack-focus8`
- smoke workflow: `Night Batch Smoke`
- 関連 GHA runs:
  - `25253519712` — 最初のスモーク（失敗: 全30戦略バリデーションエラー）
  - `25254112383` — 修正後スモーク（成功: 30/30 pass via rerun-1）

---

## 問題① GHA が smoke failure を success として報告する

### 症状

- `Night Batch Smoke` ワークフローが `✓ success` を返しても、スモーク内容は全戦略失敗していた
- GHA 上は成功に見えるためデバッグが困難だった

### 原因

- Node.js の campaign runner (`run-long-campaign.mjs`) は、全戦略がバリデーションエラーでも exit 0 を返す（`main().catch()` にかからないため）
- Python の `execute_smoke_prod` は `smoke_result['success']` をプロセス exit code でのみ判定していた
- `smoke_only` パスで `return 0, steps, None` を無条件に返していた (line 2211)

### 修正

`python/night_batch.py` に `_check_smoke_campaign_results()` を追加:
- smoke 完了後に `artifacts/campaigns/{id}/smoke/recovered-summary.json` を読む
- `failure > 0` なら `EXIT_STEP_FAILED` を返す
- commit: `30ac7c7`

---

## 問題② `strategy-catalog.json` に `parameters` フィールドが欠落

### 症状

```
parameters is required and must be an object
```

全30戦略が上記エラーで即死。スモーク run 自体は1分未満で終了（バリデーション失敗のため）。

### 原因

- `loadCampaign` は `strategy-presets.json` ではなく **`strategy-catalog.json`** を実行時のソースとして使用する (`src/core/campaign.js` line 429-430)
- `strategy-catalog.json` に追加した30エントリに `parameters` フィールドを入れ忘れていた
- `validatePreset` が `parameters` を必須オブジェクトとして検証する

### 修正

`config/backtest/strategy-catalog.json` の全30 `emr-ae-*` エントリに `parameters` を追加。
commit: `30ac7c7`

---

## 問題③ `strategy-presets.json` の `trailActivationPct` 値が誤り

### 症状

`ema20` バリアントの `trailActivationPct` が全て `5` になっていた。

### 原因

- Pine スクリプトでは `trailActivationPct` は TP% に一致させる設計（`tp10-ema20` → `act=10`）
- presets 生成時にすべて `5` でハードコードしてしまった

### 修正

`strategy-presets.json` の `ema20` バリアント全エントリを修正:
- `tp10-ema20` → `act=10`
- `tp12-ema20` → `act=12`
- `tp15-ema20` → `act=15`
- `tp8-atr25` / `tp5-atr15` 系は `act=5` のまま（Pine スクリプトに準拠）
- commit: `30ac7c7`

---

## 問題④ スモークプライマリラン全30戦略 FAIL（初回コンパイル問題）

### 症状

修正後のスモーク (`25254112383`) にて:
- **Primary run**: 全30戦略が `FAIL (Strategy not verified in chart studies after compile + retry)` 
- **Rerun-1**: 全30戦略が `OK (~11-12 秒/戦略)`
- 最終結果: `Success: 30, Failure: 0, Total: 30`（GHA ✓）

### 原因

新規追加した Pine スクリプトは TradingView に「初回コンパイル」が必要。
初回パスでは chart studies への登録が完了せず verify に失敗するが、rerun-1 では既にコンパイル済みなので通る。
既存戦略では発生しない（すでにコンパイル済みのため）。

### 対処

- `max_rerun_passes: 2` の設定により自動リカバリーされた
- 新規 Pine スクリプトを大量追加した際は初回スモークで primary 全 FAIL → rerun-1 全 PASS が起きうる（正常動作）
- **次回以降は問題ない**（一度コンパイルされると TradingView 側でキャッシュされる）

---

## 最終確認

| フェーズ | 結果 |
|---|---|
| Primary smoke | 0/30 pass (全戦略バリデーション失敗 → 初回コンパイル問題) |
| Rerun-1 smoke | 30/30 pass |
| smoke conclusion | ✅ **SUCCESS** (30/30) |
| GHA exit code 修正 | ✅ 適用済み (`30ac7c7`) |

---

## 教訓

1. **カタログとプリセットは両方更新が必要**: `strategy-presets.json` を更新しても `strategy-catalog.json` を更新しなければ実行時エラーになる
2. **新規 Pine スクリプトの初回スモークは primary FAIL が想定内**: rerun-1 で全通過ならセーフ
3. **GHA success = smoke content success ではない**: `_check_smoke_campaign_results()` の追加で今後は正しく exit code が伝播する
