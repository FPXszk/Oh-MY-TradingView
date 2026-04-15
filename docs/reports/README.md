# docs/reports

このディレクトリは **incident / postmortem / run-specific archive** です。  
日常の使い方や実行コマンドの正本は repo root の `../../README.md` に置き、ここを primary runbook にはしません。

## 何を置く場所か

- workflow failure の調査メモ
- 特定 run の結果レポート
- README 本文へ吸収したあとも、履歴として残したい archive

## 何を置かないか

- 通常運用の how-to
- コマンド一覧の正本
- 貼りっぱなしの transcript dump

## 現在の主なファイル

| file | role | status |
| --- | --- | --- |
| `night-batch-self-hosted-run8.md` | workflow は失敗だが artifact 上は成功だった incident の postmortem | historical incident archive |
| `night-batch-self-hosted-run15.md` | run 15 の成功結果メモ | historical run archive |

## 読み方

1. まず `../../README.md` と `../research/latest/` を読む
2. 個別事故の判断経緯が必要なときだけここへ戻る
3. README に必要な教訓を吸収できたら、ここは archive のまま残す
