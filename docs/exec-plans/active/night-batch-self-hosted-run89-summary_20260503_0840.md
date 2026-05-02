# night-batch-self-hosted-run89-summary_20260503_0840

## 目的
`Night Batch Self Hosted #89` の実行結果を `backtest-results-capture` の手順に従って回収・集計し、`docs/research/` に run89 の研究ドキュメントを追加する。

## 変更ファイル
- **作成**: `docs/exec-plans/active/night-batch-self-hosted-run89-summary_20260503_0840.md` — 本実装計画
- **作成**: `docs/research/night-batch-self-hosted-run89_20260503.md` — run89 のバックテスト結果まとめ
- **更新**: `docs/research/manifest.json` — run89 ドキュメントを keep 対象に追加

## 実装内容
- GitHub Actions `Night Batch Self Hosted` の run `#89` を特定し、対応 artifact を取得する。
- artifact 内の `strategy-ranking.json` と `recovered-results.json` を読み、composite score・上位戦略・銘柄集中度を計算する。
- `docs/research/TEMPLATE.md` に沿って run89 の研究ドキュメントを作成する。
- `docs/research/manifest.json` に新規ドキュメント名を追加し、次回アーカイブ対象から保護する。

## 影響範囲
- 変更は research ドキュメントと manifest のみ。アプリケーションコード、設定、既存のバックテストロジックには触れない。
- 既存の `run88` manifest 未登録は今回の依頼範囲外とし、横修正しない。

## 実装ステップ
- [ ] `Night Batch Self Hosted #89` の run_id と artifact_id を確認する
- [ ] artifact を取得して `strategy-ranking.json` / `recovered-results.json` から必要データを抽出する
- [ ] composite score、rank-1 の per-symbol breakdown、上位 4 戦略の集中度を算出する
- [ ] `docs/research/night-batch-self-hosted-run89_20260503.md` をテンプレート準拠で作成する
- [ ] `docs/research/manifest.json` に run89 ドキュメントを追加する
- [ ] 作成内容をレビューし、数値・構成・依頼範囲逸脱がないことを確認する
- [ ] 完了後、計画を `docs/exec-plans/completed/` に移動してコミットする

## 確認方法
- `gh run list --workflow .github/workflows/night-batch-self-hosted.yml --limit 20`
- `gh run view <run-id>`
- `gh api repos/FPXszk/Oh-MY-TradingView/actions/artifacts/<artifact-id>/zip > /tmp/artifact-run89.zip`
- 生成した研究ドキュメントと `docs/research/manifest.json` の差分確認

## テスト戦略
- コード変更ではないため自動テスト追加は行わない。
- 代わりに artifact 元データとの数値突合、テンプレート必須セクションの充足、manifest 登録有無を検証する。

## リスク
- artifact ダウンロードや `gh` 認証が失敗すると集計作業に進めない。
- recovered データ件数が多いため、集計時に `result.metrics` キーの参照先を誤ると数値が崩れる。
- rank フィールドは PF 順であり composite score ではないため、別計算が必要。
