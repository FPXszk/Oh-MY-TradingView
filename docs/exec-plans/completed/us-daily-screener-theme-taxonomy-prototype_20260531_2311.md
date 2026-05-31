# US日次スクリーナー テーマ分類プロトタイプ 実装計画

## ゴール

`daily-screener` の米国レポートに、TradingView の粗い `sector` とは別レイヤーで **中粒度テーマ分類** を試作導入し、実際に workflow を 1 回動かして表示を確認する。

今回の完了条件:

1. US スクリーナー結果に theme taxonomy が付与される
2. Markdown レポートに theme ranking / theme tag が表示される
3. 既存の sector ranking は維持される
4. GitHub Actions `daily-screener` を 1 回実行し、生成レポートを確認できる

## 前提と解釈

- 依頼の中心は「stock-themes.com のような粒度を参考にした試作」であり、完全な本番 taxonomy の完成ではない
- 今回は **US workflow のみ** を対象とし、JP 版には波及させない
- 粒度は 2 層にする
  - 中粒度テーマ: 10〜15個程度
  - 細粒度テーマ: 30〜60個未満の初期タグ
- 既存の Phase1 sector selection ロジックは壊さず、まずは **Phase2 通過銘柄への再分類** と **別表表示** に留める
- 細粒度テーマは provider 依存ではなく、repo 側ルールベースで持つ

## 変更ファイル一覧

| ファイル | 操作 | 内容 |
|---|---|---|
| `docs/exec-plans/active/us-daily-screener-theme-taxonomy-prototype_20260531_2311.md` | CREATE | 本計画 |
| `config/screener/theme-taxonomy-us.json` | CREATE | 中粒度テーマと細粒度テーマの定義 |
| `src/core/theme-taxonomy.js` | CREATE | theme 判定ロジック。sector / industry / symbol / keyword で tag 付与 |
| `src/core/fundamental-screener.js` | MODIFY | 通過銘柄へ theme 情報を付与し、theme 集計を返す |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | theme ranking と銘柄별 theme 表示を Markdown に追加 |
| `tests/fundamental-screener.test.js` | MODIFY | theme 付与と集計 payload を固定する |
| `tests/daily-screener-report.test.js` | MODIFY | theme ranking / theme tag の Markdown 出力を固定する |
| `docs/exec-plans/completed/us-daily-screener-theme-taxonomy-prototype_20260531_2311.md` | MOVE | 完了時に移動 |

## 実装内容

### A. Theme taxonomy 定義を追加

- `config/screener/theme-taxonomy-us.json` に中粒度テーマを定義する
- 初期の中粒度候補:
  - `AI Compute`
  - `Memory`
  - `Optical Connectivity`
  - `Space`
  - `Power & Grid`
  - `Defense Tech`
  - `Semiconductor Equipment`
  - `Industrial Automation`
  - `Cybersecurity`
  - `Cloud Software`
  - `Network Infrastructure`
  - `Consumer Internet`
- 各テーマの下に細粒度タグを持たせる
  - 例: `AI Servers`, `HBM/DRAM`, `Laser Light Source`, `Satellite`, `Launch`, `Grid Equipment`, `MLCC`

### B. 通過銘柄への theme 付与

- Phase2 通過銘柄に対して、以下を使い theme を付与する
  - sector
  - industry
  - symbol allowlist
  - companyName / industry keyword
- 1銘柄に対し
  - `primaryTheme`
  - `subThemes[]`
  - `themeMatchReason`
  を持たせる

### C. Theme ranking をレポート表示

- `Phase2 テーマランキング` を追加
- 表示項目:
  - 中粒度テーマ名
  - 通過銘柄数
  - 平均 3M
  - 平均総合点
  - 主な細粒度タグ
- 既存の上位銘柄表や理由欄にも `theme` を表示する

### D. 実 workflow 検証

- `.github/workflows/daily-screener.yml` を GitHub Actions で 1 回実行
- 生成された `docs/reports/screener/daily-ranking.md` と metadata / artifact を確認
- 表示が不自然なら最小修正して再確認する

## 実装ステップ

- [ ] theme taxonomy 定義ファイルを追加する
- [ ] `src/core/theme-taxonomy.js` を追加する
- [ ] `fundamental-screener` に theme 付与と theme 集計を組み込む
- [ ] `run-fundamental-screening.mjs` に theme ranking / theme tag 表示を追加する
- [ ] `tests/fundamental-screener.test.js` を更新する
- [ ] `tests/daily-screener-report.test.js` を更新する
- [ ] 対象テストを実行する
- [ ] `daily-screener` workflow を 1 回実行して生成レポートを確認する
- [ ] 必要な微調整後、計画を completed へ移動する

## テスト戦略

- RED:
  - theme 付与が存在しないこと
  - Markdown に theme ranking が出ないこと
- GREEN:
  - 最小実装で payload と Markdown を拡張し、既存 sector 表示を壊さず通す
- REFACTOR:
  - theme 判定ルールは `theme-taxonomy.js` に閉じ込め、`fundamental-screener.js` へ分散させない

## 検証コマンド

```bash
npm test -- --test-name-pattern="runFundamentalScreener|daily screener"
node scripts/screener/run-fundamental-screening.mjs
gh workflow run daily-screener.yml
gh run list --workflow daily-screener.yml --limit 1
gh run view <run-id> --log
```

## 影響範囲

- 影響あり
  - US 日次スクリーナーの Markdown 出力
  - `runFundamentalScreener()` の返却 payload
  - GitHub Actions `daily-screener` の生成成果物
- 影響なし
  - JP 日次スクリーナー
  - バックテスト系
  - ポートフォリオヘルスチェック

## リスク

1. theme 判定がルールベースのため、一部銘柄は誤分類または未分類になりうる
2. 細粒度テーマを増やしすぎると report が読みにくくなる
3. workflow 実行結果は当日の market データに依存し、テーマ表が空になる可能性がある
4. GitHub Actions の self-hosted Windows runner 状態次第で workflow 実行確認に時間がかかる可能性がある

## スコープ外

- JP market への theme taxonomy 展開
- moomoo plate breadth の本統合
- custom taxonomy を Phase1 selection の primary criterion に変えること
- テーマ定義の完全自動生成

## 競合確認

- `docs/exec-plans/active/` は確認時点で空であり、競合する active plan は見当たらない
