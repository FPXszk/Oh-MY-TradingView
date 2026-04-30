# Exec-plan: fix-winrate-stopout-catalog-and-rerun_20260430_2253

## 概要

目的: `ema-breakout-winrate-stopout-us40-50pack` の workflow 失敗原因である strategy catalog 不整合を修正し、`Night Batch Self Hosted` を再実行する。

現時点の確認結果:

- 失敗 run は `Night Batch Self Hosted` の `run_id=25167631554`
- self-hosted runner 上の `172.31.144.1:9223` preflight / readiness は通過している
- 失敗原因は smoke phase の `Campaign strategy "emr-breakout-winrate-stopout-anchor-trend-price-above-ema200" not found in strategy catalog`
- `config/backtest/campaigns/ema-breakout-winrate-stopout-us40-50pack.json` と `config/backtest/strategy-presets.json` には対象 strategy が存在する
- 一方で `config/backtest/strategy-catalog.json` には同 ID 群が未反映で、campaign 解決時に catalog から落ちている

採用する方針:

- `strategy-catalog.json` を live projection と整合する形で更新する
- 必要なら catalog 整合性テストを補強し、同じ取りこぼしを検知できるようにする
- 検証後、既定 config のまま `Night Batch Self Hosted` を再 dispatch し、新 run の起動結果を確認する

## 変更ファイル

- `docs/exec-plans/active/fix-winrate-stopout-catalog-and-rerun_20260430_2253.md` (本計画の作成)
- `config/backtest/strategy-catalog.json` (新 50-pack の live strategy を catalog に反映)
- `tests/strategy-catalog.test.js` (必要に応じて catalog / presets 整合の回帰検知を補強)
- `docs/exec-plans/completed/fix-winrate-stopout-catalog-and-rerun_20260430_2253.md` (COMMIT step で移動)

## 影響範囲

- campaign 実行時の strategy 解決元である catalog が更新される
- `Night Batch Self Hosted` の既定 config から起動される US campaign が、今回追加済みの 50-pack を正しく解決できるようになる
- `strategy-catalog` 系テストの期待件数や ID 一覧が変わる可能性がある

## 実装ステップ

- [x] `strategy-catalog.json` と `strategy-presets.json` の差分を確認し、今回不足している live strategy 群を特定する
- [x] `config/backtest/strategy-catalog.json` を更新して、新 50-pack の strategy IDs を catalog に反映する
- [x] `tests/strategy-catalog.test.js` と `tests/repo-layout.test.js` を更新し、catalog 件数と live projection を現状へ同期する
- [x] `tests/windows-run-night-batch-self-hosted.test.js` の default campaign 期待値を新 pack に合わせる
- [x] `node --test tests/strategy-catalog.test.js tests/campaign.test.js tests/repo-layout.test.js` と個別の `tests/windows-run-night-batch-self-hosted.test.js` で関連検証を行う
- [x] `gh workflow run 'Night Batch Self Hosted' --ref main --field config_path=config/night_batch/bundle-foreground-reuse-config.json` を再実行する
- [x] `gh run list --workflow 'Night Batch Self Hosted' --limit 5` と `gh run view 25169766862` で再実行結果を確認する

## テスト戦略

- RED: 現状の catalog 不整合を関連テストまたは差分確認で再現する
- GREEN: catalog 更新後に strategy 解決が通ることをテストで確認する
- REFACTOR: 再発防止に必要な最小限のテスト補強だけ行う

## 検証コマンド

- `node --test tests/strategy-catalog.test.js tests/campaign.test.js tests/night-batch.test.js tests/windows-run-night-batch-self-hosted.test.js`
- `gh workflow run 'Night Batch Self Hosted' --ref main --field config_path=config/night_batch/bundle-foreground-reuse-config.json`
- `gh run list --workflow 'Night Batch Self Hosted' --limit 5`
- `gh run view <run-id>`

## リスク・注意点

- `strategy-catalog.test.js` は live count / ID 一覧を固定しているため、catalog 更新に伴って期待値更新が必要になる可能性が高い
- catalog のみ更新しても、別の strategy ID typo が campaign 内に残っていれば再度 smoke で落ちる
- workflow 再実行は self-hosted runner の混雑や一時エラーに影響される
- `tests/night-batch.test.js` はこの環境で長時間完了しなかったため、今回は変更直結の個別テストを優先して確認する

## 実行結果

- 修正 commit `550bcc0` を `main` に push 後、`Night Batch Self Hosted` を再 dispatch した
- 新 run は `run_id=25169766862`
- 記録時点では `start-night-batch` job が起動済みで、queue は通過している

## 範囲外

- 新 50-pack のロジック自体の再設計
- run77 要約や research docs の追加更新
- `NVDA` 依存検証

---

作成者: Codex
作成日時: 2026-04-30T22:53:00+09:00
