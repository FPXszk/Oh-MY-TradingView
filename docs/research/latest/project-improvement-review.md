# Project improvement review

## 1. latest/archive promotion を manifest 化する

今は `latest` に残す doc や config を人間が判断している。`docs/research/latest/manifest.json` のような keep-list を置き、`scripts/docs/archive-stale-latest.mjs` がそれを読む形にすると、generation 更新時の事故を減らせる。

## 2. backtest ranking を毎回 artifact 化する

今回 strongest 15 を決める時、latest + previous だけでは自然候補が 14 本で止まった。`recovered-results.json` から **combined ranking JSON** を毎回生成し、`docs/references/backtests/` に残すようにすると、次回の keep-set 更新が deterministic になる。

## 3. smoke-prod 完了後の summary を richer にする

`python/night_batch.py` で latest summary 自動生成は入れたが、まだ rich report 本体と ranking artifact は任意。workflow 完了後に `report` まで確実に実行し、`main-backtest-latest-summary.md` と ranking JSON を同時更新する導線にすると handoff が強くなる。

## 4. strategy live set と retired set の差分を見える化する

`config/backtest/strategy-presets.json` は live 15 本だけにしたが、今は `retired-strategy-presets.json` が単純な退避先。次は

- retire reason
- last strong generation
- replacement family

を各 strategy に持たせると、なぜ外れたかを次回すぐ説明できる。

## 5. campaign / universe の latest pointer を machine-check する

`latest/` 配下に何を残すかは今後も重要になる。テストに

- `latest` が想定 campaign / universe だけを指す
- live preset が campaign 参照集合を必ず包含する
- archive に moved file が重複しない

を追加すると、構成崩れを早く検出できる。

## 6. results の肥大化対策を決める

`docs/research/results/` に統合したことで導線は改善したが、将来的には repo サイズが増える。長期的には

1. committed sample only を残す
2. full artifact は GitHub Actions artifact / release / external storage
3. `docs/references/` には summary と ranking だけを固定

の3層に分けると運用しやすい。

## 7. live checkout 保護を workflow 側でも強める

運用 docs では live checkout 変更禁止を明記している。さらに workflow 側でも

- running 中の protected file hash 記録
- production 完了前の config 差分検知
- strategy-presets / campaign latest の変更警告

を追加すると、夜間実行中の意図しない差し替えを減らせる。
