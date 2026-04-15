# docs/references/pine

このディレクトリは **Pine source snapshot の保管庫** です。  
top 戦略を人手レビューしたり、chart へ適用する前に source を確認するための durable copy を置きます。

## 目的

- 最新 ranking から exported した Pine source を保存する
- `manifest.json` で rank / market / presetId / file の対応を固定する
- 「どの戦略をどういう順で human review したか」を追えるようにする

## 使い方

- ranking artifact で上位戦略を確認する
- 対応する `manifest.json` を開く
- 必要なら各 `.pine` を local chart review に使う

## 補足

- ここは strategy lifecycle の source of truth ではありません
- lifecycle や説明文の正本は `config/backtest/strategy-catalog.json`
- 人間向けの入口は `docs/research/strategy/README.md`
