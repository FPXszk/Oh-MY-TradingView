# Exec-plan: capture-night-batch-run90_20260503_1414

## 概要

目的: GitHub Actions `Night Batch Self Hosted #90` のアーティファクトを取得し、`docs/research/` に結果サマリを追加する。  
対象 run はユーザー指定の `#90` に固定し、「最新」は `run_number=90` を指すものとして扱う。

## 変更・作成・移動するファイル

- 作成: `docs/research/night-batch-self-hosted-run90_20260503.md`
- 変更: `docs/research/manifest.json`
- 作成済み（PLAN用）: `docs/exec-plans/active/capture-night-batch-run90_20260503_1414.md`
- 実装完了時に移動: `docs/exec-plans/completed/capture-night-batch-run90_20260503_1414.md`

## 実装内容と影響範囲

- GitHub Actions の `Night Batch Self Hosted` 実行一覧から `run_number=90` の `run_id` を特定する
- 対象 run の artifact から `strategy-ranking.json` と `recovered-results.json` を取得する
- composite score を計算し、テンプレート準拠の research ドキュメントを1件追加する
- `manifest.json` の `keep` 配列へ追加し、次回アーカイブ対象から除外する
- 影響範囲は `docs/research/` 配下のドキュメント管理に限定し、アプリケーションコードやテストコードには触れない

## 実装ステップ

- [x] PLAN: スキル手順、テンプレート、既存 active plan の確認
- [ ] IMPLEMENT: `run_number=90` の `run_id` と artifact id を特定
- [ ] IMPLEMENT: artifact を展開して `strategy-ranking.json` / `recovered-results.json` を読み取る
- [ ] IMPLEMENT: composite score、Top戦略、銘柄集中度、除外候補を算出
- [ ] IMPLEMENT: `docs/research/night-batch-self-hosted-run90_20260503.md` をテンプレートに沿って作成
- [ ] IMPLEMENT: `docs/research/manifest.json` に新規ファイル名を追加
- [ ] REVIEW: 数値整合、テンプレートの未記入箇所、判断基準の適用ミスを確認
- [ ] REVIEW: 変更差分が `docs/research/` の必要最小限に収まっていることを確認
- [ ] COMMIT: plan を `docs/exec-plans/completed/` へ移動し、research 変更を Conventional Commits でコミット
- [ ] PUSH: `main` へプッシュして完了報告

## テスト・検証方針

- `gh run list --workflow .github/workflows/night-batch-self-hosted.yml --limit 20` で `run_number=90` を再確認
- artifact 展開後に `jq` もしくは既存スクリプトで JSON の必須キー存在を確認
- 作成した markdown について、`run番号`、`campaign_id`、ランキング表、集中度表、改善点が埋まっていることを目視確認
- `git diff -- docs/research/manifest.json docs/research/night-batch-self-hosted-run90_20260503.md` で差分を確認

## リスク・注意点

- GitHub CLI / Actions API へアクセスできない場合、artifact 取得工程で停止する
- `strategy-ranking.json` の `rank` は PF 順であり、composite score と混同しない
- `recovered-results.json` は `result.metrics` を読む。`result.stats` は使わない
- 既存ワークツリーに `.codex/config.toml` の未コミット変更があるため、この plan 以外はコミット対象に含めない

## 範囲外

- バックテスト自体の再実行
- strategy や campaign のコード修正
- 既存 research ドキュメントの整理やリネーム

---

作成者: Codex
作成日時: 2026-05-03T14:14:00+09:00
