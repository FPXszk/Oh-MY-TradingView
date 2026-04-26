# Fear & Greed / AAII / NAAIM / S&P500予想PER 組み込み実現性 調査計画

## 問題と方針

ユーザーの狙いは「市場参加者が非常に恐怖に陥っているときに買いを入れて長期保有する」ための外部センチメント / バリュエーション指標を、現在の backtest / research フローへどう組み込めるかを見極めることです。  
今回の作業では、まず **現行 repo が直接扱える market data の範囲**を再確認し、そのうえで **Fear & Greed / AAII / NAAIM / S&P500予想PER** それぞれについて、(1) 取得元候補、(2) 履歴データの入手性、(3) backtest に載せる現実的な導入経路、(4) 代替指標候補、を整理して回答します。

## 対象ファイル

- **作成** `docs/exec-plans/active/ext-fear-sentiment-indicators-feasibility_20260426_2322.md`

## 影響範囲

- 調査結果はチャット回答として返す
- 既存の code / preset / pine / campaign / docs/research は変更しない

## 実装ステップ

- [ ] 現行 repo の `market-intel.js` / `research-backtest.js` / 関連テストを根拠に、今すぐ利用できるデータ種別と不足点を整理する
- [ ] Fear & Greed / AAII / NAAIM / S&P500予想PER について、公開ソース・履歴データ有無・機械取得のしやすさを外部調査する
- [ ] 直接取得が難しいものは、目的に照らして代替可能な proxy 指標（例: VIX, put/call, breadth, drawdown, credit spread proxy など）を候補化する
- [ ] repo に載せるとした場合の導入パターンを、`research-only の外部 series 注入` / `market-intel 現在値取得` / `TradingView/Pine だけで完結する proxy` に分けて評価する
- [ ] 根拠つきで結論をまとめ、優先順位つきの導入案をチャットで返す

## テスト戦略

- 今回は調査と回答のみで、コード変更やテスト追加は行わない
- ただし repo の現状評価は既存コードとテストに一致させる

## バリデーション

- repo 内の根拠をコード / テストから確認する
- 外部ソースは複数の公開情報を突き合わせて、単一ページ依存を避ける

## リスク / 注意点

- CNN Fear & Greed のように Web 表示はあっても、履歴 series の公式公開が弱いものは backtest 用データソースとして不安定
- AAII / NAAIM は週次・アンケート系なので、日次 Pine series と同じ感覚で扱うと過剰精密化しやすい
- S&P500 予想PER は「指数全体の forward P/E 履歴」を安定取得できるかが鍵で、単発の現在値取得とは難易度が違う

## スコープ外

- 実際の API 契約や有料データ契約の締結
- repo への実装
- night batch 実行や preset 追加

## 競合確認

- `docs/exec-plans/active/` には run68 micro sweep 調査計画と repo 構造計画があるが、今回の外部センチメント指標 feasibility 調査とは直接競合しない
