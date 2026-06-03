# Exec-plan: us-screener-live-workflow-verification_20260604_0200

## 概要

目的: 直前に入れた米国株 daily screener 表示変更について、ローカルテストだけでなく GitHub Actions の実際の workflow 実行で確認する。

今回のゴール:

- `.github/workflows/daily-screener.yml` を `workflow_dispatch` で実行する
- 対象 run が成功し、publish-to-WSL まで完了していることを確認する
- 生成成果物で、US レポートから上段 `Phase2 テーマランキング` が消えていることを確認する
- 生成成果物で、米国株の個別銘柄表示がティッカーのみになっていることを確認する
- 必要なら失敗内容を読んで最小修正し、再実行して確認する

## 直前セッションからの引き継ぎ

- `docs/exec-plans/completed/us-screener-hierarchy-layout-trim_20260604_0145.md`
  - US 側だけ `Phase2 テーマランキング` を消し、ティッカー表示を company name なしにする変更を `main` へ push 済み
- 直前確認では `tests/daily-screener-report.test.js` は通過した
- ただし `node scripts/screener/run-fundamental-screening.mjs` のローカル実行は 120 秒でタイムアウトしており、実ワークフロー確認が未了

## 変更・作成ファイル

| ファイル | 種別 | 役割 |
|---|---|---|
| `docs/exec-plans/active/us-screener-live-workflow-verification_20260604_0200.md` | CREATE | 本計画 |
| `docs/exec-plans/completed/us-screener-live-workflow-verification_20260604_0200.md` | MOVE | 完了時に移動 |
| `.github/workflows/daily-screener.yml` | READ | 実行対象 workflow 定義の確認 |
| `docs/reports/screener/daily-ranking.md` | VERIFY | WSL publish 後の最終レポート確認 |
| `docs/reports/screener/daily-ranking-run.json` | VERIFY | run metadata の確認 |

## 影響範囲

- GitHub Actions `daily-screener`
- Windows self-hosted runner 上の publish-to-WSL フロー
- `main` へ同期される `docs/reports/screener/daily-ranking.md`

## 範囲外

- 日本株 workflow の live 実行
- スコアリングロジック自体の再設計
- 依頼外のレポートレイアウト変更

## 実装方針

### 1. まず現行 main の workflow をそのまま回す

- 追加修正を入れる前に、現状コードで `daily-screener.yml` を dispatch する
- 失敗した場合のみ logs / annotations / artifacts を読んで原因を特定する

### 2. 確認ポイントは UI ではなく成果物ベースで固定する

- run conclusion だけでなく、最終 `daily-ranking.md` と metadata を見る
- 「見た目が意図どおりか」を section 見出しとティッカー表記で具体確認する

## 実施ステップ

- [ ] Step 1: workflow 名・dispatch 方法・直近 run 参照方法を確認する
  - 確認: `gh workflow run daily-screener.yml` と `gh run list/view` で追跡できる

- [ ] Step 2: plan を commit / push し、現行 main で workflow を起動する
  - 確認: 新しい run ID を控える

- [ ] Step 3: 実行完了まで監視し、結論と主要 job を確認する
  - 確認: run success / failure
  - 確認: publish-to-WSL step の成否

- [ ] Step 4: 成果物を確認する
  - 確認: `Phase2 テーマランキング` が消えている
  - 確認: `NVDA (NVIDIA...)` 形式でなくティッカーのみ
  - 確認: metadata に今回 run 情報が反映されている

- [ ] Step 5: 失敗時は最小修正して再実行する
  - 確認: 原因と修正範囲が依頼スコープ内に収まる

- [ ] Step 6: REVIEW / COMMIT
  - 確認: plan を `completed/` へ移動し、必要変更があれば `main` へ commit / push する

## テスト戦略

- Live verification 優先
  - `gh workflow run daily-screener.yml`
  - `gh run view <run-id> --log-failed` または summary 参照
- 補助
  - `node --test tests/daily-screener-report.test.js`

## 検証コマンド

- `gh workflow run daily-screener.yml --ref main`
- `gh run list --workflow daily-screener.yml --limit 5`
- `gh run view <run-id>`
- `gh run download <run-id>`

## リスク・注意点

- self-hosted runner 側の空き状況や外部データ取得状況で実行時間が長くなる可能性がある
- publish-to-WSL が成功すると `main` のレポート生成物が更新される
- run success でもレポート内容確認までは必須とする

## 競合確認

- active plan:
  - `docs/exec-plans/active/screener-architecture-flow-doc_20260601_1430.md`
  - `docs/exec-plans/active/japan-screener-granularity-and-source-feasibility_20260602_1447.md`
  - `docs/exec-plans/active/japan-screener-theme-implementation-and-live-debug_20260602_1500.md`
- 今回は既存 main の daily screener workflow 実行確認が主目的で、直接競合しない

---

作成者: Codex
作成日時: 2026-06-04T02:00:00+09:00
