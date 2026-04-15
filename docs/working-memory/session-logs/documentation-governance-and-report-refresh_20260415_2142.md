# Session log: documentation governance and report refresh

## 実施内容

- `docs/command.md` を削除し、repo の一次入口を `README.md` に統一
- `docs/reports/`, `docs/references/backtests/`, `docs/references/pine/`, `docs/research/strategy/` に役割 README を追加
- latest summary / rich report を人間向けテンプレートへ更新し、全戦略順位と Top 5 の銘柄別成績を出すように変更
- strategy / symbol reference generator を追加し、`docs/research/strategy/` に最新の人間向け参照を生成

## 実装メモ

- `src/core/campaign-report.js` で symbol-level 集計を保持し、combined ranking を preset 単位で再構成
- `scripts/backtest/generate-rich-report.mjs` と `python/night_batch.py` で最新 summary の章立てを統一
- `scripts/backtest/generate-strategy-reference.mjs` で latest config と score artifact の出典を明示
- README / `docs/DOCUMENTATION_SYSTEM.md` / `docs/explain-forhuman.md` / `docs/research/latest/README.md` の導線を見直し、handoff latest と main summary latest を分離して説明

## 懸念と次アクション

- 現在の `main-backtest-latest-summary.md` と strategy reference の score は、利用可能な `next-long-run-*-finetune-100x10` smoke artifact を基に生成している
- そのため 12x10 handoff 世代の docs と、summary の score source は完全一致していない
- 将来 full artifact が揃ったら、strategy reference と latest summary をその世代に合わせて再生成したい
