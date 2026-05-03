# EMA + MACD + RSI Entry Quality Focus-8 42-Pack Smoke 実装計画

## 概要

直前に追加した `emr-entry-quality-focus8-200pack` から、
**各サブグループの代表 1 本ずつ** を抜き出した 42 本の smoke campaign を作る。

目的は次の 2 点。

1. 200-pack 全体を回す前に、family / subgroup ごとの配線と Pine の基本動作を広く確認する
2. GitHub Actions の smoke workflow で実際に起動して、focus-8 向け 42-pack が最後まで動くか検証する

今回は **baseline + A1-A4 + B1-B5 + C1-C5 + D1-D5 + E1-E4 + F1-F4 + G1-G4 + H1-H2 + I1-I5 + J1-J4 = 42 本**
を固定代表として採用する。

## 前提・スコープ

- 対象 universe は `focus-8`
- 200-pack 本体の strategy-catalog / strategy-presets は変更しない
- 追加するのは **subset campaign / night_batch config / campaign test** が中心
- workflow 本体は変更せず、既存の `Night Batch Self Hosted` を `config_path` 指定で起動する

## 対象ファイル

### 新規作成

| ファイル | 役割 |
|---|---|
| `docs/exec-plans/active/emr-entry-quality-focus8-42pack-smoke_20260503_2240.md` | この計画 |
| `scripts/generate-emr-entry-quality-focus8-42pack-smoke.py` | 42 本 subset の campaign / config / test を生成・同期する補助スクリプト |
| `config/backtest/campaigns/emr-entry-quality-focus8-42pack-smoke.json` | 42 本 subset の focus-8 campaign |
| `config/night_batch/emr-entry-quality-focus8-42pack-smoke-config.json` | GHA smoke 実行用 config |

### 変更

| ファイル | 変更内容 |
|---|---|
| `tests/campaign.test.js` | 42-pack campaign の load / smoke matrix テストを追加 |

### 変更しないもの

- `config/backtest/strategy-catalog.json`
- `config/backtest/strategy-presets.json`
- `docs/references/pine/emr-entry-quality-focus8-200pack/*.pine`
- `.github/workflows/night-batch-self-hosted.yml`

## 42 本の代表選抜

### Family A

1. A1 baseline → `ema-macd-rsi-sl-baseline`
2. A2 EMA 感度変更 → `emr-entry-base-ema10-24`
3. A3 MACD 感度変更 → `emr-entry-base-macd8-21-5`
4. A4 RSI 感度変更 → `emr-entry-base-rsi55`

### Family B

5. B1 → `emr-entry-conf-score3-rsi55`
6. B2 → `emr-entry-conf-score4-rsi55`
7. B3 → `emr-entry-conf-score4hist-rsi55`
8. B4 → `emr-entry-conf-score4closefast-rsi55`
9. B5 → `emr-entry-conf-score5histclose-rsi55`

### Family C

10. C1 → `emr-entry-delay-1barhigh-rsi55`
11. C2 → `emr-entry-delay-1barhighfast-rsi55`
12. C3 → `emr-entry-delay-2barhigh-rsi55`
13. C4 → `emr-entry-delay-2barfasthist-rsi55`
14. C5 → `emr-entry-delay-3barfastslowhist-rsi55`

### Family D

15. D1 → `emr-entry-struct-close5-rsi55`
16. D2 → `emr-entry-struct-close10-rsi55`
17. D3 → `emr-entry-struct-intraday20-rsi55`
18. D4 → `emr-entry-struct-swing20-rsi55`
19. D5 → `emr-entry-struct-donchian55compress-rsi55`

### Family E

20. E1 → `emr-entry-trend-priceema200-firm`
21. E2 → `emr-entry-trend-ema50over200-firm`
22. E3 → `emr-entry-trend-ema200rising-firm`
23. E4 → `emr-entry-trend-adxtrend-firm`

### Family F

24. F1 → `emr-entry-vol-sma-03`
25. F2 → `emr-entry-vol-rel-03`
26. F3 → `emr-entry-vol-spike-obv-03`
27. F4 → `emr-entry-vol-cmf-mfi-03`

### Family G

28. G1 → `emr-entry-volq-atrband-03`
29. G2 → `emr-entry-volq-bbwidth-03`
30. G3 → `emr-entry-volq-squeeze-03`
31. G4 → `emr-entry-volq-range-03`

### Family H

32. H1 → `emr-entry-momo-adx-dmi-03`
33. H2 → `emr-entry-momo-stoch-cci-roc-03`

### Family I

34. I1 → `emr-entry-fake-wick-03`
35. I2 → `emr-entry-fake-gap-03`
36. I3 → `emr-entry-fake-runup-03`
37. I4 → `emr-entry-fake-clv-03`
38. I5 → `emr-entry-fake-failedbreak-03`

### Family J

39. J1 → `emr-entry-pull-fast-03`
40. J2 → `emr-entry-pull-slow-03`
41. J3 → `emr-entry-pull-retest-03`
42. J4 → `emr-entry-pull-fast-hold-03`

## 選抜方針

- 同一 subgroup 内に複数しきい値があるものは、**中間値（概ね `-03` / `rsi55` / `firm`）** を代表にする
- smoke の目的は最適値探索ではなく **ロジック面の広い面確認** なので、極端値ではなく中間代表を使う

## 実装方針

1. 42 本の代表 ID をスクリプト内で固定配列として管理する
2. campaign は `focus-8` の full 42 本、smoke は `SPY` 1 銘柄 × 42 本にする
3. night_batch config は新 campaign を指す専用 `config_path` を作る
4. `gh workflow run` で既存 `Night Batch Self Hosted` を smoke 実行する

## 実装ステップ

- [x] 42 本の切り方をユーザー承認で固定
- [ ] 42 本 subset generator を追加する
- [ ] `config/backtest/campaigns/emr-entry-quality-focus8-42pack-smoke.json` を生成する
- [ ] `config/night_batch/emr-entry-quality-focus8-42pack-smoke-config.json` を生成する
- [ ] `tests/campaign.test.js` に 42-pack の load / smoke テストを追加する
- [ ] 既存テストを実行する
- [ ] `gh workflow run .github/workflows/night-batch-self-hosted.yml --ref main --field config_path=config/night_batch/emr-entry-quality-focus8-42pack-smoke-config.json` を実行する
- [ ] `gh run list` / `gh run view` で smoke 実行結果を確認する
- [ ] plan を `docs/exec-plans/completed/` に移動してコミット / push する

## テスト戦略

### RED

- 新 subset campaign が未登録の状態で `tests/campaign.test.js` に追加したケースが失敗することを確認する

### GREEN

- subset campaign / night_batch config を追加し、campaign テストが通る状態にする

### REFACTOR

- 42 本の代表 ID 配列をスクリプト側に 1 箇所集約し、campaign / config / test で重複管理しない

## 実行後の検証コマンド

- `node --test tests/campaign.test.js`
- `gh workflow run .github/workflows/night-batch-self-hosted.yml --ref main --field config_path=config/night_batch/emr-entry-quality-focus8-42pack-smoke-config.json`
- `gh run list --workflow .github/workflows/night-batch-self-hosted.yml --limit 5`
- `gh run view <run-id>`

## リスク・注意点

- 42 本の代表 ID を手で複製すると campaign / config / test のズレが起きやすい
- smoke workflow は self-hosted runner の空き状況に依存する
- `emr-entry-trend-adxtrend-firm` など、subset に選んだ ID が 200-pack 内の想定代表とズレていないか注意する

## 範囲外

- 200-pack 本体の strategy 定義の変更
- strategy-catalog / strategy-presets の再配線
- full 200-pack の workflow 実行

---

作成者: Copilot
作成日時: 2026-05-03T22:40:00+09:00
