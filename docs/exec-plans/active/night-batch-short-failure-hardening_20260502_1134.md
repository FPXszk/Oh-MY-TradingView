# Exec-plan: night-batch-short-failure-hardening_20260502_1134

作成日時: 2026-05-02 11:34 JST

## 目的

`Night Batch Self Hosted` の短時間終了を調査し、TradingView が起動済みでも chart target / API readiness が整わない一時状態で workflow が短時間 `failure` にならないようにする。

## 事実確認

- `Night Batch Self Hosted #84` は `run_id=25216630873`、`run_number=84`、`2026-05-01 22:45 JST` 開始、`1h23m57s` で **success**
- 短時間で終了した failure は直前の `#83` (`run_id=25216305586`) で、`2026-05-01 22:36 JST` 開始、`3m59s` で **failure**
- `#83` の失敗 step は `Wait for TradingView connection (required gate)`
- `#83` のログでは `bridge=http://172.31.144.1:9223/json/list` は reachable だが chart target が見えず、`tv status` も `api_available=false` のまま 181 秒待機して timeout している
- 現在の gate は `scripts/backtest/wait-for-tradingview-readiness.mjs` + `src/core/night-batch-connection-gate.js` で「待機のみ」を行い、この状態に対する能動回復を持たない

## 変更対象ファイル

- 作成: `docs/exec-plans/active/night-batch-short-failure-hardening_20260502_1134.md`
- 変更予定: `.github/workflows/night-batch-self-hosted.yml`
- 変更予定: `scripts/backtest/wait-for-tradingview-readiness.mjs`
- 変更予定: `src/core/night-batch-connection-gate.js`
- 変更予定: `tests/tradingview-readiness.test.js`
- 変更予定: `tests/windows-run-night-batch-self-hosted.test.js`

## 実装内容と影響範囲

- workflow の required gate 前後で使う readiness / recovery 挙動を最小変更で強化する
- 「TradingView process/bridge は生きているが chart target / API が未準備」のケースを transient failure として扱い、短時間 fail を減らす
- 既存の本当の接続断や bridge unreachable は failure のまま維持し、無限待機にはしない
- 影響範囲は self-hosted workflow の接続 gate、関連テスト、ログ出力

## 実装ステップ

- [ ] `#83` の失敗条件をテストに落とし込み、bridge reachable + chart target missing + `api_available=false` のとき現状 gate が回復不能であることを再現する
- [ ] `.github/workflows/night-batch-self-hosted.yml` の gate 周辺で使う回復導線を決める
- [ ] `scripts/backtest/wait-for-tradingview-readiness.mjs` / `src/core/night-batch-connection-gate.js` に最小の auto-recovery を追加する
- [ ] bridge unreachable など本来 fail すべきケースは fail のまま残ることをテストで固定する
- [ ] 関連ユニットテストを実行して green を確認する
- [ ] ロジック破綻、過剰設計、workflow 依存の増やしすぎがないかレビューする

## テスト戦略

- RED: `tests/tradingview-readiness.test.js` と `tests/windows-run-night-batch-self-hosted.test.js` に失敗条件と期待挙動を追加
- GREEN: gate / workflow を最小修正して新規テストを通す
- REFACTOR: ログ文言と分岐を整理し、既存成功系を壊していないことを確認

## 検証コマンド

- `node --test tests/tradingview-readiness.test.js`
- `node --test tests/windows-run-night-batch-self-hosted.test.js`

## リスクと注意点

- 単純に timeout を延ばすだけでは再発防止にならず、失敗検知も遅くなるため避ける
- Recovery を強くしすぎると本当の異常を隠すので、対象は `bridge reachable` かつ `chart/API 未準備` の状態に限定する
- 既存ワークツリーの未関連変更は今回のコミットに含めない

## スコープ外

- Night batch 本体の戦略ロジック変更
- self-hosted runner の OS 設定や恒久的な GUI セッション運用変更
- `#84` の成功 run 自体への事後修正
