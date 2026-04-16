# Backtest references

このディレクトリは **main backtest の数値根拠** を置く場所です。  
`docs/` の narrative を支える JSON / ranking artifact はここを正本にします。

## 何を置くか

- combined ranking artifact
- recovered result から導いた summary JSON
- generator が再利用する deterministic な backtest 参照物

## どう読むか

1. 結論は `docs/research/current/main-backtest-current-summary.md`
2. 戦略・銘柄の説明は `docs/research/strategy/README.md`
3. 数値の根拠確認が必要なときだけここを見る
