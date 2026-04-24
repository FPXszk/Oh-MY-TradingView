# tradingview-external-research-and-doc-governance

## 実施内容

- 指定された 5 つの外部 TradingView 関連 repo を調査した
- `github.com/tradingview` が official かを確認し、public repo 全体をカテゴリ分けした
- ローカル repo の CDP / backtest / Pine / MCP surface を再確認し、外部 repo から持ち込めるものと持ち込みにくいものを切り分けた
- 参照資料台帳 `docs/references/design-ref-llms.md` を整備し、今回参照した資料を記録した
- `README.md` と `docs/DOCUMENTATION_SYSTEM.md` に「参照した資料は design-ref-llms に記録する」ルールを追記した
- 調査本体を `docs/research/tradingview-external-landscape-and-applicability_20260408_1105.md` に保存した

## 主な結論

### 外部 5 repo

- `Mathieu2301/TradingView-API`
  - 非公式 TradingView protocol / WebSocket 方向の Node ライブラリ
  - CDP 非依存研究の比較対象としては有益
  - 本線採用は高リスク
- `atilaahmettaner/tradingview-mcp`
  - `tradingview-ta` / `tradingview-screener` / Yahoo / news / sentiment をまとめた MCP
  - Desktop automation ではなく non-CDP market intelligence 層の参考になる
- `tradesdontlie/tradingview-mcp`
  - 現行 repo と同じ Desktop + CDP 系だが tool surface がかなり広い
  - launch / stream / screenshot / pane/tab / alerts / watchlist / replay が特に参考になった
- `fabston/TradingView-Webhook-Bot`
  - alert webhook を受ける inbound service の参考になる
  - local-only 前提とは別プロセスで扱うべき
- `pAulseperformance/awesome-pinescript`
  - Pine preset 拡張候補と継続調査の入口として有益

### official `tradingview` org

- official と判断してよい
- public repo は大きく以下に分かれる
  - charting / developer-facing repos
  - docs / writing / integration guidance
  - build / rendering / front-end infra
  - internal / maintenance / data 寄り
- 本 repo に直接使いやすいのは `lightweight-charts`, `charting-library-examples`, `charting-library-tutorial`, `awesome-tradingview`, `documentation-guidelines`
- official 側からは **TradingView Desktop automation や Strategy Tester API の public repo は確認できなかった**

### 本 repo への推奨適用

優先度高:

1. CLI にある preset backtest を MCP tool として公開する
2. non-CDP の market / fundamentals / news / screener layer を追加する
3. CDP 操作面を `tradesdontlie/tradingview-mcp` 型に広げる
4. `awesome-pinescript` を使って preset catalog を増やす

優先度中:

1. `lightweight-charts` を使った backtest artifact viewer
2. opt-in webhook receiver

高リスク:

1. 非公式 TradingView protocol 直叩き

## 更新したファイル

- `docs/research/tradingview-external-landscape-and-applicability_20260408_1105.md`
- `docs/references/design-ref-llms.md`
- `docs/DOCUMENTATION_SYSTEM.md`
- `README.md`
- `docs/working-memory/session-logs/tradingview-external-research-and-doc-governance_20260408_1115.md`

## 検証

- `npm test`
- `npm run test:e2e`
- `npm run test:all`
- `git --no-pager diff --check`

すべて通過した。

## 補足

- 現行 repo は Desktop + CDP に強く、non-CDP intelligence layer が薄い
- 今回の調査結果は「CDP 本線を維持しつつ、外側に non-CDP layer を足す」二層化の方向を後押しするものだった
