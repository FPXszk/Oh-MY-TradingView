# Session log: repo layout and latest/archive governance

## 実施内容

- `command.md` と `explain-forhuman.md` を `docs/` 配下へ移動
- `docs/design-docs/` と `docs/research/old/` を `docs/research/archive/` に統合
- `results/` を `docs/research/results/` に統合
- `config/backtest/campaigns/` と `config/backtest/universes/` を `latest/` / `archive/` に再編
- `config/backtest/strategy-presets.json` を strongest 15 に圧縮し、残りを `docs/bad-strategy/retired-strategy-presets.json` に退避

## 実装メモ

- JS 側は `src/core/repo-paths.js` で `docs/research/results` と `latest/archive` resolver を共通化
- Python 側は `python/night_batch.py` の default results root を `docs/research/results/night-batch` に更新
- `python/night_batch.py` に deterministic な `main-backtest-latest-summary.md` 自動生成を追加
- `scripts/docs/archive-stale-latest.mjs` を追加し、latest research docs と session log の stale file を archive へ送れるようにした

## 懸念と次アクション

- latest 15 の 15 本目は latest + previous の自然候補だけだと不足するため、strict sibling を deterministic に残した
- 今後は combined ranking artifact を毎回固定で生成し、manual judgment を減らすべき
- `docs/research/results/` は導線改善には効いたが、長期的には容量管理方針が必要
