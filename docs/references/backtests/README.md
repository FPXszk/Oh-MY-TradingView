# docs/references/backtests

このディレクトリは **raw backtest artifact の保管庫** です。  
人間向けの説明文ではなく、`summary.json` や ranking の**数値の正本**を置きます。

## 目的

- latest summary や rich report の元になる JSON を残す
- run ごとの差分を deterministic に比較できるようにする
- 手計算や手転記ではなく、artifact から再生成できる状態を維持する

## 使い方

- 人間向けの入口は `README.md` と `docs/research/latest/`
- テーマ投資の判断基準は `docs/research/strategy/theme-momentum-definition.md`
- 戦略・銘柄の人間向け説明は `docs/research/strategy/README.md`
- 数値の根拠を確認したいときはここを見る
- generator はこのディレクトリか `docs/research/results/` の raw JSON を読む

## 置くもの

- `*.json`
- `*.summary.json`
- combined ranking artifact

## 置かないもの

- narrative な説明文
- テーマ投資の判断基準のような手書きガイド
- 実行手順の正本
- Pine source
