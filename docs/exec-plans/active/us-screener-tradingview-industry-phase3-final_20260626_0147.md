# US Screener TradingView Industry Phase3 / Final Plan

作成日時: 2026-06-26 01:47 JST

## 目的

米国株スクリーナーのPhase1〜Phase3をTradingView分類で統一する。
Phase2通過後の銘柄をTradingView scanner APIの`industry`で集計し、
上位industryと、その上位industryに属する個別銘柄を既存`rankScore`で表示する。

## 成功基準

- Phase1のTradingView sectorランキングとPhase2の既存フィルター・スコア計算を変更しない。
- Phase2通過かつ`rankScore`算出済みの米国株を`sector + industry`単位で集計できる。
- Phase3に上位20 industryを平均`rankScore`降順で表示できる。
- 平均`rankScore`同点時は平均3M、通過銘柄数、sector、industryの順で安定して順位を決める。
- FinalにPhase3上位5 industry所属のPhase2通過銘柄を全件、既存`rankScore`降順で表示できる。
- 米国株のPhase3 / Finalメイン列からrepo独自の中テーマ・小テーマを外し、sector / industryを表示する。
- repo独自テーマ分類ロジックと日本株の既存テーマ階層表示は維持する。
- 対象テストと全unit testが成功する。

## 前提・判断

- 対象は米国株レポートのみとし、日本株レポートのPhase2〜Phase4構成は変更しない。
- Phase3のgroup keyはsectorを跨いだ同名industryの混同を避けるため`sector + industry`とする。
- `industry`欠損銘柄はTradingView industryランキングとFinal選抜から除外し、欠損件数を結果メタ情報に残す。
- 「近い場合」の恣意的な閾値は導入せず、平均`rankScore`の丸め前比較を優先し、同値時だけ平均3M・件数で決定する。
- Phase3の「上位銘柄」は各industry内の`rankScore`上位3ティッカーとする。
- custom themeは既存result rowの補助属性として残すが、今回新しい補助列・別セクションは追加しない。

## 変更ファイル

| File | Action | 内容 |
|---|---|---|
| `src/core/fundamental-screener.js` | MODIFY | industry集計、上位20選抜、上位5 industryからのFinal銘柄選抜、結果メタ情報を追加する |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | 米国レポートをPhase3 industryランキングとFinal個別銘柄ランキングへ組み替える |
| `tests/fundamental-screener.test.js` | MODIFY | industry集計・安定ソート・上位5 industry選抜・既存rankScore順を回帰テストする |
| `tests/daily-screener-report.test.js` | MODIFY | Phase3 / Finalの見出し、列、件数、custom theme非表示を検証する |
| `tests/line-screener-notify.test.js` | MODIFY | 新しいFinal表でもTop3銘柄抽出が維持されるfixtureへ更新する |
| `docs/reports/screener/daily-ranking.md` | MODIFY（検証時） | 実データ取得が成功した場合、新構成で米国日次レポートを再生成する |
| `docs/exec-plans/active/us-screener-tradingview-industry-phase3-final_20260626_0147.md` | MOVE | 完了時に`docs/exec-plans/completed/`へ移動する |

## 影響範囲

- `runFundamentalScreener()`の米国向け戻り値にindustryランキングとFinalランキングが追加される。
- 米国`daily-ranking.md`のPhase2 custom middle theme、Phase3 custom small theme、Phase4表が、
  Phase3 TradingView industry、Final stock rankingへ置き換わる。
- `rankScore`、rank block、指標補完、Phase1 sector選定、Phase2 hard/client filterは変更しない。
- custom taxonomy設定・分類関数・日本株レポートは変更しない。

## 実装ステップ

- [ ] 1. RED: coreテストにPhase3 industry集計とFinal選抜の期待値を追加する
  - 確認: 現行実装では新しい結果フィールドがなく失敗する。
- [ ] 2. GREEN: 米国向けindustry集計とFinal選抜を最小実装する
  - 確認: 平均12M / 6M / 3M / rankScore / 52w / RSI、件数、上位3 symbolsが正しい。
  - 確認: Phase3は20件まで、Finalは上位5 industry所属全件、rankScore降順になる。
- [ ] 3. RED/GREEN: MarkdownレポートをPhase3 / Final構成へ変更する
  - 確認: sector / industry列が前面に出て、中テーマ / 小テーマ列が米国メイン表に出ない。
  - 確認: 日本株の既存テーマ階層テストは維持される。
- [ ] 4. LINE通知fixtureを新しいFinal表へ更新する
  - 確認: Top3 symbol抽出が列位置変更後も成功する。
- [ ] 5. 対象テストと全unit testを実行する
  - `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js tests/line-screener-notify.test.js`
  - `npm run test:unit`
- [ ] 6. 実レポートを再生成して目視レビューする
  - `node scripts/screener/run-fundamental-screening.mjs`
  - 確認: Phase1、Phase3上位20、Final上位5 industry所属銘柄が意図どおり表示される。
- [ ] 7. REVIEW: diffとテスト結果を確認する
  - ロジック破綻、過剰な抽象化、依頼外変更、スコア/フィルター変更がないことを確認する。
- [ ] 8. 計画をcompletedへ移動し、Conventional Commitでmainへコミット・SSH pushする

## リスクと対策

- 同名industryが複数sectorに存在する可能性:
  - `sector + industry`で別groupとして扱う。
- 欠損値で平均が歪む可能性:
  - 各指標は値が存在する銘柄だけを分母にする。
- `result.results`の表示上限でFinal対象が欠落する可能性:
  - Finalは`matched`ではなく、Phase2通過後の全`ranked`から構築する。
- 既存LINE通知が列位置に依存している可能性:
  - Final表の列順を維持しつつ専用fixtureで抽出結果を検証する。
- 実データ再生成が外部API要因で失敗する可能性:
  - core/reportテストを必須検証とし、外部要因は実装不具合と分離して報告する。

## 対象外

- rankScore、ranking block、指標計算、フィルター閾値の変更。
- TradingView sector / industry名称の独自正規化。
- custom theme taxonomy設定の削除・再設計。
- custom themeの新しい補助列・別セクション追加。
- 日本株スクリーナーのPhase構成変更。
