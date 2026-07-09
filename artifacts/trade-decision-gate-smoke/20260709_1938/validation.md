# trade-decision-gate NVDA smoke validation

## 実行日時

- 2026-07-09 19:53 JST

## 使用した CLI コマンド

```powershell
codex --help
codex exec --help
```

独立 CLI 起動は `アクセスが拒否されました` で失敗。新しい Codex CLI プロセスによる自動 skill 選択は未検証。

同一セッションでは、`prompt.txt` と同じ自然言語 prompt を使い、`docs/strategy/Trade-rule.md` と `.agents/skills/trade-decision-gate/SKILL.md` の契約に沿って smoke 判定を作成した。

## exit code

- 独立 Codex CLI: 起動不可。PowerShell 側で `ResourceUnavailable`。
- 同一セッション smoke: 0 相当。

## 実行前後の git status

実行前:

```text
## main...origin/main
 M .agents/skills/trade-decision-gate/SKILL.md
 M tests/skills-contract.test.js
?? artifacts/trade-decision-gate-smoke/
```

実行後:

```text
## main...origin/main
 M .agents/skills/trade-decision-gate/SKILL.md
 M tests/skills-contract.test.js
?? artifacts/trade-decision-gate-smoke/
```

## 新しい独立セッションで実行できたか

いいえ。`codex.exe` が WindowsApps 配下で access denied となり、`codex --help` も `codex exec --help` も実行できなかった。

## 最新データの取得成否

- 最新価格: 成功。Yahoo chart endpoint で 2026-07-08 終値 204.12、日中高値 205.16、安値 195.06、出来高 146,904,500 を取得。
- 会社発表: 成功。NVIDIA 公式 IR の Q1 FY2027 press release を確認。
- SEC: 成功。2026-04-26 期 Form 10-Q を確認。
- 最新ニュース: 成功。DeepSeek 独自 chip 報道、BofA / Goldman 強気見解、半導体株反発、マクロ不安を確認。
- 次回決算日: 部分成功。Wall Street Horizon で 2026-08-26 after market を確認。NVIDIA IR events page では次回決算日は未確認。
- 最新米国 screener run: 部分成功。GitHub Actions 最新成功 run 28180455577 は確認。ただし 2026-06-25 の run で、repo report body は 2026/07/02 表示、metadata と report body が不一致。
- 市場レジーム: 成功。SPY / QQQ / SMH 日足から NEUTRAL と判定。
- セクター・リーダー判定: 成功。Semiconductors は repo report Phase2 6位、主要 leader は強弱混在。
- チャート・ピボット判定: 部分成功。OHLCV から暫定 pivot 213.99、20 日安値 189.80 を算出。TradingView 目視確認は未実施。

## 最終判定

- STAY

## データ完全性

- PARTIAL

理由:

- Moomoo MCP quote / TA / K-line は Python runtime 未検出で失敗。
- TradingView Desktop / CDP は非 CDP データで足りる範囲だったため起動しなかった。
- 独立 Codex CLI smoke は access denied で未実行。
- 口座残高、自己資金、既存建玉は未提示。
- 最新 screener の鮮度は完全には確定できない。

## 出力形式の合否

- 合格。`# 判定: STAY` が先頭。
- `判断モード: NEW_ENTRY`、`対象市場: US`、`対象銘柄: NVDA` を含む。
- 8 セクションを含む。
- 未確認情報を `未確認` として扱った。

## read-only の合否

- 合格。注文発注、注文変更、注文取消、アラート作成、取引ロック解除、Moomoo 取引操作、証券口座書き込みは行っていない。

## 不足情報

- 独立 Codex CLI の自動 skill 選択。
- Moomoo quote / TA / K-line。
- TradingView 目視 pivot。
- 口座残高、自己資金、既存建玉、同一テーマ保有。
- NVIDIA IR 公式 events page 上の次回決算日。
- 判断時点での最新 screener 正常完了結果。

## 残った問題

- WindowsApps 配下の `codex.exe` がこの PowerShell から起動できず、独立 CLI smoke は未検証。
- `artifacts/` はこの repository で gitignore 対象ではないため、成果物を最終 commit に含める必要がある。
