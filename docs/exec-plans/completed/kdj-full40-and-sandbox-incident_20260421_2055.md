# public full40 比較と sandbox incident 記録計画

## 変更・作成対象ファイル

- 作成: `docs/reports/public-top10-us40-full40-comparison.md`
- 作成: `docs/reports/public-top10-us40-tail35-sandbox-incident_20260421.md`
- 更新: `docs/reports/public-top10-us-40x10-final-400run.md`
- 移動: `docs/exec-plans/active/kdj-full40-and-sandbox-incident_20260421_2055.md` → `docs/exec-plans/completed/`

## 実装内容と影響範囲

- public 10戦略全体について、**smoke ではなく full 40銘柄結果ベース**で execution 実績を整理する
- `tv-public-kdj-l2` を含む public 完走 9戦略の中で、どれが strongest / finetune 系に追随しそうかを比較できる形で整理する
- full 40銘柄の execution 実績と、参照可能な performance 根拠を分けて明記する
- 今回の「sandbox 内実行で TradingView CDP に到達できず、実機 backtest できていないのに途中で誤認した」ミスを incident / postmortem として `docs/reports/` に恒久保存する
- `public-top10-us-40x10-final-400run.md` から incident と比較レポートへリンクを張る

## テスト・検証方針

- RED/GREEN/REFACTOR のコード変更はなし。docs 作業のみ
- 検証は以下で行う
  - `sed` / `rg` で引用元ログと report 本文の整合を確認
  - `git diff --cached --stat` で docs だけが staged されていることを確認

## リスク

- full 40銘柄の performance 数値は artifact に残っていないため、execution 完走実績と smoke ベース比較を混同しないよう明記が必要
- public 9戦略は full 40銘柄で全て完走しているため、execution 成功率だけでは強弱が付かない。比較軸の限界を明示する必要がある
- incident 記録は run-specific 事実と再発防止策を分けて書かないと、単なる愚痴ログになる

## 実装ステップ

- [ ] public 10戦略それぞれの full 40銘柄 execution 実績を log から整理する
- [ ] strongest 系との比較で、何が言えて何が言えないかを分けた full40 比較レポートを作る
- [ ] public 完走 9戦略の中で、現時点で追随候補として扱うべき戦略を明示する
- [ ] sandbox 外実行ミスの incident / postmortem を `docs/reports/` に作成する
- [ ] `public-top10-us-40x10-final-400run.md` に incident / 比較レポートのリンクを追加する
- [ ] 内容をレビューし、計画を `completed/` へ移動する
- [ ] docs のみをコミットして `main` に push する
