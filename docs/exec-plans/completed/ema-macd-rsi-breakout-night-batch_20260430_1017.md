# Exec-plan: ema-macd-rsi-breakout-night-batch_20260430_1017

## 概要

目的: 最新の night batch/backtest が `docs/references/pine/ema-macd-rsi-breakout-us40-50pack` ベースかを確認し、そうでなければその 50-pack を基準に実行設定を切り替え、GitHub Actions の workflow を起動して結果取得まで進める。

現時点の確認結果:

- 既定 workflow: `.github/workflows/night-batch-self-hosted.yml`
- 既定 `config_path`: `config/night_batch/bundle-foreground-reuse-config.json`
- 既定 `us_campaign`: `strongest-plus-recovery-reversal-us40-10pack`
- 直近の最新完走レポート: `docs/research/night-batch-self-hosted-run72_20260429.md`
- run72 の対象 campaign: `deep-pullback-plus-recovery-us40-50pack`
- したがって、**最新 backtest は `ema-macd-rsi-breakout-us40-50pack` ベースではない**

解釈と採用方針:

- 解釈A: night batch が参照する US campaign 自体を `ema-macd-rsi-breakout-us40-50pack` に切り替える
- 解釈B: 現行 campaign を維持したまま、個別 preset の設定値だけ EMA/MACD/RSI 系へ寄せる
- 本プランでは **解釈A** を採用する。理由は、ユーザー要望が「上記をベースにしたバックテスト結果が欲しい」であり、`config/backtest/campaigns/ema-macd-rsi-breakout-us40-50pack.json` がすでに実行可能な campaign として存在するため

## 変更ファイル

- `docs/exec-plans/active/ema-macd-rsi-breakout-night-batch_20260430_1017.md` (本計画の作成)
- `config/night_batch/bundle-foreground-reuse-config.json` (既定 US campaign を EMA/MACD/RSI 50-pack に変更する想定)
- 必要なら `docs/research/night-batch-self-hosted-run*_*.md` または関連最新 summary (workflow 完走後の生成/更新結果を確認)
- `docs/exec-plans/completed/ema-macd-rsi-breakout-night-batch_20260430_1017.md` (COMMIT step で移動)

## 影響範囲

- `workflow_dispatch` の既定 config を使った次回 night batch 実行対象が US 側で変更される
- `config/backtest/campaigns/ema-macd-rsi-breakout-us40-50pack.json` 自体は原則そのまま利用し、必要時のみ追加修正する
- self-hosted runner 上で実行されるため、`artifacts/night-batch/` と `artifacts/campaigns/` 系の結果が更新される可能性がある

## 実装ステップ

- [ ] 現行 `bundle-foreground-reuse-config.json` と `ema-macd-rsi-breakout-us40-50pack` campaign の整合を最終確認する
- [ ] `config/night_batch/bundle-foreground-reuse-config.json` の `bundle.us_campaign` を `ema-macd-rsi-breakout-us40-50pack` へ変更する
- [ ] 必要なら date range や phase 定義が workflow 想定と矛盾しないか確認し、最小限の補正だけ行う
- [ ] ローカルで JSON 整合性と参照 campaign の存在を検証する
- [ ] `gh workflow run .github/workflows/night-batch-self-hosted.yml --ref main --field config_path=config/night_batch/bundle-foreground-reuse-config.json` を実行する
- [ ] `gh run list` / `gh run view` で起動確認と run ID 採番を確認する
- [ ] 取得できた範囲の workflow 状態と、EMA/MACD/RSI ベースへ切り替わった根拠を報告する

## テスト戦略

- RED: なし。既存設定の切替タスクであり、まず参照先が現状 EMA/MACD/RSI でないことを確認済み
- GREEN: JSON 構文確認と参照 campaign の存在確認を通す
- REFACTOR: なし。設定変更は外科的に 1 箇所へ限定する

## 検証コマンド

- `node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('config/night_batch/bundle-foreground-reuse-config.json','utf8')); console.log('ok')"`
- `node -e "const fs=require('fs'); const cfg=JSON.parse(fs.readFileSync('config/night_batch/bundle-foreground-reuse-config.json','utf8')); const id=cfg.bundle.us_campaign; const campaign=JSON.parse(fs.readFileSync('config/backtest/campaigns/'+id+'.json','utf8')); console.log(campaign.id)"`
- `gh workflow run .github/workflows/night-batch-self-hosted.yml --ref main --field config_path=config/night_batch/bundle-foreground-reuse-config.json`
- `gh run list --workflow .github/workflows/night-batch-self-hosted.yml --limit 5`
- `gh run view <run-id>`

## リスク・注意点

- `docs/exec-plans/active/run-night-batch_20260429_2344.md` という未完了 plan があり、workflow 実行タスクと一部重なる
- self-hosted runner の状態次第で queue/failure/stall が起こり得る
- 既定 config を更新すると、以後同 config を使う手動/定期実行の対象 campaign も変わる
- ユーザー意図が解釈Bだった場合は、実装前に計画の見直しが必要

## 範囲外

- `config/backtest/strategy-presets.json` 内の EMA/MACD/RSI preset 定義の再設計
- Pine source 自体のロジック改変
- JP campaign の追加変更

---

作成者: Codex
作成日時: 2026-04-30T10:17:00+09:00
