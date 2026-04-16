# Current research handoff

このディレクトリは、**今読むべき handoff と main summary** をまとめる入口です。

## まず押さえること

- `current` は **人間向けの現行入口** を意味します
- handoff と main summary は同じ campaign 世代とは限りません
- main summary は利用可能な最新 artifact から再生成されます

## 読む順番

1. `../../../README.md`
2. この `README.md`
3. `main-backtest-current-summary.md`
4. 現行 handoff / details
5. strongest family の寄与分離を進めるときは `strongest-family-overlay-ablation_20260416_1215.md`
6. `../strategy/README.md`
7. 判断経緯が必要なら `../../../logs/sessions/`

## current handoff generation

- campaign ID: `next-long-run-us-12x10` / `next-long-run-jp-12x10`
- universe ID: `next-long-run-us-12` / `next-long-run-jp-12`
- live 実行セットは `config/backtest/strategy-presets.json`
- overlay ablation の current scaffold: `strongest-family-overlay-ablation_20260416_1215.md`
- 過去世代の文書は `../archive/` を参照します

## 運用ルール

- ここには `manifest.json` に列挙した current 世代の文書だけを置きます
- `scripts/docs/archive-stale-latest.mjs` が keep 対象以外を `../archive/` へ移します
- 数値の根拠は `../../../references/backtests/` と `../../../artifacts/` に置きます
- 戦略・銘柄の人間向け説明は `../strategy/` に置きます
